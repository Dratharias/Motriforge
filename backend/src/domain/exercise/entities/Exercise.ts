import { Types } from 'mongoose';
import { 
  ICloneable, 
  IShareable, 
  IDraftable, 
  IValidatable,
  ValidationResult,
  ValidationError,
  ValidationSeverity,
  IDraftPreview,
  ValidationWarning
} from '../../../types/core/behaviors';
import { IEntity, IUser } from '../../../types/core/interfaces';
import { 
  ExerciseType, 
  Difficulty, 
  MuscleZone, 
  EquipmentCategory 
} from '../../../types/fitness/enums/exercise';
import { MediaType } from '../../../types/fitness/enums/media';
import { Action } from '../../../types/core/enums';
import { ExerciseInstruction } from './ExerciseInstruction';
import { ExerciseProgression } from './ExerciseProgression';
import { IContraindication } from '../interfaces/ExerciseInterfaces';

/**
 * Core exercise entity representing fitness exercises
 */
export class Exercise implements IEntity, ICloneable<Exercise>, IShareable, IDraftable, IValidatable {
  public readonly id: Types.ObjectId;
  public name: string;
  public readonly description: string;
  public readonly type: ExerciseType;
  public readonly difficulty: Difficulty;
  public readonly primaryMuscles: readonly MuscleZone[];
  public readonly secondaryMuscles: readonly MuscleZone[];
  public readonly equipment: readonly EquipmentCategory[];
  public readonly instructions: readonly ExerciseInstruction[];
  public readonly progressions: readonly ExerciseProgression[];
  public readonly contraindications: readonly IContraindication[];
  public readonly mediaUrls: readonly string[];
  public readonly mediaTypes: readonly MediaType[];
  public readonly tags: readonly string[];
  public readonly estimatedDuration: number; // in minutes
  public readonly caloriesBurnedPerMinute: number;
  public readonly minimumAge: number;
  public readonly maximumAge?: number;
  public readonly prerequisites: readonly Types.ObjectId[]; // Other exercise IDs
  public readonly variations: readonly Types.ObjectId[]; // Exercise variation IDs
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly createdBy: Types.ObjectId;
  public readonly isActive: boolean;
  public readonly isDraft: boolean;
  public readonly publishedAt?: Date;
  public readonly reviewedBy?: Types.ObjectId;

