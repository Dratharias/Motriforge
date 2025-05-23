import { Model, Types } from 'mongoose';
import { LoggerFacade } from '@/core/logging';
import { EventMediator } from '@/core/events/EventMediator';
import { CacheFacade } from '@/core/cache/facade/CacheFacade';
import { IExercise, IExerciseAlternative, IExerciseProgression, IExerciseSwap } from '@/types/models';
import { IExerciseRepository } from '@/types/repositories';
import { ValidationResult, RepositoryContext } from '@/types/repositories/base';
import { BaseRepository } from './BaseRepository';
import { ValidationHelpers } from './helpers';

/**
 * Repository for exercise operations with enhanced validation and caching
 */
export class ExerciseRepository extends BaseRepository<IExercise> implements IExerciseRepository {
  private static readonly CACHE_TTL = 600; // 10 minutes
  private static readonly EXERCISE_CACHE_TTL = 1800; // 30 minutes for exercise data
  private static readonly POPULAR_CACHE_TTL = 3600; // 1 hour for popular exercises

  constructor(
    exerciseModel: Model<IExercise>,
    logger: LoggerFacade,
    eventMediator: EventMediator,
    cache?: CacheFacade
  ) {
    super(exerciseModel, logger, eventMediator, cache, 'ExerciseRepository');
  }

  /**
   * Find exercise by name
   */
  public async findByName(name: string): Promise<IExercise | null> {
    const cacheKey = this.cacheHelpers.generateCustomKey('name', { name });
    
    const cached = await this.cacheHelpers.getCustom<IExercise>(cacheKey);
    if (cached) {
      return this.mapToEntity(cached);
    }

    try {
      this.logger.debug('Finding exercise by name', { name });
      
      const exercise = await this.crudOps.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') }
      });

