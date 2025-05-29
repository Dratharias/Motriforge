import { Types } from 'mongoose';
import { 
  ExerciseType, 
  Difficulty, 
  MuscleZone, 
  EquipmentCategory 
} from '../../../types/fitness/enums/exercise';
import { Exercise } from '../entities/Exercise';
import { ExerciseInstruction } from '../entities/ExerciseInstruction';
import { ExerciseProgression } from '../entities/ExerciseProgression';
import { NewEntity } from '../../../types/core/interfaces';

/**
 * Exercise contraindication interface
 */
export interface IContraindication {
  readonly id: Types.ObjectId;
  readonly type: ContraindicationType;
  readonly severity: ContraindicationSeverity;
  readonly conditions: readonly string[];
  readonly description: string;
  readonly alternatives: readonly Types.ObjectId[]; // Alternative exercise IDs
  readonly verifiedBy?: Types.ObjectId; // Medical professional ID
}

/**
 * Types of contraindications
 */
export enum ContraindicationType {
  MEDICAL = 'MEDICAL',
  INJURY = 'INJURY',
  AGE = 'AGE',
  PHYSICAL_LIMITATION = 'PHYSICAL_LIMITATION',
  EQUIPMENT = 'EQUIPMENT',
  ENVIRONMENTAL = 'ENVIRONMENTAL'
}

/**
 * Severity levels for contraindications
 */
export enum ContraindicationSeverity {
  ABSOLUTE = 'ABSOLUTE', // Must not perform
  RELATIVE = 'RELATIVE', // Caution required
  PRECAUTION = 'PRECAUTION', // Monitor closely
  ADVISORY = 'ADVISORY' // General advice
}

/**
 * Difficulty level interface with detailed requirements
 */
export interface IDifficultyLevel {
  readonly level: Difficulty;
  readonly name: string;
  readonly description: string;
  readonly prerequisites: readonly string[];
  readonly physicalRequirements: readonly string[];
  readonly technicalSkills: readonly string[];
  readonly estimatedExperience: number; // months of training
  readonly strengthRequirements: readonly string[];
  readonly flexibilityRequirements: readonly string[];
  readonly coordinationLevel: number; // 1-10 scale
}

/**
 * Exercise search criteria
 */
export interface IExerciseSearchCriteria {
  readonly name?: string;
  readonly type?: ExerciseType;
  readonly difficulty?: Difficulty;
  readonly primaryMuscles?: readonly MuscleZone[];
  readonly secondaryMuscles?: readonly MuscleZone[];
  readonly equipment?: readonly EquipmentCategory[];
  readonly tags?: readonly string[];
  readonly durationMin?: number;
  readonly durationMax?: number;
  readonly caloriesMin?: number;
  readonly caloriesMax?: number;
  readonly ageMin?: number;
  readonly ageMax?: number;
  readonly isDraft?: boolean;
  readonly isPublished?: boolean;
  readonly createdBy?: Types.ObjectId;
  readonly createdAfter?: Date;
  readonly createdBefore?: Date;
  readonly hasMedia?: boolean;
  readonly hasProgressions?: boolean;
  readonly excludeContraindications?: readonly string[];
}

/**
 * Exercise query options for repository operations
 */
export interface IExerciseQueryOptions {
  readonly limit?: number;
  readonly offset?: number;
  readonly sortBy?: ExerciseSortField;
  readonly sortOrder?: 'asc' | 'desc';
  readonly includeInstructions?: boolean;
  readonly includeProgressions?: boolean;
  readonly includeContraindications?: boolean;
  readonly includeMedia?: boolean;
  readonly includeVariations?: boolean;
  readonly includePrerequisites?: boolean;
}

/**
 * Fields available for sorting exercises
 */
export enum ExerciseSortField {
  NAME = 'name',
  DIFFICULTY = 'difficulty',
  TYPE = 'type',
  DURATION = 'estimatedDuration',
  CALORIES = 'caloriesBurnedPerMinute',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  POPULARITY = 'popularity',
  COMPLEXITY = 'complexity'
}

/**
 * Exercise statistics interface
 */
export interface IExerciseStatistics {
  readonly totalExercises: number;
  readonly publishedExercises: number;
  readonly draftExercises: number;
  readonly exercisesByType: Record<ExerciseType, number>;
  readonly exercisesByDifficulty: Record<Difficulty, number>;
  readonly exercisesByMuscleGroup: Record<MuscleZone, number>;
  readonly averageDuration: number;
  readonly averageCaloriesBurn: number;
  readonly exercisesWithMedia: number;
  readonly exercisesWithProgressions: number;
  readonly exercisesWithContraindications: number;
}