  constructor(data: {
    id: Types.ObjectId;
    name: string;
    description: string;
    type: ExerciseType;
    difficulty: Difficulty;
    primaryMuscles: readonly MuscleZone[];
    secondaryMuscles?: readonly MuscleZone[];
    equipment?: readonly EquipmentCategory[];
    instructions?: readonly ExerciseInstruction[];
    progressions?: readonly ExerciseProgression[];
    contraindications?: readonly IContraindication[];
    mediaUrls?: readonly string[];
    mediaTypes?: readonly MediaType[];
    tags?: readonly string[];
    estimatedDuration?: number;
    caloriesBurnedPerMinute?: number;
    minimumAge?: number;
    maximumAge?: number;
    prerequisites?: readonly Types.ObjectId[];
    variations?: readonly Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
    createdBy: Types.ObjectId;
    isActive: boolean;
    isDraft?: boolean;
    publishedAt?: Date;
    reviewedBy?: Types.ObjectId;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.type = data.type;
    this.difficulty = data.difficulty;
    this.primaryMuscles = data.primaryMuscles;
    this.secondaryMuscles = data.secondaryMuscles ?? [];
    this.equipment = data.equipment ?? [];
    this.instructions = data.instructions ?? [];
    this.progressions = data.progressions ?? [];
    this.contraindications = data.contraindications ?? [];
    this.mediaUrls = data.mediaUrls ?? [];
    this.mediaTypes = data.mediaTypes ?? [];
    this.tags = data.tags ?? [];
    this.estimatedDuration = data.estimatedDuration ?? 5;
    this.caloriesBurnedPerMinute = data.caloriesBurnedPerMinute ?? 3;
    this.minimumAge = data.minimumAge ?? 13;
    this.maximumAge = data.maximumAge;
    this.prerequisites = data.prerequisites ?? [];
    this.variations = data.variations ?? [];
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.createdBy = data.createdBy;
    this.isActive = data.isActive;
    this.isDraft = data.isDraft ?? false;
    this.publishedAt = data.publishedAt;
    this.reviewedBy = data.reviewedBy;
  }

  // ICloneable implementation
  clone(): Exercise {
    return new Exercise({
      ...this,
      id: new Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isDraft: true,
      publishedAt: undefined,
      reviewedBy: undefined
    });
  }

  cloneWithModifications(modifications: Partial<Exercise>): Exercise {
    return new Exercise({
      ...this,
      ...modifications,
      id: new Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isDraft: true,
      publishedAt: undefined,
      reviewedBy: undefined
    });
  }

  // IShareable implementation
  canBeSharedWith(user: IUser): boolean {
    // Basic sharing rules - can be enhanced by IAM service
    return this.isActive && !this.isDraft;
  }

  async share(targetUser: IUser, permissions: readonly Action[]): Promise<void> {
    // This would be handled by sharing service
    // Placeholder implementation
  }

  // IDraftable implementation
  validateForPublication(): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Exercise name is required',
        code: 'required',
        severity: ValidationSeverity.ERROR
      });
    }

    if (!this.description || this.description.trim().length < 10) {
      errors.push({
        field: 'description',
        message: 'Exercise description must be at least 10 characters',
        code: 'min_length',
        severity: ValidationSeverity.ERROR
      });
    }

    if (this.primaryMuscles.length === 0) {
      errors.push({
        field: 'primaryMuscles',
        message: 'At least one primary muscle group is required',
        code: 'required',
        severity: ValidationSeverity.ERROR
      });
    }

    if (this.instructions.length === 0) {
      errors.push({
        field: 'instructions',
        message: 'Exercise instructions are required',
        code: 'required',
        severity: ValidationSeverity.ERROR
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      isDraftValid: true,
      requiredForPublication: ['name', 'description', 'primaryMuscles', 'instructions'],
      canSaveDraft: () => true,
      canPublish: () => errors.length === 0
    };
  }

  canBePublished(): boolean {
    return this.validateForPublication().isValid;
  }

  publish(): Exercise {
    if (!this.canBePublished()) {
      throw new Error('Exercise cannot be published - validation failed');
    }

    return new Exercise({
      ...this,
      isDraft: false,
      publishedAt: new Date(),
      updatedAt: new Date()
    });
  }

  saveDraft(): Exercise {
    return new Exercise({
      ...this,
      isDraft: true,
      updatedAt: new Date()
    });
  }

  getDraftPreview(): IDraftPreview {
    const requiredFields = ['name', 'description', 'primaryMuscles', 'instructions'];
    const optionalFields = ['secondaryMuscles', 'equipment', 'progressions', 'mediaUrls', 'tags'];
    
    let completedRequired = 0;
    let completedOptional = 0;

    // Check required fields
    if (this.name && this.name.trim().length > 0) completedRequired++;
    if (this.description && this.description.trim().length >= 10) completedRequired++;
    if (this.primaryMuscles.length > 0) completedRequired++;
    if (this.instructions.length > 0) completedRequired++;

    // Check optional fields
    if (this.secondaryMuscles.length > 0) completedOptional++;
    if (this.equipment.length > 0) completedOptional++;
    if (this.progressions.length > 0) completedOptional++;
    if (this.mediaUrls.length > 0) completedOptional++;
    if (this.tags.length > 0) completedOptional++;

    const totalFields = requiredFields.length + optionalFields.length;
    const totalCompleted = completedRequired + completedOptional;
    const percentage = Math.round((totalCompleted / totalFields) * 100);

    const missingRequired = requiredFields.filter((_, index) => {
      switch (index) {
        case 0: return !this.name || this.name.trim().length === 0;
        case 1: return !this.description || this.description.trim().length < 10;
        case 2: return this.primaryMuscles.length === 0;
        case 3: return this.instructions.length === 0;
        default: return false;
      }
    });

    return {
      completionPercentage: percentage,
      missingRequiredFields: missingRequired,
      optionalFieldsCompleted: optionalFields.slice(0, completedOptional),
      estimatedTimeToComplete: missingRequired.length * 5, // 5 minutes per field
      lastModified: this.updatedAt
    };
  }

  getPublicationRequirements(): readonly string[] {
    return ['name', 'description', 'primaryMuscles', 'instructions', 'type', 'difficulty'];
  }

  // IValidatable implementation
  validate(): ValidationResult {
    return this.validateForPublication();
  }

  validateDraft(): ValidationResult {
    // More lenient validation for drafts
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (this.name && this.name.length > 100) {
      errors.push({
        field: 'name',
        message: 'Exercise name must be less than 100 characters',
        code: 'max_length',
        severity: ValidationSeverity.ERROR
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      isDraftValid: true,
      requiredForPublication: [],
      canSaveDraft: () => true,
      canPublish: () => this.validateForPublication().isValid
    };
  }

  isValid(): boolean {
    return this.validate().isValid;
  }

  isDraftValid(): boolean {
    return this.validateDraft().isValid;
  }

  getValidationErrors(): readonly ValidationError[] {
    return this.validate().errors;
  }

  getDraftValidationErrors(): readonly ValidationError[] {
    return this.validateDraft().errors;
  }

  // Exercise-specific methods
  /**
   * Check if exercise targets specific muscle group
   */
  targetsMuscle(muscle: MuscleZone): boolean {
    return this.primaryMuscles.includes(muscle) || this.secondaryMuscles.includes(muscle);
  }

  /**
   * Check if exercise requires specific equipment
   */
  requiresEquipment(equipment: EquipmentCategory): boolean {
    return this.equipment.includes(equipment);
  }

  /**
   * Check if exercise is suitable for age
   */
  isSuitableForAge(age: number): boolean {
    if (age < this.minimumAge) return false;
    if (this.maximumAge && age > this.maximumAge) return false;
    return true;
  }

  /**
   * Check if exercise has contraindications for conditions
   */
  hasContraindicationsFor(conditions: readonly string[]): boolean {
    return this.contraindications.some(contraindication =>
      conditions.some(condition => 
        contraindication.conditions.includes(condition)
      )
    );
  }

  /**
   * Get estimated calories burned for duration
   */
  getEstimatedCaloriesBurned(durationMinutes: number): number {
    return Math.round(this.caloriesBurnedPerMinute * durationMinutes);
  }

  /**
   * Get exercise complexity score
   */
  getComplexityScore(): number {
    let score = 0;
    
    // Base difficulty score
    const difficultyMap = {
      [Difficulty.BEGINNER_I]: 1,
      [Difficulty.BEGINNER_II]: 2,
      [Difficulty.BEGINNER_III]: 3,
      [Difficulty.INTERMEDIATE_I]: 4,
      [Difficulty.INTERMEDIATE_II]: 5,
      [Difficulty.INTERMEDIATE_III]: 6,
      [Difficulty.ADVANCED_I]: 7,
      [Difficulty.ADVANCED_II]: 8,
      [Difficulty.ADVANCED_III]: 9,
      [Difficulty.MASTER]: 10
    };
    
    score += difficultyMap[this.difficulty] ?? 5;
    
    // Equipment complexity
    score += this.equipment.length * 0.5;
    
    // Muscle group complexity
    score += (this.primaryMuscles.length + this.secondaryMuscles.length) * 0.3;
    
    // Prerequisites add complexity
    score += this.prerequisites.length * 0.2;
    
    return Math.round(score * 10) / 10;
  }

  /**
   * Update exercise with new data
   */
  update(updates: {
    name?: string;
    description?: string;
    type?: ExerciseType;
    difficulty?: Difficulty;
    primaryMuscles?: readonly MuscleZone[];
    secondaryMuscles?: readonly MuscleZone[];
    equipment?: readonly EquipmentCategory[];
    tags?: readonly string[];
    estimatedDuration?: number;
    caloriesBurnedPerMinute?: number;
    minimumAge?: number;
    maximumAge?: number;
  }): Exercise {
    return new Exercise({
      ...this,
      name: updates.name ?? this.name,
      description: updates.description ?? this.description,
      type: updates.type ?? this.type,
      difficulty: updates.difficulty ?? this.difficulty,
      primaryMuscles: updates.primaryMuscles ?? this.primaryMuscles,
      secondaryMuscles: updates.secondaryMuscles ?? this.secondaryMuscles,
      equipment: updates.equipment ?? this.equipment,
      tags: updates.tags ?? this.tags,
      estimatedDuration: updates.estimatedDuration ?? this.estimatedDuration,
      caloriesBurnedPerMinute: updates.caloriesBurnedPerMinute ?? this.caloriesBurnedPerMinute,
      minimumAge: updates.minimumAge ?? this.minimumAge,
      maximumAge: updates.maximumAge ?? this.maximumAge,
      updatedAt: new Date()
    });
  }

  /**
   * Add instruction to exercise
   */
  addInstruction(instruction: ExerciseInstruction): Exercise {
    return new Exercise({
      ...this,
      instructions: [...this.instructions, instruction],
      updatedAt: new Date()
    });
  }

  /**
   * Add progression to exercise
   */
  addProgression(progression: ExerciseProgression): Exercise {
    return new Exercise({
      ...this,
      progressions: [...this.progressions, progression],
      updatedAt: new Date()
    });
  }

  /**
   * Add contraindication to exercise
   */
  addContraindication(contraindication: IContraindication): Exercise {
    return new Exercise({
      ...this,
      contraindications: [...this.contraindications, contraindication],
      updatedAt: new Date()
    });
  }

  /**
   * Check if exercise is published
   */
  isPublished(): boolean {
    return !this.isDraft && this.publishedAt !== undefined;
  }

  /**
   * Check if exercise needs review
   */
  needsReview(): boolean {
    return !this.isDraft && !this.reviewedBy;
  }
}

