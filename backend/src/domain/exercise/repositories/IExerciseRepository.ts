import { Types } from 'mongoose';
import { Exercise } from '../entities/Exercise';
import { 
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
import { NewEntity } from '../../../types/core/interfaces';

/**
 * Repository interface for Exercise operations
 */
export interface IExerciseRepository {
  /**
   * Find exercise by ID with optional includes
   */
  findById(id: Types.ObjectId, options?: IExerciseQueryOptions): Promise<Exercise | null>;

  /**
   * Find exercises by search criteria with pagination and sorting
   */
  findByCriteria(criteria: IExerciseSearchCriteria, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;

  /**
   * Find exercises by type
   */
  findByType(type: ExerciseType, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;

  /**
   * Find exercises by difficulty level
   */
  findByDifficulty(difficulty: Difficulty, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;

  /**
   * Find exercises targeting specific muscle group
   */
  findByMuscleGroup(muscle: MuscleZone, includePrimary?: boolean, includeSecondary?: boolean, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;

  /**
   * Find exercises requiring specific equipment
   */
  findByEquipment(equipment: EquipmentCategory, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;

  /**
   * Find exercises by creator/author
   */
  findByCreator(creatorId: Types.ObjectId, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;

  /**
   * Find all published exercises
   */
  findPublished(options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;

  /**
   * Find draft exercises (optionally by creator)
   */
  findDrafts(creatorId?: Types.ObjectId, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;

  /**
   * Find exercises suitable for specific age
   */
  findByAge(age: number, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;

  /**
   * Find exercises that don't have contraindications for given conditions
   */
  findSafeForConditions(conditions: readonly string[], options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;

  /**
   * Find exercise variations for a base exercise
   */
  findVariations(exerciseId: Types.ObjectId): Promise<readonly Exercise[]>;

  /**
   * Find prerequisite exercises for a target exercise
   */
  findPrerequisites(exerciseId: Types.ObjectId): Promise<readonly Exercise[]>;

  /**
   * Search exercises by text (name, description, tags)
   */
  searchByText(query: string, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;

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

  /**
   * Create a new exercise
   */
  create(exercise: Omit<Exercise, NewEntity>): Promise<Exercise>;

  /**
   * Update existing exercise
   */
  update(id: Types.ObjectId, updates: Partial<Exercise>): Promise<Exercise | null>;

  /**
   * Archive exercise (soft delete)
   */
  archive(id: Types.ObjectId): Promise<boolean>;

  /**
   * Restore archived exercise
   */
  restore(id: Types.ObjectId): Promise<boolean>;

  /**
   * Delete exercise permanently
   */
  delete(id: Types.ObjectId): Promise<boolean>;

  /**
   * Count exercises matching criteria
   */
  count(criteria?: IExerciseSearchCriteria): Promise<number>;

  /**
   * Get comprehensive exercise statistics
   */
  getStatistics(): Promise<IExerciseStatistics>;

  /**
   * Check if exercise name is available (not duplicate)
   */
  isNameAvailable(name: string, excludeId?: Types.ObjectId): Promise<boolean>;

  /**
   * Find similar exercises based on muscle groups, type, and difficulty
   */
  findSimilar(exerciseId: Types.ObjectId, limit?: number): Promise<readonly Exercise[]>;

  /**
   * Get popular exercises based on usage metrics
   */
  findPopular(limit?: number, timeframe?: 'week' | 'month' | 'year'): Promise<readonly Exercise[]>;

  /**
   * Find recently created exercises
   */
  findRecent(limit?: number, daysBack?: number): Promise<readonly Exercise[]>;

  /**
   * Find exercises that need review (published but not reviewed)
   */
  findNeedingReview(options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;

  /**
   * Bulk operations
   */
  bulkCreate(exercises: ReadonlyArray<Omit<Exercise, NewEntity>>): Promise<readonly Exercise[]>;
  bulkUpdate(updates: ReadonlyArray<{ id: Types.ObjectId; updates: Partial<Exercise> }>): Promise<readonly Exercise[]>;
  bulkArchive(ids: readonly Types.ObjectId[]): Promise<boolean>;

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

