import { Types } from 'mongoose';
import { Exercise } from '../entities/Exercise';
import { 
  IExerciseRepository,
  IExerciseCreationData,
  IExerciseUpdateData,
  IExerciseSearchCriteria,
  IExerciseQueryOptions,
  IExerciseStatistics 
} from '../interfaces/ExerciseInterfaces';
import { 
  ExerciseType, 
  Difficulty, 
  MuscleZone, 
  EquipmentCategory 
} from '../../../types/fitness/enums/exercise';
import { ValidationError } from '../../../infrastructure/errors/types/ValidationError';
import { ExerciseDefaults } from '../config/ExerciseDefaults';
import { SafetyGuidelines } from '../config/SafetyGuidelines';

/**
 * Service for managing exercise operations
 */
export class ExerciseService {
  constructor(
    private readonly exerciseRepository: IExerciseRepository
  ) {}

  /**
   * Create a new exercise
   */
  async createExercise(data: IExerciseCreationData, createdBy: Types.ObjectId): Promise<Exercise> {
    // Validate exercise data
    await this.validateExerciseCreationData(data);

    // Check name availability
    const isNameAvailable = await this.exerciseRepository.isNameAvailable(data.name);
    if (!isNameAvailable) {
      throw new ValidationError(
        'name',
        data.name,
        'unique',
        'Exercise name is already taken'
      );
    }

    const now = new Date();
    const exerciseId = new Types.ObjectId();
    const defaults = ExerciseDefaults.getCreationDefaults();

    const exercise = new Exercise({
      id: exerciseId,
      name: data.name.trim(),
      description: data.description.trim(),
      type: data.type,
      difficulty: data.difficulty,
      primaryMuscles: data.primaryMuscles,
      secondaryMuscles: data.secondaryMuscles ?? [],
      equipment: data.equipment ?? defaults.equipment,
      tags: data.tags ?? defaults.tags,
      estimatedDuration: data.estimatedDuration ?? defaults.estimatedDuration,
      caloriesBurnedPerMinute: data.caloriesBurnedPerMinute ?? defaults.caloriesBurnedPerMinute,
      minimumAge: data.minimumAge ?? defaults.minimumAge,
      maximumAge: data.maximumAge,
      prerequisites: data.prerequisites ?? [],
      createdAt: now,
      updatedAt: now,
      createdBy,
      isActive: defaults.isActive,
      isDraft: data.isDraft ?? defaults.isDraft
    });

    return await this.exerciseRepository.create(exercise);
  }

  /**
   * Get exercise by ID
   */
  async getExerciseById(id: Types.ObjectId, options?: IExerciseQueryOptions): Promise<Exercise | null> {
    return await this.exerciseRepository.findById(id, options);
  }

  /**
   * Update exercise information
   */
  async updateExercise(
    id: Types.ObjectId, 
    updates: IExerciseUpdateData
  ): Promise<Exercise | null> {
    // Validate name if being updated
    if (updates.name) {
      const trimmedName = updates.name.trim();
      const isNameAvailable = await this.exerciseRepository.isNameAvailable(trimmedName, id);
      if (!isNameAvailable) {
        throw new ValidationError(
          'name',
          trimmedName,
          'unique',
          'Exercise name is already taken'
        );
      }
      updates.name = trimmedName;
    }

    // Validate other fields
    this.validateExerciseUpdateData(updates);

    return await this.exerciseRepository.update(id, updates);
  }

  /**
   * Publish draft exercise
   */
  async publishExercise(id: Types.ObjectId): Promise<Exercise | null> {
    const exercise = await this.exerciseRepository.findById(id);
    if (!exercise) {
      throw new ValidationError(
        'exercise',
        id,
        'not_found',
        'Exercise not found'
      );
    }

    if (!exercise.isDraft) {
      throw new ValidationError(
        'exercise',
        id,
        'already_published',
        'Exercise is already published'
      );
    }

    if (!exercise.canBePublished()) {
      const validation = exercise.validateForPublication();
      throw new ValidationError(
        'exercise',
        id,
        'validation_failed',
        `Exercise cannot be published: ${validation.errors.map(e => e.message).join(', ')}`
      );
    }

    const publishedExercise = exercise.publish();
    return await this.exerciseRepository.update(id, publishedExercise);
  }

