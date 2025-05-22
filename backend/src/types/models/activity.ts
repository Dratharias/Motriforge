// Activity and tracking related types

import { Types } from 'mongoose';
import { IBaseModel } from './common';
import { ActivityAction, TimeResolution } from './enums';

/**
 * Active workout interface
 */
export interface IActiveWorkout {
  readonly workoutId: Types.ObjectId;
  readonly startedAt: Date;
  readonly lastUpdatedAt: Date;
  readonly completionPercentage: number;
  readonly notes: string;
}

/**
 * Active program interface
 */
export interface IActiveProgram {
  readonly programId: Types.ObjectId;
  readonly startedAt: Date;
  readonly currentDay: number;
  readonly completedWorkouts: readonly Types.ObjectId[];
  readonly lastCompletedDate: Date;
  readonly adherencePercentage: number;
  readonly notes: string;
}

/**
 * Core activity interface
 */
export interface IActivity extends IBaseModel {
  readonly user: Types.ObjectId;
  readonly subscribedWorkouts: readonly Types.ObjectId[];
  readonly subscribedPrograms: readonly Types.ObjectId[];
  readonly activeWorkout: IActiveWorkout | null;
  readonly activeProgram: IActiveProgram | null;
  readonly totalWorkoutsCompleted: number;
  readonly totalWorkoutDuration: number;
  readonly lastWorkoutDate: Date;
  readonly streak: number;
  readonly longestStreak: number;
}

/**
 * Activity entry interface
 */
export interface IActivityEntry extends IBaseModel {
  readonly user: Types.ObjectId;
  readonly activityId: Types.ObjectId;
  readonly targetModel: string;
  readonly targetId: Types.ObjectId;
  readonly action: ActivityAction;
  readonly timestamp: Date;
  readonly duration?: number;
  readonly progress?: number;
  readonly meta: Record<string, any>;
}

/**
 * Favorite interface
 */
export interface IFavorite extends IBaseModel {
  readonly user: Types.ObjectId;
  readonly exercises: readonly Types.ObjectId[];
  readonly workouts: readonly Types.ObjectId[];
  readonly programs: readonly Types.ObjectId[];
  readonly swaps: readonly Types.ObjectId[];
  readonly theme: string;
}

/**
 * Time resolution info interface
 */
export interface ITimeResolutionInfo extends IBaseModel {
  readonly resolution: TimeResolution;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly color: string;
  readonly durationInDays: number;
  readonly format: string;
  readonly recommendedUse: string;
}

/**
 * Activity action info interface
 */
export interface IActivityActionInfo extends IBaseModel {
  readonly action: ActivityAction;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly color: string;
  readonly category: string;
  readonly points: number;
  readonly requiresVerification: boolean;
  readonly notifiable: boolean;
  readonly displayInFeed: boolean;
}
