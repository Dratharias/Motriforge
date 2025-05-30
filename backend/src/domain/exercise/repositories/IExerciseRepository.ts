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

export interface IExerciseRepository {
  findById(id: Types.ObjectId, options?: IExerciseQueryOptions): Promise<Exercise | null>;
  findByCriteria(criteria: IExerciseSearchCriteria, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findByType(type: ExerciseType, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findByDifficulty(difficulty: Difficulty, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  
  // Simplified muscle group search - searches both primary and secondary muscles
  findByMuscleGroup(muscle: MuscleZone, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  
  findByEquipment(equipment: EquipmentCategory, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findByCreator(creatorId: Types.ObjectId, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findPublished(options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findDrafts(creatorId?: Types.ObjectId, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findSafeForConditions(conditions: readonly string[], options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findVariations(exerciseId: Types.ObjectId): Promise<readonly Exercise[]>;
  findPrerequisites(exerciseId: Types.ObjectId): Promise<readonly Exercise[]>;
  searchByText(query: string, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findByTags(tags: readonly string[], matchAll?: boolean, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findByDuration(minDuration: number, maxDuration: number, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findBodyweightExercises(options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findWithMedia(options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
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
  findNeedingReview(options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  
  bulkCreate(exercises: ReadonlyArray<Omit<Exercise, NewEntity>>): Promise<readonly Exercise[]>;
  bulkUpdate(updates: ReadonlyArray<{ id: Types.ObjectId; updates: Partial<Exercise> }>): Promise<readonly Exercise[]>;
  bulkArchive(ids: readonly Types.ObjectId[]): Promise<boolean>;
  
  findByComplexity(minComplexity: number, maxComplexity: number, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  
  // More specific muscle group methods for granular control when needed
  findByMuscleGroups(primaryMuscles: readonly MuscleZone[], secondaryMuscles?: readonly MuscleZone[], options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findByPrimaryMuscles(muscles: readonly MuscleZone[], options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  findBySecondaryMuscles(muscles: readonly MuscleZone[], options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  
  findByEquipmentList(equipment: readonly EquipmentCategory[], requireAll?: boolean, options?: IExerciseQueryOptions): Promise<readonly Exercise[]>;
  
  getExercisesByType(): Promise<Record<ExerciseType, number>>;
  getExercisesByDifficulty(): Promise<Record<Difficulty, number>>;
  getExercisesByMuscleGroup(): Promise<Record<MuscleZone, number>>;
  getAverageDurationByType(): Promise<Record<ExerciseType, number>>;
  
  validateExerciseData(exercise: Partial<Exercise>): Promise<readonly string[]>;
  checkPrerequisiteChain(exerciseId: Types.ObjectId): Promise<boolean>;
  findCircularPrerequisites(exerciseId: Types.ObjectId): Promise<readonly Types.ObjectId[]>;
}