  /**
   * Archive exercise (soft delete)
   */
  async archiveExercise(id: Types.ObjectId): Promise<boolean> {
    const exercise = await this.exerciseRepository.findById(id);
    if (!exercise) {
      return false;
    }

    // Check if exercise can be archived (no active references)
    const canArchive = await this.canExerciseBeArchived(id);
    if (!canArchive) {
      throw new ValidationError(
        'exercise',
        id,
        'archive_validation',
        'Cannot archive exercise that is actively used in workouts or programs'
      );
    }

    return await this.exerciseRepository.archive(id);
  }

  /**
   * Search exercises with criteria
   */
  async searchExercises(
    criteria: IExerciseSearchCriteria, 
    options?: IExerciseQueryOptions
  ): Promise<readonly Exercise[]> {
    return await this.exerciseRepository.findByCriteria(criteria, options);
  }

  /**
   * Get exercises by type
   */
  async getExercisesByType(
    type: ExerciseType, 
    options?: IExerciseQueryOptions
  ): Promise<readonly Exercise[]> {
    return await this.exerciseRepository.findByType(type, options);
  }

  /**
   * Get exercises by difficulty
   */
  async getExercisesByDifficulty(
    difficulty: Difficulty, 
    options?: IExerciseQueryOptions
  ): Promise<readonly Exercise[]> {
    return await this.exerciseRepository.findByDifficulty(difficulty, options);
  }

  /**
   * Get exercises by muscle group
   */
  async getExercisesByMuscleGroup(
    muscle: MuscleZone, 
    options?: IExerciseQueryOptions
  ): Promise<readonly Exercise[]> {
    return await this.exerciseRepository.findByMuscleGroup(muscle, options);
  }

  /**
   * Get exercises suitable for user age and conditions
   */
  async getExercisesForUser(
    age: number,
    medicalConditions: readonly string[] = [],
    excludeEquipment: readonly EquipmentCategory[] = [],
    options?: IExerciseQueryOptions
  ): Promise<readonly Exercise[]> {
    // Get age-appropriate exercises
    let exercises = await this.exerciseRepository.findByAge(age, options);

    // Filter out exercises with contraindications for user's conditions
    if (medicalConditions.length > 0) {
      exercises = await this.exerciseRepository.findSafeForConditions(medicalConditions, options);
    }

    // Filter out exercises requiring excluded equipment
    if (excludeEquipment.length > 0) {
      exercises = exercises.filter(exercise => 
        !excludeEquipment.some(equipment => exercise.requiresEquipment(equipment))
      );
    }

    return exercises;
  }

  /**
   * Get popular exercises
   */
  async getPopularExercises(
    limit = 10, 
    timeframe: 'week' | 'month' | 'year' = 'month'
  ): Promise<readonly Exercise[]> {
    return await this.exerciseRepository.findPopular(limit, timeframe);
  }

  /**
   * Get recent exercises
   */
  async getRecentExercises(limit = 10, daysBack = 30): Promise<readonly Exercise[]> {
    return await this.exerciseRepository.findRecent(limit, daysBack);
  }

  /**
   * Get similar exercises
   */
  async getSimilarExercises(exerciseId: Types.ObjectId, limit = 5): Promise<readonly Exercise[]> {
    return await this.exerciseRepository.findSimilar(exerciseId, limit);
  }

  /**
   * Get exercise statistics
   */
  async getExerciseStatistics(): Promise<IExerciseStatistics> {
    return await this.exerciseRepository.getStatistics();
  }

