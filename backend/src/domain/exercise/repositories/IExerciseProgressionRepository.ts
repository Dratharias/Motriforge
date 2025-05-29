import { Types } from 'mongoose';
import { ExerciseProgression } from '../entities/ExerciseProgression';
import { Difficulty } from '../../../types/fitness/enums/exercise';
import { NewEntity } from '../../../types/core/interfaces';

/**
 * Repository interface for ExerciseProgression operations
 */
export interface IExerciseProgressionRepository {
  /**
   * Find progression by ID
   */
  findById(id: Types.ObjectId): Promise<ExerciseProgression | null>;

  /**
   * Find all progressions for an exercise
   */
  findByExerciseId(exerciseId: Types.ObjectId): Promise<readonly ExerciseProgression[]>;

  /**
   * Find progressions from specific difficulty level
   */
  findFromDifficulty(exerciseId: Types.ObjectId, difficulty: Difficulty): Promise<readonly ExerciseProgression[]>;

  /**
   * Find progressions to specific difficulty level
   */
  findToDifficulty(exerciseId: Types.ObjectId, difficulty: Difficulty): Promise<readonly ExerciseProgression[]>;

  /**
   * Find progressions between difficulty levels
   */
  findBetweenDifficulties(exerciseId: Types.ObjectId, fromDifficulty: Difficulty, toDifficulty: Difficulty): Promise<readonly ExerciseProgression[]>;

  /**
   * Find progressions that lead to different exercises
   */
  findExerciseTransitions(exerciseId: Types.ObjectId): Promise<readonly ExerciseProgression[]>;

  /**
   * Find progressions by target exercise
   */
  findByTargetExercise(targetExerciseId: Types.ObjectId): Promise<readonly ExerciseProgression[]>;

  /**
   * Find progressions by estimated time range
   */
  findByTimeRange(minDays: number, maxDays: number): Promise<readonly ExerciseProgression[]>;

  /**
   * Create new progression
   */
  create(progression: Omit<ExerciseProgression, NewEntity>): Promise<ExerciseProgression>;

  /**
   * Update existing progression
   */
  update(id: Types.ObjectId, updates: Partial<ExerciseProgression>): Promise<ExerciseProgression | null>;

  /**
   * Delete progression
   */
  delete(id: Types.ObjectId): Promise<boolean>;

  /**
   * Find complete progression path between difficulty levels
   */
  findProgressionPath(exerciseId: Types.ObjectId, from: Difficulty, to: Difficulty): Promise<readonly ExerciseProgression[]>;

  /**
   * Get ordered progressions for an exercise (by order field)
   */
  findOrderedProgressions(exerciseId: Types.ObjectId): Promise<readonly ExerciseProgression[]>;

  /**
   * Find progressions with specific criteria
   */
  findByCriteria(criteria: string): Promise<readonly ExerciseProgression[]>;

  /**
   * Find progressions with specific modifications
   */
  findByModifications(modification: string): Promise<readonly ExerciseProgression[]>;

  /**
   * Bulk operations for progressions
   */
  bulkCreate(progressions: ReadonlyArray<Omit<ExerciseProgression, NewEntity>>): Promise<readonly ExerciseProgression[]>;
  bulkUpdate(updates: ReadonlyArray<{ id: Types.ObjectId; updates: Partial<ExerciseProgression> }>): Promise<readonly ExerciseProgression[]>;
  bulkDelete(ids: readonly Types.ObjectId[]): Promise<boolean>;

  /**
   * Copy progressions from one exercise to another
   */
  copyProgressions(fromExerciseId: Types.ObjectId, toExerciseId: Types.ObjectId, createdBy: Types.ObjectId): Promise<readonly ExerciseProgression[]>;

  /**
   * Validate progression path
   */
  validateProgressionPath(exerciseId: Types.ObjectId, fromDifficulty: Difficulty, toDifficulty: Difficulty): Promise<boolean>;

  /**
   * Find circular progression dependencies
   */
  findCircularProgressions(exerciseId: Types.ObjectId): Promise<readonly Types.ObjectId[]>;

  /**
   * Get progression statistics
   */
  getProgressionStatistics(exerciseId?: Types.ObjectId): Promise<{
    totalProgressions: number;
    exerciseTransitions: number;
    averageEstimatedDays: number;
    progressionsByDifficulty: Record<string, number>;
    mostCommonCriteria: readonly string[];
    mostCommonModifications: readonly string[];
  }>;

  /**
   * Find next logical progression
   */
  findNextProgression(exerciseId: Types.ObjectId, currentDifficulty: Difficulty): Promise<ExerciseProgression | null>;

  /**
   * Find previous progression step
   */
  findPreviousProgression(exerciseId: Types.ObjectId, currentDifficulty: Difficulty): Promise<ExerciseProgression | null>;

  /**
   * Get progression difficulty ladder
   */
  getProgressionLadder(exerciseId: Types.ObjectId): Promise<readonly Difficulty[]>;

  /**
   * Reorder progressions
   */
  reorderProgressions(exerciseId: Types.ObjectId, progressionIds: readonly Types.ObjectId[]): Promise<boolean>;
}

