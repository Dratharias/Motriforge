// Common types used across multiple models

import { Types } from 'mongoose';
import { IUser } from './user';

/**
 * Base timestamp interface for all models
 */
export interface ITimestamps {
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Base model interface that all entities should extend
 */
export interface IBaseModel extends ITimestamps {
  readonly _id: Types.ObjectId;
}

/**
 * Organization context interface for multi-tenant models
 */
export interface IOrganizationContext {
  readonly organization: Types.ObjectId;
  readonly createdBy: Types.ObjectId;
  readonly isArchived: boolean;
}

/**
 * Sharing and visibility interface
 */
export interface ISharingContext {
  readonly shared: boolean;
  readonly organizationVisibility: string;
}

/**
 * Address interface for organizations and locations
 */
export interface IAddress {
  readonly street: string;
  readonly city: string;
  readonly state: string;
  readonly postalCode: string;
  readonly country: string;
  readonly coordinates?: {
    readonly latitude: number;
    readonly longitude: number;
  };
}

/**
 * Contact information interface
 */
export interface IContact {
  readonly phone: string;
  readonly email: string;
  readonly website?: string;
  readonly socialMedia?: {
    readonly facebook?: string;
    readonly instagram?: string;
    readonly twitter?: string;
    readonly linkedin?: string;
  };
}

/**
 * User preferences interface
 */
export interface IUserPreferences {
  readonly theme: string;
  readonly language: string;
  readonly measurementSystem: 'metric' | 'imperial';
  readonly workoutDisplayMode: 'standard' | 'compact';
  readonly emailNotifications: boolean;
  readonly pushNotifications: boolean;
}

/**
 * Privacy settings interface
 */
export interface IPrivacySettings {
  readonly profileVisibility: 'public' | 'organization' | 'private';
  readonly showWorkoutHistory: boolean;
  readonly showProgression: boolean;
  readonly allowDataAnalytics: boolean;
  readonly shareWithTrainers: boolean;
}

/**
 * Notification settings interface
 */
export interface INotificationSettings {
  readonly user: IUser;
  readonly workoutReminders: boolean;
  readonly achievementAlerts: boolean;
  readonly newMessages: boolean;
  readonly systemAnnouncements: boolean;
  readonly programUpdates: boolean;
  readonly trainerFeedback: boolean;
  readonly dailySummary: boolean;
  readonly marketingEmails: boolean;
  readonly mobileEnabled: boolean;
  readonly emailEnabled: boolean;
  readonly webEnabled: boolean;
  readonly quietHoursStart: number;
  readonly quietHoursEnd: number;
  readonly customCategories: Map<any, boolean>;
}

/**
 * Organization settings interface
 */
export interface IOrganizationSettings {
  readonly allowMemberInvites: boolean;
  readonly requireAdminApproval: boolean;
  readonly defaultMemberRole: string;
  readonly contentSharingLevel: string;
  readonly customBranding: {
    readonly logo?: string;
    readonly colors?: {
      readonly primary: string;
      readonly secondary: string;
      readonly accent: string;
    };
  };
}

/**
 * Organization statistics interface
 */
export interface IOrganizationStats {
  memberCount: number;
  exerciseCount: number;
  workoutCount: number;
  programCount: number;
  averageEngagement: number;
  lastActivityDate: Date;
}

/**
 * Metrics container interface for flexible metric storage
 */
export interface IMetricsContainer {
  readonly [key: string]: any;
}

/**
 * Progress metrics interface
 */
export interface IProgressMetrics {
  readonly percentage: number;
  readonly absoluteChange: number;
}

/**
 * Set data interface for exercise performance
 */
export interface ISetData {
  readonly workoutSessionExercise: Types.ObjectId;
  readonly isWarmupSet: boolean;
  readonly completedAt: Date;
  readonly notes: string;
  readonly restAfter: number;
  readonly isDropSet: boolean;
  readonly tempo: string;
  readonly setNumber: number;
  readonly weight?: number;
  readonly reps?: number;
  readonly distance?: number;
  readonly duration?: number;
  readonly rpe?: number;
}

/**
 * Milestone interface for goal tracking
 */
export interface IMilestone {
  readonly goalTracking: Types.ObjectId;
  readonly value: number;
  readonly targetDate: Date;
  readonly achievedDate?: Date;
  readonly isAchieved: boolean;
  readonly description: string;
}

/**
 * Performance context interface
 */
export interface IPerformanceContext {
  readonly workout?: Types.ObjectId;
  readonly workoutSession?: Types.ObjectId;
  readonly program?: Types.ObjectId;
  readonly notes?: string;
  readonly energyLevel?: number;
  readonly rpe?: number;
  readonly equipment?: Types.ObjectId;
  readonly sets?: ISetData[];
}

/**
 * Workout exercise metrics interface
 */
export interface IWorkoutExerciseMetrics {
  readonly rpe?: number;
  readonly tempo?: string;
  readonly restPause?: boolean;
  readonly failureType?: string;
  readonly percentOfOneRepMax?: number;
  readonly [key: string]: any;
}

/**
 * Workout session metrics interface
 */
export interface IWorkoutSessionMetrics {
  readonly totalVolume?: number;
  readonly totalCaloriesBurned?: number;
  readonly averageHeartRate?: number;
  readonly peakHeartRate?: number;
  readonly averageRPE?: number;
  readonly totalDistance?: number;
  readonly totalDuration?: number;
  readonly restTime?: number;
  readonly workTime?: number;
  readonly [key: string]: any;
}

/**
 * Workout session exercise metrics interface
 */
export interface IWorkoutSessionExerciseMetrics {
  readonly totalVolume?: number;
  readonly maxWeight?: number;
  readonly averageRPE?: number;
  readonly restTime?: number;
  readonly workTime?: number;
  readonly [key: string]: any;
}