  /**
   * Clone exercise
   */
  async cloneExercise(
    exerciseId: Types.ObjectId, 
    createdBy: Types.ObjectId,
    modifications: Partial<IExerciseCreationData> = {}
  ): Promise<Exercise> {
    const originalExercise = await this.exerciseRepository.findById(exerciseId);
    if (!originalExercise) {
      throw new ValidationError(
        'exercise',
        exerciseId,
        'not_found',
        'Original exercise not found'
      );
    }

    const clonedExercise = originalExercise.cloneWithModifications({
      ...modifications,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Ensure unique name if not modified
    if (!modifications.name) {
      let cloneName = `${originalExercise.name} (Copy)`;
      let counter = 1;
      
      while (!(await this.exerciseRepository.isNameAvailable(cloneName))) {
        counter++;
        cloneName = `${originalExercise.name} (Copy ${counter})`;
      }
      
      clonedExercise.name = cloneName;
    }

    return await this.exerciseRepository.create(clonedExercise);
  }

  /**
   * Validate exercise safety for user
   */
  async validateExerciseSafety(
    exerciseId: Types.ObjectId,
    userAge?: number,
    medicalConditions?: readonly string[]
  ): Promise<{
    isSafe: boolean;
    warnings: readonly string[];
    contraindications: readonly string[];
    requiresMedicalClearance: boolean;
  }> {
    const exercise = await this.exerciseRepository.findById(exerciseId);
    if (!exercise) {
      throw new ValidationError(
        'exercise',
        exerciseId,
        'not_found',
        'Exercise not found'
      );
    }

    return SafetyGuidelines.validateExerciseSafety(
      exercise.type,
      exercise.difficulty,
      exercise.primaryMuscles,
      userAge,
      medicalConditions
    );
  }

  /**
   * Get exercises needing review
   */
  async getExercisesNeedingReview(options?: IExerciseQueryOptions): Promise<readonly Exercise[]> {
    return await this.exerciseRepository.findNeedingReview(options);
  }

  /**
   * Bulk operations
   */
  async bulkCreateExercises(
    exercisesData: readonly IExerciseCreationData[],
    createdBy: Types.ObjectId
  ): Promise<readonly Exercise[]> {
    const exercises: Exercise[] = [];
    const now = new Date();
    const defaults = ExerciseDefaults.getCreationDefaults();

    for (const data of exercisesData) {
      await this.validateExerciseCreationData(data);
      
      const exercise = new Exercise({
        id: new Types.ObjectId(),
        name: data.name.trim(),
        description: data.description.trim(),
        type: data.type,
        difficulty: data.difficulty,
        primaryMuscles: data.primaryMuscles,
        secondaryMuscles: data.secondaryMuscles ?? [],
        equipment: data.equipment ?? defaults.equipment,
        tags: data.tags ?? defaults.tags,
        estimatedDuration: data.estimatedDuration ?? defaults.estimatedDuration,
        caloriesBurnedPerMinute: data.caloriesBurnedPerMinute ?? defaults.caloriesBurnedPerMinute,
        minimumAge: data.minimumAge ?? defaults.minimumAge,
        maximumAge: data.maximumAge,
        prerequisites: data.prerequisites ?? [],
        createdAt: now,
        updatedAt: now,
        createdBy,
        isActive: defaults.isActive,
        isDraft: data.isDraft ?? defaults.isDraft
      });

      exercises.push(exercise);
    }

    return await this.exerciseRepository.bulkCreate(exercises);
  }

  /**
   * Private validation methods
   */
  private async validateExerciseCreationData(data: IExerciseCreationData): Promise<void> {
    const rules = ExerciseDefaults.getValidationRules();

    if (!data.name || data.name.trim().length < rules.nameMinLength) {
      throw new ValidationError(
        'name',
        data.name,
        'min_length',
        `Exercise name must be at least ${rules.nameMinLength} characters`
      );
    }

    if (data.name.trim().length > rules.nameMaxLength) {
      throw new ValidationError(
        'name',
        data.name,
        'max_length',
        `Exercise name must be less than ${rules.nameMaxLength} characters`
      );
    }

    if (!data.description || data.description.trim().length < rules.descriptionMinLength) {
      throw new ValidationError(
        'description',
        data.description,
        'min_length',
        `Exercise description must be at least ${rules.descriptionMinLength} characters`
      );
    }

    if (data.description.trim().length > rules.descriptionMaxLength) {
      throw new ValidationError(
        'description',
        data.description,
        'max_length',
        `Exercise description must be less than ${rules.descriptionMaxLength} characters`
      );
    }

    if (!data.primaryMuscles || data.primaryMuscles.length === 0) {
      throw new ValidationError(
        'primaryMuscles',
        data.primaryMuscles,
        'required',
        'At least one primary muscle group is required'
      );
    }

    if (data.primaryMuscles.length > rules.maxPrimaryMuscles) {
      throw new ValidationError(
        'primaryMuscles',
        data.primaryMuscles,
        'max_length',
        `Cannot have more than ${rules.maxPrimaryMuscles} primary muscle groups`
      );
    }

    if (data.secondaryMuscles && data.secondaryMuscles.length > rules.maxSecondaryMuscles) {
      throw new ValidationError(
        'secondaryMuscles',
        data.secondaryMuscles,
        'max_length',
        `Cannot have more than ${rules.maxSecondaryMuscles} secondary muscle groups`
      );
    }

    // Validate age constraints
    const limits = ExerciseDefaults.getSystemLimits();
    if (data.minimumAge && (data.minimumAge < limits.minAge || data.minimumAge > limits.maxAge)) {
      throw new ValidationError(
        'minimumAge',
        data.minimumAge,
        'range',
        `Minimum age must be between ${limits.minAge} and ${limits.maxAge}`
      );
    }

    if (data.maximumAge && (data.maximumAge < limits.minAge || data.maximumAge > limits.maxAge)) {
      throw new ValidationError(
        'maximumAge',
        data.maximumAge,
        'range',
        `Maximum age must be between ${limits.minAge} and ${limits.maxAge}`
      );
    }

    if (data.minimumAge && data.maximumAge && data.minimumAge >= data.maximumAge) {
      throw new ValidationError(
        'maximumAge',
        data.maximumAge,
        'logical',
        'Maximum age must be greater than minimum age'
      );
    }

    // Validate duration and calories
    if (data.estimatedDuration && (data.estimatedDuration < limits.minDuration || data.estimatedDuration > limits.maxDuration)) {
      throw new ValidationError(
        'estimatedDuration',
        data.estimatedDuration,
        'range',
        `Estimated duration must be between ${limits.minDuration} and ${limits.maxDuration} minutes`
      );
    }

    if (data.caloriesBurnedPerMinute && (data.caloriesBurnedPerMinute < limits.minCaloriesBurnRate || data.caloriesBurnedPerMinute > limits.maxCaloriesBurnRate)) {
      throw new ValidationError(
        'caloriesBurnedPerMinute',
        data.caloriesBurnedPerMinute,
        'range',
        `Calories burned per minute must be between ${limits.minCaloriesBurnRate} and ${limits.maxCaloriesBurnRate}`
      );
    }
  }

  private validateExerciseUpdateData(data: IExerciseUpdateData): void {
    const rules = ExerciseDefaults.getValidationRules();

    if (data.name !== undefined) {
      if (data.name.trim().length < rules.nameMinLength || data.name.trim().length > rules.nameMaxLength) {
        throw new ValidationError(
          'name',
          data.name,
          'length',
          `Exercise name must be between ${rules.nameMinLength} and ${rules.nameMaxLength} characters`
        );
      }
    }

    if (data.description !== undefined) {
      if (data.description.trim().length < rules.descriptionMinLength || data.description.trim().length > rules.descriptionMaxLength) {
        throw new ValidationError(
          'description',
          data.description,
          'length',
          `Exercise description must be between ${rules.descriptionMinLength} and ${rules.descriptionMaxLength} characters`
        );
      }
    }

    if (data.primaryMuscles !== undefined) {
      if (data.primaryMuscles.length === 0) {
        throw new ValidationError(
          'primaryMuscles',
          data.primaryMuscles,
          'required',
          'At least one primary muscle group is required'
        );
      }
    }
  }

  private async canExerciseBeArchived(exerciseId: Types.ObjectId): Promise<boolean> {
    // Check if exercise is referenced in active workouts or programs
    // This would require checking other domain repositories
    // For now, return true (placeholder)
    return true;
  }
}