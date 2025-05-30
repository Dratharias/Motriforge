import { Types } from 'mongoose';
import { MuscleZone, ExerciseType } from '../../../types/fitness/enums/exercise';

/**
 * Maps exercise to its difficulty order within a category
 */
export interface IExerciseOrder {
  readonly exerciseId: Types.ObjectId;
  readonly difficultyOrder: number; // 1 = easiest, higher = harder
  readonly verified: boolean; // Has this ordering been validated?
  readonly createdAt: Date;
  readonly createdBy: Types.ObjectId;
}

/**
 * Groups exercises by category (e.g., "push-ups", "squats", "planks")
 */
export interface IExerciseVariant {
  readonly id: Types.ObjectId;
  readonly category: string; // "push-ups", "squats", "planks", etc.
  readonly description: string;
  readonly primaryMuscles: readonly MuscleZone[];
  readonly exerciseType: ExerciseType;
  readonly exercises: readonly IExerciseOrder[]; // Ordered from easiest to hardest
  readonly verified: boolean; // Has this variant been professionally validated?
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly createdBy: Types.ObjectId;
}

/**
 * Enhanced progression/regression/alternative system
 */
export interface IExerciseProgression {
  readonly exerciseId: Types.ObjectId;
  readonly difficultyOrder: number; // Current position in variant
  readonly regressions: readonly IExerciseOrder[]; // Easier variants (order < current)
  readonly progressions: readonly IExerciseOrder[]; // Harder variants (order > current)
  readonly alternatives: readonly Types.ObjectId[]; // Different categories, similar muscles
  readonly lastUpdated: Date;
}