/**
 * Exercise creation data interface
 */
export interface IExerciseCreationData {
  readonly name: string;
  readonly description: string;
  readonly type: ExerciseType;
  readonly difficulty: Difficulty;
  readonly primaryMuscles: readonly MuscleZone[];
  readonly secondaryMuscles?: readonly MuscleZone[];
  readonly equipment?: readonly EquipmentCategory[];
  readonly tags?: readonly string[];
  readonly estimatedDuration?: number;
  readonly caloriesBurnedPerMinute?: number;
  readonly minimumAge?: number;
  readonly maximumAge?: number;
  readonly prerequisites?: readonly Types.ObjectId[];
  readonly isDraft?: boolean;
}

/**
 * Exercise update data interface
 */
export interface IExerciseUpdateData {
  name?: string;
  readonly description?: string;
  readonly type?: ExerciseType;
  readonly difficulty?: Difficulty;
  readonly primaryMuscles?: readonly MuscleZone[];
  readonly secondaryMuscles?: readonly MuscleZone[];
  readonly equipment?: readonly EquipmentCategory[];
  readonly tags?: readonly string[];
  readonly estimatedDuration?: number;
  readonly caloriesBurnedPerMinute?: number;
  readonly minimumAge?: number;
  readonly maximumAge?: number;
  readonly prerequisites?: readonly Types.ObjectId[];
}

/**
 * Exercise validation result
 */
export interface IExerciseValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly canPublish: boolean;
  readonly completionPercentage: number;
  readonly missingRequiredFields: readonly string[];
}

/**
 * Exercise media information
 */
export interface IExerciseMedia {
  readonly id: Types.ObjectId;
  readonly exerciseId: Types.ObjectId;
  readonly url: string;
  readonly type: string;
  readonly title?: string;
  readonly description?: string;
  readonly duration?: number;
  readonly thumbnailUrl?: string;
  readonly order: number;
  readonly createdAt: Date;
}

/**
 * Repository interface for Exercise operations
 */
