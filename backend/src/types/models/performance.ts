// Performance tracking and progression related types

import { Types } from 'mongoose';
import { IBaseModel, IPerformanceContext, IProgressMetrics, IMilestone } from './common';
import { MetricType, GoalStatus } from './enums';

/**
 * Metric snapshot interface
 */
export interface IMetricSnapshot {
  readonly date: Date;
  readonly metrics: Map<string, number>;
}

/**
 * Daily performance interface
 */
export interface IDailyPerformance extends IBaseModel {
  readonly user: Types.ObjectId;
  readonly exercise: Types.ObjectId;
  readonly progressionTracking: Types.ObjectId;
  readonly date: Date;
  readonly metrics: Map<string, number>;
  readonly context: IPerformanceContext;
}

/**
 * Progression tracking interface
 */
export interface IProgressionTracking extends IBaseModel {
  readonly user: Types.ObjectId;
  readonly exercise: Types.ObjectId;
  readonly trackedMetrics: readonly MetricType[];
  readonly firstRecorded: IMetricSnapshot;
  readonly lastRecorded: IMetricSnapshot;
  readonly overallProgress: Record<string, IProgressMetrics>;
}

/**
 * Personal record interface
 */
export interface IPersonalRecord extends IBaseModel {
  readonly user: Types.ObjectId;
  readonly exercise: Types.ObjectId;
  readonly metric: string;
  readonly value: number;
  readonly date: Date;
  readonly previousRecord?: number;
  readonly improvement?: number;
  readonly improvementPercentage?: number;
  readonly context: Record<string, any>;
}

/**
 * Goal tracking interface
 */
export interface IGoalTracking extends IBaseModel {
  readonly user: Types.ObjectId;
  readonly exercise: Types.ObjectId;
  readonly metric: string;
  readonly targetValue: number;
  readonly startValue: number;
  readonly currentValue: number;
  readonly deadline: Date;
  readonly milestones: readonly IMilestone[];
  readonly progressPercentage: number;
  readonly strategies: readonly string[];
  readonly isAchieved: boolean;
  readonly achievedDate?: Date;
  readonly createdBy: Types.ObjectId;
  readonly trainer?: Types.ObjectId;
}

/**
 * Milestone interface (standalone)
 */
export interface IMilestoneStandalone extends IBaseModel {
  readonly goalTracking: Types.ObjectId;
  readonly value: number;
  readonly targetDate: Date;
  readonly achievedDate?: Date;
  readonly isAchieved: boolean;
  readonly description?: string;
}

/**
 * Goal status info interface
 */
export interface IGoalStatusInfo extends IBaseModel {
  readonly status: GoalStatus;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly color: string;
  readonly progressRequired: number;
  readonly recommendedActions: readonly string[];
  readonly alertLevel: string;
}