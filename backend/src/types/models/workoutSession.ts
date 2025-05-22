// Workout session and execution related types

import { Types } from 'mongoose';
import { IBaseModel, IWorkoutSessionMetrics, IWorkoutSessionExerciseMetrics } from './common';
import { SessionStatus } from './enums';

/**
 * Core workout session interface
 */
export interface IWorkoutSession extends IBaseModel {
  readonly user: Types.ObjectId;
  readonly workout: Types.ObjectId;
  readonly program?: Types.ObjectId;
  readonly activeProgram?: Types.ObjectId;
  readonly startTime: Date;
  readonly endTime?: Date;
  readonly duration: number;
  readonly status: SessionStatus;
  readonly completionPercentage: number;
  readonly metrics: IWorkoutSessionMetrics;
  readonly notes: string;
  readonly rating?: number;
  readonly perceivedDifficulty?: number;
  readonly energyLevel?: number;
  readonly location?: string;
  readonly deviceInfo?: string;
  readonly mediaIds?: readonly Types.ObjectId[];
  readonly feedback?: string;
  readonly wasModified: boolean;
  readonly wasGuided: boolean;
}

/**
 * Workout session exercise interface
 */
export interface IWorkoutSessionExercise extends IBaseModel {
  readonly workoutSession: Types.ObjectId;
  readonly exercise: Types.ObjectId;
  readonly originalWorkoutExercise?: Types.ObjectId;
  readonly sets: readonly Types.ObjectId[];
  readonly order: number;
  readonly startTime?: Date;
  readonly endTime?: Date;
  readonly duration?: number;
  readonly wasSubstituted: boolean;
  readonly substitutionReason?: string;
  readonly metrics: IWorkoutSessionExerciseMetrics;
  readonly notes: string;
  readonly completed: boolean;
  readonly skipped: boolean;
  readonly mediaIds?: readonly Types.ObjectId[];
}