export interface IExerciseRepository {
  findById(id: Types.ObjectId, options?: IExerciseQueryOptions): Promise<Exercise | null>;
  findByCriteria(criteria: IExerciseSearchCriteria, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findByType(type: ExerciseType, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findByDifficulty(difficulty: Difficulty, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findByMuscleGroup(muscle: MuscleZone, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findByEquipment(equipment: EquipmentCategory, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findByCreator(creatorId: Types.ObjectId, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findPublished(options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findDrafts(creatorId?: Types.ObjectId, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findByAge(age: number, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findSafeForConditions(conditions: readonly string[], options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findVariations(exerciseId: Types.ObjectId): Promise<readonly Exercise[]>;
  findPrerequisites(exerciseId: Types.ObjectId): Promise<readonly Exercise[]>;
  searchByText(query: string, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  
  // ADD THESE MISSING METHODS:
  /**
   * Find exercises that need review (published but not reviewed)
   */
  findNeedingReview(options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  
  /**
   * Find exercises by tags
   */
  findByTags(tags: readonly string[], matchAll?: boolean, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  
  /**
   * Find exercises within duration range
   */
  findByDuration(minDuration: number, maxDuration: number, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  
  /**
   * Find exercises within calorie range
   */
  findByCalorieRange(minCalories: number, maxCalories: number, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  
  /**
   * Find exercises requiring no equipment (bodyweight)
   */
  findBodyweightExercises(options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  
  /**
   * Find exercises with media content
   */
  findWithMedia(options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  
  /**
   * Find exercises with progressions
   */
  findWithProgressions(options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;

  create(exercise: Omit<Exercise, NewEntity>): Promise<Exercise>;
  update(id: Types.ObjectId, updates: Partial<Exercise>): Promise<Exercise | null>;
  archive(id: Types.ObjectId): Promise<boolean>;
  restore(id: Types.ObjectId): Promise<boolean>;
  delete(id: Types.ObjectId): Promise<boolean>;
  count(criteria?: IExerciseSearchCriteria): Promise<number>;
  getStatistics(): Promise<IExerciseStatistics>;
  isNameAvailable(name: string, excludeId?: Types.ObjectId): Promise<boolean>;
  findSimilar(exerciseId: Types.ObjectId, limit?: number): Promise<readonly Exercise[]>;
  findPopular(limit?: number, timeframe?: 'week' | 'month' | 'year'): Promise<readonly Exercise[]>;
  findRecent(limit?: number, daysBack?: number): Promise<readonly Exercise[]>;

  // ADD THESE BULK OPERATIONS:
  /**
   * Bulk operations
   */
  bulkCreate(exercises: ReadonlyArray<Omit<Exercise, NewEntity>>): Promise<readonly Exercise[]>;
  bulkUpdate(updates: ReadonlyArray<{ id: Types.ObjectId; updates: Partial<Exercise> }>): Promise<readonly Exercise[]>;
  bulkArchive(ids: readonly Types.ObjectId[]): Promise<boolean>;

  // ADD THESE ADVANCED OPERATIONS:
  /**
   * Advanced filtering
   */
  findByComplexity(minComplexity: number, maxComplexity: number, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findByMuscleGroups(primaryMuscles: readonly MuscleZone[], secondaryMuscles?: readonly MuscleZone[], options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findByEquipmentList(equipment: readonly EquipmentCategory[], requireAll?: boolean, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;

  /**
   * Aggregation queries
   */
  getExercisesByType(): Promise<Record<ExerciseType, number>>;
  getExercisesByDifficulty(): Promise<Record<Difficulty, number>>;
  getExercisesByMuscleGroup(): Promise<Record<MuscleZone, number>>;
  getAverageDurationByType(): Promise<Record<ExerciseType, number>>;
  getAverageCaloriesByType(): Promise<Record<ExerciseType, number>>;

  /**
   * Validation helpers
   */
  validateExerciseData(exercise: Partial<Exercise>): Promise<readonly string[]>;
  checkPrerequisiteChain(exerciseId: Types.ObjectId): Promise<boolean>;
  findCircularPrerequisites(exerciseId: Types.ObjectId): Promise<readonly Types.ObjectId[]>;
}

/**
 * Repository interface for ExerciseInstruction operations
 */
export interface IExerciseInstructionRepository {
  /**
   * Find instruction by ID
   */
  findById(id: Types.ObjectId): Promise<ExerciseInstruction | null>;

  /**
   * Find instructions by exercise ID
   */
  findByExerciseId(exerciseId: Types.ObjectId): Promise<readonly ExerciseInstruction[]>;

  /**
   * Create instruction
   */
  create(instruction: Omit<ExerciseInstruction, NewEntity>): Promise<ExerciseInstruction>;

  /**
   * Update instruction
   */
  update(id: Types.ObjectId, updates: Partial<ExerciseInstruction>): Promise<ExerciseInstruction | null>;

  /**
   * Delete instruction
   */
  delete(id: Types.ObjectId): Promise<boolean>;

  /**
   * Reorder instructions for an exercise
   */
  reorder(exerciseId: Types.ObjectId, instructionIds: readonly Types.ObjectId[]): Promise<boolean>;
}

/**
 * Repository interface for ExerciseProgression operations
 */
export interface IExerciseProgressionRepository {
  /**
   * Find progression by ID
   */
  findById(id: Types.ObjectId): Promise<ExerciseProgression | null>;

  /**
   * Find progressions by exercise ID
   */
  findByExerciseId(exerciseId: Types.ObjectId): Promise<readonly ExerciseProgression[]>;

  /**
   * Find progressions from difficulty level
   */
  findFromDifficulty(exerciseId: Types.ObjectId, difficulty: Difficulty): Promise<readonly ExerciseProgression[]>;

  /**
   * Find progressions to difficulty level
   */
  findToDifficulty(exerciseId: Types.ObjectId, difficulty: Difficulty): Promise<readonly ExerciseProgression[]>;

  /**
   * Create progression
   */
  create(progression: Omit<ExerciseProgression, NewEntity>): Promise<ExerciseProgression>;

  /**
   * Update progression
   */
  update(id: Types.ObjectId, updates: Partial<ExerciseProgression>): Promise<ExerciseProgression | null>;

  /**
   * Delete progression
   */
  delete(id: Types.ObjectId): Promise<boolean>;

  /**
   * Find progression path between difficulty levels
   */
  findProgressionPath(exerciseId: Types.ObjectId, from: Difficulty, to: Difficulty): Promise<readonly ExerciseProgression[]>;
}
  