// Coaching and trainer-client relationship types

import { Types } from 'mongoose';
import { IBaseModel } from './common';
import { 
  RelationshipStatus, 
  AlertType, 
  AlertSeverity, 
  SessionType, 
  CoachingSessionStatus 
} from './enums';

/**
 * Client-coach relationship interface
 */
export interface IClientCoachRelationship extends IBaseModel {
  readonly client: Types.ObjectId;
  readonly coach: Types.ObjectId;
  readonly startDate: Date;
  readonly endDate?: Date;
  readonly status: RelationshipStatus;
  readonly permissions: Types.ObjectId;
  readonly notes: string;
  readonly terminationReason?: string;
  readonly terminatedBy?: Types.ObjectId;
  readonly lastInteractionDate?: Date;
}

/**
 * Coaching session interface
 */
export interface ICoachingSession extends IBaseModel {
  readonly client: Types.ObjectId;
  readonly coach: Types.ObjectId;
  readonly scheduledDate: Date;
  readonly duration: number;
  readonly type: SessionType;
  readonly status: CoachingSessionStatus;
  readonly notes: string;
  readonly focusAreas: readonly string[];
  readonly goals: readonly string[];
  readonly outcomes: readonly string[];
  readonly sessionRecording?: Types.ObjectId;
  readonly preparationNotes?: string;
  readonly followupRequired: boolean;
  readonly followupCompleted: boolean;
  readonly location?: string;
  readonly isVirtual: boolean;
  readonly meetingLink?: string;
  readonly reminderSent: boolean;
  readonly cancellationReason?: string;
  readonly cancelledBy?: Types.ObjectId;
  readonly feedbackProvided: boolean;
  readonly clientFeedbackRating?: number;
}

/**
 * Client alert interface
 */
export interface IClientAlert extends IBaseModel {
  readonly client: Types.ObjectId;
  readonly trainer: Types.ObjectId;
  readonly alertType: AlertType;
  readonly date: Date;
  readonly message: string;
  readonly severity: AlertSeverity;
  readonly isResolved: boolean;
  readonly resolvedBy?: Types.ObjectId;
  readonly resolvedDate?: Date;
  readonly resolutionNotes?: string;
  readonly relatedEntity?: {
    readonly type: string;
    readonly id: Types.ObjectId;
  };
  readonly requiresAction: boolean;
  readonly notificationSent: boolean;
  readonly snoozeUntil?: Date;
}

/**
 * Permission set interface
 */
export interface IPermissionSet extends IBaseModel {
  readonly viewWorkoutHistory: boolean;
  readonly viewProgressionData: boolean;
  readonly viewPersonalData: boolean;
  readonly assignWorkouts: boolean;
  readonly assignPrograms: boolean;
  readonly modifyWorkouts: boolean;
  readonly viewActivityStatus: boolean;
  readonly canContactOutsideHours: boolean;
  readonly viewNutritionData: boolean;
  readonly provideFeedback: boolean;
  readonly modifyGoals: boolean;
  readonly exportClientData: boolean;
}

/**
 * Training feedback interface
 */
export interface ITrainingFeedback extends IBaseModel {
  readonly client: Types.ObjectId;
  readonly coach: Types.ObjectId;
  readonly workoutSession: Types.ObjectId;
  readonly date: Date;
  readonly feedbackText: string;
  readonly correctionNotes: string;
  readonly formComments: string;
  readonly performanceRating: number;
  readonly progressionSuggestions: string;
  readonly mediaNotes: readonly Types.ObjectId[];
  readonly wasReviewed: boolean;
  readonly reviewDate?: Date;
  readonly exerciseFeedback?: Map<string, string>;
}

/**
 * Trainer profile interface
 */
export interface ITrainerProfile extends IBaseModel {
  readonly user: Types.ObjectId;
  readonly specializations: readonly string[];
  readonly certifications: readonly Types.ObjectId[];
  readonly experience: number;
  readonly bio: string;
  readonly rating: number;
  readonly availabilitySchedule: Record<string, any>;
  readonly clientLimit: number;
  readonly activeClientCount: number;
  readonly hourlyRate?: number;
  readonly portfolio?: string;
  readonly featured: boolean;
  readonly isAcceptingClients: boolean;
  readonly socialMedia?: Record<string, string>;
}

/**
 * Client overview interface for dashboard
 */
export interface IClientOverview {
  readonly client: Types.ObjectId;
  readonly lastActivity: Date;
  readonly adherenceScore: number;
  readonly missedWorkouts: number;
  readonly completedWorkouts: number;
  readonly nextSession?: Date;
  readonly activeAlerts: number;
  readonly progressMetrics: Map<string, number>;
  readonly notes: string;
}

/**
 * Trainer dashboard interface
 */
export interface ITrainerDashboard extends IBaseModel {
  readonly trainer: Types.ObjectId;
  readonly lastUpdated: Date;
  readonly clientOverviews: readonly IClientOverview[];
  readonly upcomingSessions: readonly Types.ObjectId[];
  readonly pendingFeedback: readonly Types.ObjectId[];
  readonly clientAlerts: readonly Types.ObjectId[];
  readonly recentActivities: readonly Types.ObjectId[];
  readonly savedFilters: Map<string, any>;
  readonly favoriteClients: readonly Types.ObjectId[];
  readonly activePrograms: number;
  readonly completedPrograms: number;
  readonly averageClientAdherence: number;
}

/**
 * Relationship status info interface
 */
export interface IRelationshipStatusInfo extends IBaseModel {
  readonly status: RelationshipStatus;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly color: string;
  readonly allowedActions: readonly string[];
  readonly clientPermissions: boolean;
  readonly trainerPermissions: boolean;
  readonly recommendedFollowUp: string;
}