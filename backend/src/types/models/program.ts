// Program and related types

import { Types } from 'mongoose';
import { IBaseModel, IOrganizationContext, ISharingContext } from './common';
import { AssignmentStatus } from './enums';

/**
 * Program target exercise interface
 */
export interface IProgramTargetExercise {
  readonly exerciseId: Types.ObjectId;
  readonly targetMetrics: Record<string, any>;
  readonly progressionPlan: string;
}

/**
 * Core program interface
 */
export interface IProgram extends IBaseModel, IOrganizationContext, ISharingContext {
  readonly name: string;
  readonly description: string;
  readonly durationInWeeks: number;
  readonly goal: Types.ObjectId;
  readonly subgoals: readonly Types.ObjectId[];
  readonly targetExercises: readonly IProgramTargetExercise[];
  readonly targetMetrics: Record<string, any>;
  readonly tags: readonly string[];
  readonly mediaIds: readonly Types.ObjectId[];
  readonly isTemplate: boolean;
  readonly subscribersCount: number;
}

/**
 * Program schedule item interface
 */
export interface IProgramScheduleItem extends IBaseModel {
  readonly programId: Types.ObjectId;
  readonly day: number;
  readonly workoutId: Types.ObjectId;
  readonly notes: string;
  readonly isOptional: boolean;
  readonly restDay: boolean;
  readonly alternateWorkoutIds: readonly Types.ObjectId[];
  readonly week: number;
  readonly dayOfWeek: number;
}

/**
 * Program assignment interface
 */
export interface IProgramAssignment extends IBaseModel {
  readonly client: Types.ObjectId;
  readonly program: Types.ObjectId;
  readonly assignedBy: Types.ObjectId;
  readonly assignedDate: Date;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly status: AssignmentStatus;
  readonly modifications: readonly Types.ObjectId[];
  readonly notes: string;
  readonly progressPercentage: number;
  readonly adherenceScore: number;
  readonly lastActivity: Date;
  readonly feedbackRequestDate?: Date;
}

/**
 * Program modification interface
 */
export interface IProgramModification extends IBaseModel {
  readonly programAssignment: Types.ObjectId;
  readonly originalExercise: Types.ObjectId;
  readonly replacementExercise: Types.ObjectId;
  readonly reason: string;
  readonly modifiedBy: Types.ObjectId;
  readonly modificationDate: Date;
  readonly programDay?: number;
  readonly workoutBlock?: Types.ObjectId;
  readonly applyToFutureSessions: boolean;
  readonly notes?: string;
}