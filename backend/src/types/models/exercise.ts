// Exercise and related types

import { Types } from 'mongoose';
import { IBaseModel, IOrganizationContext, ISharingContext } from './common';
import { DifficultyLevel, ExerciseType } from './enums';

/**
 * Core exercise interface
 */
export interface IExercise extends IBaseModel, IOrganizationContext, ISharingContext {
  readonly name: string;
  readonly description: string;
  readonly instructions: string;
  readonly muscleGroups: readonly string[];
  readonly primaryMuscleGroup: string;
  readonly equipment: readonly Types.ObjectId[];
  readonly exerciseType: Types.ObjectId;
  readonly difficulty: Types.ObjectId;
  readonly mediaIds: readonly Types.ObjectId[];
  readonly prerequisites: readonly string[];
  readonly formCues: readonly string[];
  readonly commonMistakes: readonly string[];
  readonly tags: readonly string[];
  readonly workoutsCount: number;
}

/**
 * Exercise alternative interface
 */
export interface IExerciseAlternative extends IBaseModel {
  readonly exerciseId: Types.ObjectId;
  readonly alternativeExerciseId: Types.ObjectId;
  readonly reason: string;
  readonly notes: string;
  readonly accommodates: readonly string[];
  readonly similarityScore: number;
  readonly createdBy: Types.ObjectId;
}

/**
 * Exercise progression interface
 */
export interface IExerciseProgression extends IBaseModel {
  readonly exerciseId: Types.ObjectId;
  readonly progressionExerciseId: Types.ObjectId;
  readonly notes: string;
  readonly modifications: readonly string[];
  readonly isEasier: boolean;
  readonly progressionOrder: number;
  readonly difficultyDelta: number;
  readonly createdBy: Types.ObjectId;
}

/**
 * Exercise swap interface
 */
export interface IExerciseSwap extends IBaseModel {
  readonly originalExerciseId: Types.ObjectId;
  readonly replacementExerciseId: Types.ObjectId;
  readonly userId: Types.ObjectId;
  readonly workoutId?: Types.ObjectId;
  readonly programId?: Types.ObjectId;
  readonly sessionId?: string;
  readonly reason: string;
  readonly permanent: boolean;
  readonly swappedAt: Date;
}

/**
 * Exercise metric interface
 */
export interface IExerciseMetric extends IBaseModel {
  readonly name: string;
  readonly unit: Types.ObjectId;
  readonly defaultValue: number;
  readonly exerciseId: Types.ObjectId;
  readonly isStandard: boolean;
  readonly minValue: number;
  readonly maxValue: number;
  readonly increment: number;
}

/**
 * Exercise type info interface
 */
export interface IExerciseTypeInfo extends IBaseModel {
  readonly type: ExerciseType;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly color: string;
  readonly primaryMetrics: readonly string[];
  readonly recommendedEquipment: readonly string[];
}

/**
 * Difficulty level info interface
 */
export interface IDifficultyLevelInfo extends IBaseModel {
  readonly level: DifficultyLevel;
  readonly label: string;
  readonly description: string;
  readonly experienceMonths: number;
  readonly color: string;
  readonly icon: string;
  readonly criteria: readonly string[];
  readonly nextSteps: readonly string[];
}

/**
 * Metric type info interface
 */
export interface IMetricTypeInfo extends IBaseModel {
  readonly type: string;
  readonly label: string;
  readonly description: string;
  readonly unit: string;
  readonly alternateUnits: readonly string[];
  readonly icon: string;
  readonly color: string;
  readonly minValue: number;
  readonly maxValue: number;
  readonly defaultIncrement: number;
  readonly bestForExerciseTypes: readonly string[];
}