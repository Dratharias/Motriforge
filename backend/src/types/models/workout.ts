// Workout and related types

import { Types } from 'mongoose';
import { IBaseModel, IOrganizationContext, ISharingContext, IWorkoutExerciseMetrics } from './common';
import { WorkoutGoal, BlockType, IntensityLevel } from './enums';

/**
 * Core workout interface
 */
export interface IWorkout extends IBaseModel, IOrganizationContext, ISharingContext {
  readonly name: string;
  readonly description: string;
  readonly durationInMinutes: number;
  readonly intensityLevel: Types.ObjectId;
  readonly goal: readonly Types.ObjectId[];
  readonly tags: readonly string[];
  readonly mediaIds: readonly Types.ObjectId[];
  readonly equipment: readonly Types.ObjectId[];
  readonly targetMuscleGroups: readonly string[];
  readonly prerequisites: readonly string[];
  readonly estimatedCalories: number;
  readonly isTemplate: boolean;
  readonly templateCategory: string;
  readonly subscribersCount: number;
}

/**
 * Workout block interface
 */
export interface IWorkoutBlock extends IBaseModel {
  readonly workoutId: Types.ObjectId;
  readonly title: string;
  readonly description: string;
  readonly blockType: BlockType;
  readonly position: number;
  readonly restBetweenBlocks: number;
  readonly rounds: number;
  readonly timeCap: number;
}

/**
 * Workout exercise interface
 */
export interface IWorkoutExercise extends IBaseModel {
  readonly workoutBlockId: Types.ObjectId;
  readonly exerciseId: Types.ObjectId;
  readonly sets: number;
  readonly reps: number | null;
  readonly weight: number | null;
  readonly time: number | null;
  readonly distance: number | null;
  readonly rest: number;
  readonly notes: string;
  readonly metrics: IWorkoutExerciseMetrics;
  readonly position: number;
  readonly alternativeExerciseIds: readonly Types.ObjectId[];
  readonly isRequired: boolean;
}

/**
 * Workout goal info interface
 */
export interface IWorkoutGoalInfo extends IBaseModel {
  readonly goal: WorkoutGoal;
  readonly subGoal: WorkoutGoal;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly color: string;
  readonly recommendedFrequency: string;
  readonly recommendedDuration: string;
  readonly recommendedIntensity: string;
  readonly recommendedRecovery: string;
  readonly bestMetrics: readonly string[];
}

/**
 * Block type info interface
 */
export interface IBlockTypeInfo extends IBaseModel {
  readonly type: BlockType;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly color: string;
  readonly recommendedPosition: string;
  readonly typicalDuration: string;
  readonly typicalRestPeriod: string;
  readonly structure: string;
  readonly bestFor: readonly string[];
}

/**
 * Intensity level info interface
 */
export interface IIntensityLevelInfo extends IBaseModel {
  readonly level: IntensityLevel;
  readonly label: string;
  readonly description: string;
  readonly heartRatePercent: string;
  readonly perceivedExertion: string;
  readonly color: string;
  readonly icon: string;
  readonly targetHeartRateZoneMin: number;
  readonly targetHeartRateZoneMax: number;
}