      if (exercise && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, exercise, ExerciseRepository.EXERCISE_CACHE_TTL);
        const exerciseId = this.extractId(exercise);
        if (exerciseId) {
          await this.cacheHelpers.cacheById(exerciseId, exercise, ExerciseRepository.EXERCISE_CACHE_TTL);
        }
      }

      return exercise ? this.mapToEntity(exercise) : null;
    } catch (error) {
      this.logger.error('Error finding exercise by name', error as Error, { name });
      throw error;
    }
  }

  /**
   * Find exercises by muscle group
   */
  public async findByMuscleGroup(muscleGroup: string): Promise<IExercise[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('muscle_group', { muscleGroup });
    
    const cached = await this.cacheHelpers.getCustom<IExercise[]>(cacheKey);
    if (cached) {
      return cached.map(exercise => this.mapToEntity(exercise));
    }

    try {
      this.logger.debug('Finding exercises by muscle group', { muscleGroup });
      
      const exercises = await this.crudOps.find({
        $or: [
          { primaryMuscleGroup: muscleGroup },
          { muscleGroups: { $in: [muscleGroup] } }
        ]
      }, {
        sort: [{ field: 'name', direction: 'asc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, exercises, ExerciseRepository.CACHE_TTL);
      }

      return exercises.map(exercise => this.mapToEntity(exercise));
    } catch (error) {
      this.logger.error('Error finding exercises by muscle group', error as Error, { muscleGroup });
      throw error;
    }
  }

  /**
   * Find exercises by equipment
   */
  public async findByEquipment(equipmentId: Types.ObjectId): Promise<IExercise[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('equipment', { 
      equipmentId: equipmentId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<IExercise[]>(cacheKey);
    if (cached) {
      return cached.map(exercise => this.mapToEntity(exercise));
    }

    try {
      this.logger.debug('Finding exercises by equipment', { 
        equipmentId: equipmentId.toString() 
      });
      
      const exercises = await this.crudOps.find({
        equipment: { $in: [equipmentId] }
      }, {
        sort: [{ field: 'name', direction: 'asc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, exercises, ExerciseRepository.CACHE_TTL);
      }

      return exercises.map(exercise => this.mapToEntity(exercise));
    } catch (error) {
      this.logger.error('Error finding exercises by equipment', error as Error, { 
        equipmentId: equipmentId.toString() 
      });
      throw error;
    }
  }

  /**
   * Find exercises by difficulty
   */
  public async findByDifficulty(difficulty: string): Promise<IExercise[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('difficulty', { difficulty });
    
    const cached = await this.cacheHelpers.getCustom<IExercise[]>(cacheKey);
    if (cached) {
      return cached.map(exercise => this.mapToEntity(exercise));
    }

    try {
      this.logger.debug('Finding exercises by difficulty', { difficulty });
      
      const exercises = await this.crudOps.find({
        difficulty: difficulty
      }, {
        sort: [{ field: 'name', direction: 'asc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, exercises, ExerciseRepository.CACHE_TTL);
      }

      return exercises.map(exercise => this.mapToEntity(exercise));
    } catch (error) {
      this.logger.error('Error finding exercises by difficulty', error as Error, { difficulty });
      throw error;
    }
  }

  /**
   * Find exercises by type
   */
  public async findByType(type: string): Promise<IExercise[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('type', { type });
    
    const cached = await this.cacheHelpers.getCustom<IExercise[]>(cacheKey);
    if (cached) {
      return cached.map(exercise => this.mapToEntity(exercise));
    }

    try {
      this.logger.debug('Finding exercises by type', { type });
      
      const exercises = await this.crudOps.find({
        exerciseType: type
      }, {
        sort: [{ field: 'name', direction: 'asc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, exercises, ExerciseRepository.CACHE_TTL);
      }

      return exercises.map(exercise => this.mapToEntity(exercise));
    } catch (error) {
      this.logger.error('Error finding exercises by type', error as Error, { type });
      throw error;
    }
  }

  /**
   * Find exercises by organization
   */
  public async findByOrganization(organizationId: Types.ObjectId): Promise<IExercise[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('organization', { 
      organizationId: organizationId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<IExercise[]>(cacheKey);
    if (cached) {
      return cached.map(exercise => this.mapToEntity(exercise));
    }

    try {
      this.logger.debug('Finding exercises by organization', { 
        organizationId: organizationId.toString() 
      });
      
      const exercises = await this.crudOps.find({
        organization: organizationId
      }, {
        sort: [{ field: 'name', direction: 'asc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, exercises, ExerciseRepository.CACHE_TTL);
      }

      return exercises.map(exercise => this.mapToEntity(exercise));
    } catch (error) {
      this.logger.error('Error finding exercises by organization', error as Error, { 
        organizationId: organizationId.toString() 
      });
      throw error;
    }
  }

  /**
   * Search exercises by name
   */
  public async searchByName(query: string, limit: number = 20): Promise<IExercise[]> {
    try {
      this.logger.debug('Searching exercises by name', { query, limit });
      
      const exercises = await this.crudOps.find({
        name: { $regex: query, $options: 'i' }
      }, {
        sort: [{ field: 'name', direction: 'asc' }],
        pagination: { limit, offset: 0, page: 1, pageSize: limit }
      });

      return exercises.map(exercise => this.mapToEntity(exercise));
    } catch (error) {
      this.logger.error('Error searching exercises by name', error as Error, { query, limit });
      throw error;
    }
  }

  /**
   * Find exercise alternatives
   */
  public async findAlternatives(exerciseId: Types.ObjectId): Promise<IExerciseAlternative[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('alternatives', { 
      exerciseId: exerciseId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<IExerciseAlternative[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      this.logger.debug('Finding exercise alternatives', { 
        exerciseId: exerciseId.toString() 
      });
      
      // This would need to be implemented with a separate ExerciseAlternative collection
      // For now, returning empty array as placeholder
      const alternatives: IExerciseAlternative[] = [];

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, alternatives, ExerciseRepository.CACHE_TTL);
      }

      return alternatives;
    } catch (error) {
      this.logger.error('Error finding exercise alternatives', error as Error, { 
        exerciseId: exerciseId.toString() 
      });
      throw error;
    }
  }

  /**
   * Find exercise progressions
   */
  public async findProgressions(exerciseId: Types.ObjectId): Promise<IExerciseProgression[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('progressions', { 
      exerciseId: exerciseId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<IExerciseProgression[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      this.logger.debug('Finding exercise progressions', { 
        exerciseId: exerciseId.toString() 
      });
      
      // This would need to be implemented with a separate ExerciseProgression collection
      // For now, returning empty array as placeholder
      const progressions: IExerciseProgression[] = [];

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, progressions, ExerciseRepository.CACHE_TTL);
      }

      return progressions;
    } catch (error) {
      this.logger.error('Error finding exercise progressions', error as Error, { 
        exerciseId: exerciseId.toString() 
      });
      throw error;
    }
  }

  /**
   * Find exercise swaps for user
   */
  public async findSwaps(userId: Types.ObjectId): Promise<IExerciseSwap[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('swaps', { 
      userId: userId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<IExerciseSwap[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      this.logger.debug('Finding exercise swaps for user', { 
        userId: userId.toString() 
      });
      
      // This would need to be implemented with a separate ExerciseSwap collection
      // For now, returning empty array as placeholder
      const swaps: IExerciseSwap[] = [];

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, swaps, ExerciseRepository.CACHE_TTL);
      }

      return swaps;
    } catch (error) {
      this.logger.error('Error finding exercise swaps for user', error as Error, { 
        userId: userId.toString() 
      });
      throw error;
    }
  }

  /**
   * Find popular exercises
   */
  public async findPopular(limit: number = 10): Promise<IExercise[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('popular', { limit });
    
    const cached = await this.cacheHelpers.getCustom<IExercise[]>(cacheKey);
    if (cached) {
      return cached.map(exercise => this.mapToEntity(exercise));
    }

    try {
      this.logger.debug('Finding popular exercises', { limit });
      
      const exercises = await this.crudOps.find({}, {
        sort: [{ field: 'workoutsCount', direction: 'desc' }],
        pagination: { limit, offset: 0, page: 1, pageSize: limit }
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(
          cacheKey, 
          exercises, 
          ExerciseRepository.POPULAR_CACHE_TTL
        );
      }

      return exercises.map(exercise => this.mapToEntity(exercise));
    } catch (error) {
      this.logger.error('Error finding popular exercises', error as Error, { limit });
      throw error;
    }
  }

  /**
   * Increment workout count for exercise
   */
  public async incrementWorkoutCount(id: Types.ObjectId): Promise<void> {
    try {
      this.logger.debug('Incrementing workout count', { id: id.toString() });

      const result = await this.crudOps.update(id, {
        $inc: { workoutsCount: 1 }
      });

      if (result && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateAfterUpdate(id, result);
        await this.cacheHelpers.invalidateByPattern('popular:*');
      }

      if (result) {
        await this.publishEvent('exercise.workout_count.incremented', {
          exerciseId: id.toString(),
          newCount: result.workoutsCount,
          timestamp: new Date()
        });
      }
    } catch (error) {
      this.logger.error('Error incrementing workout count', error as Error, { 
        id: id.toString() 
      });
      throw error;
    }
  }

  /**
   * Find exercises by tags
   */
  public async findByTags(tags: string[]): Promise<IExercise[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('tags', { 
      tags: tags.toSorted((a, b) => a.localeCompare(b)) 
    });
    
    const cached = await this.cacheHelpers.getCustom<IExercise[]>(cacheKey);
    if (cached) {
      return cached.map(exercise => this.mapToEntity(exercise));
    }

    try {
      this.logger.debug('Finding exercises by tags', { tags });
      
      const exercises = await this.crudOps.find({
        tags: { $in: tags }
      }, {
        sort: [{ field: 'name', direction: 'asc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, exercises, ExerciseRepository.CACHE_TTL);
      }

      return exercises.map(exercise => this.mapToEntity(exercise));
    } catch (error) {
      this.logger.error('Error finding exercises by tags', error as Error, { tags });
      throw error;
    }
  }

  /**
   * Override create to handle exercise-specific logic
   */
  public async create(data: Partial<IExercise>, context?: RepositoryContext): Promise<IExercise> {
    // Validate unique name within organization
    if (data.name && data.organization) {
      const existingExercise = await this.crudOps.findOne({
        name: { $regex: new RegExp(`^${data.name}$`, 'i') },
        organization: data.organization
      });
      
      if (existingExercise) {
        throw new Error('Exercise with this name already exists in the organization');
      }
    }

    // Set default values
    const exerciseData: Partial<IExercise> = {
      ...data,
      tags: data.tags ?? [],
      muscleGroups: data.muscleGroups ?? [],
      equipment: data.equipment ?? [],
      prerequisites: data.prerequisites ?? [],
      formCues: data.formCues ?? [],
      commonMistakes: data.commonMistakes ?? [],
      mediaIds: data.mediaIds ?? [],
      workoutsCount: 0,
      shared: data.shared ?? false
    };

    const exercise = await super.create(exerciseData, context);

    // Publish exercise creation event
    await this.publishEvent('exercise.created', {
      exerciseId: exercise._id.toString(),
      name: exercise.name,
      organizationId: exercise.organization.toString(),
      primaryMuscleGroup: exercise.primaryMuscleGroup,
      equipmentCount: exercise.equipment.length,
      timestamp: new Date()
    });

    return exercise;
  }

  /**
   * Validate exercise data
   */
  protected validateData(data: Partial<IExercise>): ValidationResult {
    const errors: string[] = [];

    // Name validation
    if (data.name !== undefined) {
      const nameValidation = ValidationHelpers.validateFieldLength(
        data.name, 
        'name', 
        2, 
        100
      );
      if (!nameValidation.valid) {
        errors.push(...nameValidation.errors);
      }
    }

    // Description validation
    if (data.description !== undefined && data.description.length > 1000) {
      errors.push('Description must be less than 1000 characters');
    }

    // Instructions validation
    if (data.instructions !== undefined && data.instructions.length > 2000) {
      errors.push('Instructions must be less than 2000 characters');
    }

    // Muscle groups validation
    if (data.muscleGroups) {
      if (!Array.isArray(data.muscleGroups)) {
        errors.push('Muscle groups must be an array');
      } else if (data.muscleGroups.length === 0) {
        errors.push('At least one muscle group is required');
      }
    }

    // Primary muscle group validation
    if (data.primaryMuscleGroup !== undefined && data.primaryMuscleGroup.length === 0) {
      errors.push('Primary muscle group is required');
    }

    // Tags validation
    if (data.tags) {
      if (!Array.isArray(data.tags)) {
        errors.push('Tags must be an array');
      } else {
        data.tags.forEach((tag, index) => {
          if (typeof tag !== 'string' || tag.length === 0) {
            errors.push(`Tag at index ${index} must be a non-empty string`);
          }
        });
      }
    }

    // Prerequisites validation
    if (data.prerequisites) {
      if (!Array.isArray(data.prerequisites)) {
        errors.push('Prerequisites must be an array');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Map database document to domain entity
   */
  protected mapToEntity(data: any): IExercise {
    return {
      _id: data._id,
      name: data.name,
      description: data.description ?? '',
      instructions: data.instructions ?? '',
      muscleGroups: data.muscleGroups ?? [],
      primaryMuscleGroup: data.primaryMuscleGroup,
      equipment: data.equipment ?? [],
      exerciseType: data.exerciseType,
      difficulty: data.difficulty,
      mediaIds: data.mediaIds ?? [],
      prerequisites: data.prerequisites ?? [],
      formCues: data.formCues ?? [],
      commonMistakes: data.commonMistakes ?? [],
      tags: data.tags ?? [],
      workoutsCount: data.workoutsCount ?? 0,
      organization: data.organization,
      createdBy: data.createdBy,
      isArchived: data.isArchived ?? false,
      shared: data.shared ?? false,
      organizationVisibility: data.organizationVisibility,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    } as IExercise;
  }

  /**
   * Map domain entity to database document
   */
  protected mapFromEntity(entity: IExercise): any {
    const doc = { ...entity };
    
    // Remove any computed fields
    delete (doc as any).__v;
    
    return doc;
  }
}