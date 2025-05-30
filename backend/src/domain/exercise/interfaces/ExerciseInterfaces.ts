import { Types } from 'mongoose';
import { Exercise } from '../entities/Exercise';
import {
  ExerciseType,
  Difficulty,
  MuscleZone,
  EquipmentCategory
} from '../../../types/fitness/enums/exercise';
import { ValidationError, ValidationWarning } from '../../../types/core/behaviors';

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
  readonly prerequisites?: readonly Types.ObjectId[];
  readonly isDraft?: boolean;
}

export interface IExerciseUpdateData {
  readonly name?: string;
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
}

export interface IExerciseSearchCriteria {
  readonly name?: string;
  readonly type?: ExerciseType;
  readonly difficulty?: Difficulty;
  readonly primaryMuscles?: readonly MuscleZone[];
  readonly secondaryMuscles?: readonly MuscleZone[];
  readonly equipment?: readonly EquipmentCategory[];
  readonly tags?: readonly string[];
  readonly createdBy?: Types.ObjectId;
  readonly isActive?: boolean;
  readonly isDraft?: boolean;
  readonly durationMin?: number;
  readonly durationMax?: number;
  readonly complexityMin?: number;
  readonly complexityMax?: number;
  readonly hasMedia?: boolean;
  readonly hasProgressions?: boolean;
  readonly hasContraindications?: boolean;
}

export interface IExerciseQueryOptions {
  readonly limit?: number;
  readonly offset?: number;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
  readonly includeInactive?: boolean;
  readonly includeDrafts?: boolean;
}

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

export interface IExerciseRepository {
  findById(id: Types.ObjectId, options?: IExerciseQueryOptions): Promise<Exercise | null>;
  findByCriteria(criteria: IExerciseSearchCriteria, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findByType(type: ExerciseType, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findByDifficulty(difficulty: Difficulty, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findByMuscleGroup(muscle: MuscleZone, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findByMuscleGroups(primaryMuscles: readonly MuscleZone[], secondaryMuscles?: readonly MuscleZone[], options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findByPrimaryMuscles(muscles: readonly MuscleZone[], options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findBySecondaryMuscles(muscles: readonly MuscleZone[], options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findByEquipment(equipment: EquipmentCategory, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findByEquipmentList(equipment: readonly EquipmentCategory[], requireAll?: boolean, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findByCreator(creatorId: Types.ObjectId, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findPublished(options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findDrafts(creatorId?: Types.ObjectId, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findSafeForConditions(conditions: readonly string[], options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findVariations(exerciseId: Types.ObjectId): Promise<readonly Exercise[]>;
  findPrerequisites(exerciseId: Types.ObjectId): Promise<readonly Exercise[]>;
  searchByText(query: string, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findByTags(tags: readonly string[], matchAll?: boolean, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findByDuration(minDuration: number, maxDuration: number, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findByComplexity(minComplexity: number, maxComplexity: number, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findBodyweightExercises(options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findWithMedia(options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findWithProgressions(options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findSimilar(exerciseId: Types.ObjectId, limit?: number): Promise<readonly Exercise[]>;
  findPopular(limit?: number, timeframe?: 'week' | 'month' | 'year'): Promise<readonly Exercise[]>;
  findRecent(limit?: number, daysBack?: number): Promise<readonly Exercise[]>;
  findNeedingReview(options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  
  create(exercise: Exercise): Promise<Exercise>;
  update(id: Types.ObjectId, updates: Partial<Exercise>): Promise<Exercise | null>;
  archive(id: Types.ObjectId): Promise<boolean>;
  restore(id: Types.ObjectId): Promise<boolean>;
  delete(id: Types.ObjectId): Promise<boolean>;
  
  bulkCreate(exercises: readonly Exercise[]): Promise<readonly Exercise[]>;
  bulkUpdate(updates: ReadonlyArray<{ id: Types.ObjectId; updates: Partial<Exercise> }>): Promise<readonly Exercise[]>;
  bulkArchive(ids: readonly Types.ObjectId[]): Promise<boolean>;
  
  count(criteria?: IExerciseSearchCriteria): Promise<number>;
  getStatistics(): Promise<IExerciseStatistics>;
  getExercisesByType(): Promise<Record<ExerciseType, number>>;
  getExercisesByDifficulty(): Promise<Record<Difficulty, number>>;
  getExercisesByMuscleGroup(): Promise<Record<MuscleZone, number>>;
  getAverageDurationByType(): Promise<Record<ExerciseType, number>>;
  getAverageCaloriesByType(): Promise<Record<ExerciseType, number>>;
  
  isNameAvailable(name: string, excludeId?: Types.ObjectId): Promise<boolean>;
  validateExerciseData(exercise: Partial<Exercise>): Promise<readonly string[]>;
  checkPrerequisiteChain(exerciseId: Types.ObjectId): Promise<boolean>;
  findCircularPrerequisites(exerciseId: Types.ObjectId): Promise<readonly Types.ObjectId[]>;
}

export enum ContraindicationType {
  MEDICAL = 'MEDICAL',
  INJURY = 'INJURY',
  CONDITION = 'CONDITION',
  AGE = 'AGE',
  EQUIPMENT = 'EQUIPMENT'
}

export enum ContraindicationSeverity {
  ABSOLUTE = 'ABSOLUTE',
  RELATIVE = 'RELATIVE',
  PRECAUTION = 'PRECAUTION'
}

export interface IContraindication {
  readonly id: Types.ObjectId;
  readonly type: ContraindicationType;
  readonly severity: ContraindicationSeverity;
  readonly conditions: readonly string[];
  readonly description: string;
  readonly alternatives: readonly Types.ObjectId[];
}

export interface IExerciseValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationWarning[];
  readonly completionPercentage: number;
  readonly missingRequiredFields: readonly string[];
}

export interface IExercisePerformanceMetrics {
  readonly exerciseId: Types.ObjectId;
  readonly userId: Types.ObjectId;
  readonly completedReps?: number;
  readonly targetReps?: number;
  readonly duration?: number;
  readonly caloriesBurned?: number;
  readonly difficultyRating?: number;
  readonly formQuality?: number;
  readonly completedAt: Date;
  readonly notes?: string;
}