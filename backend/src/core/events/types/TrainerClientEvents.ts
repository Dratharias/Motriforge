import { DomainEvent } from '../models/DomainEvent';
import { EventType, EventNamespace, EventAction } from './EventType';

/**
 * Trainer-client relationship event types
 */
export enum TrainerClientEventTypes {
  // Relationship events
  RELATIONSHIP_REQUESTED = 'trainer.client.relationship.requested',
  RELATIONSHIP_ACCEPTED = 'trainer.client.relationship.accepted',
  RELATIONSHIP_DECLINED = 'trainer.client.relationship.declined',
  RELATIONSHIP_TERMINATED = 'trainer.client.relationship.terminated',
  RELATIONSHIP_PAUSED = 'trainer.client.relationship.paused',
  RELATIONSHIP_RESUMED = 'trainer.client.relationship.resumed',
  
  // Program assignment events
  PROGRAM_ASSIGNED = 'trainer.client.program.assigned',
  PROGRAM_MODIFIED = 'trainer.client.program.modified',
  PROGRAM_COMPLETED = 'trainer.client.program.completed',
  PROGRAM_CANCELLED = 'trainer.client.program.cancelled',
  
  // Feedback events
  FEEDBACK_SUBMITTED = 'trainer.client.feedback.submitted',
  FEEDBACK_REVIEWED = 'trainer.client.feedback.reviewed',
  
  // Session events
  SESSION_SCHEDULED = 'trainer.client.session.scheduled',
  SESSION_RESCHEDULED = 'trainer.client.session.rescheduled',
  SESSION_CANCELLED = 'trainer.client.session.cancelled',
  SESSION_COMPLETED = 'trainer.client.session.completed',
  
  // Permission events
  PERMISSIONS_UPDATED = 'trainer.client.permissions.updated',
  
  // Alert events
  CLIENT_ALERT_CREATED = 'trainer.client.alert.created',
  CLIENT_ALERT_RESOLVED = 'trainer.client.alert.resolved',
  
  // Profile events
  TRAINER_PROFILE_UPDATED = 'trainer.client.trainer.profile.updated',
  TRAINER_CERTIFICATION_ADDED = 'trainer.client.trainer.certification.added'
}

/**
 * Relationship status values
 */
export enum RelationshipStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  PAUSED = 'paused',
  TERMINATED = 'terminated',
  EXPIRED = 'expired'
}

/**
 * Assignment status values
 */
export enum AssignmentStatus {
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  MODIFIED = 'modified'
}

/**
 * Session status values
 */
export enum SessionStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  RESCHEDULED = 'rescheduled'
}

/**
 * Session type values
 */
export enum SessionType {
  ASSESSMENT = 'assessment',
  TRAINING = 'training',
  REVIEW = 'review',
  GOAL_SETTING = 'goal_setting',
  NUTRITION = 'nutrition',
  RECOVERY = 'recovery'
}

/**
 * Alert type values
 */
export enum AlertType {
  MISSED_WORKOUT = 'missed_workout',
  PERFORMANCE_DECLINE = 'performance_decline',
  GOAL_ACHIEVED = 'goal_achieved',
  INJURY_REPORTED = 'injury_reported',
  PROGRAM_COMPLETED = 'program_completed',
  INACTIVITY = 'inactivity'
}

/**
 * Alert severity values
 */
export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Client-coach relationship data
 */
export interface RelationshipData {
  /** ID of the relationship */
  id: string;
  
  /** Client user ID */
  clientId: string;
  
  /** Coach user ID */
  coachId: string;
  
  /** When the relationship started */
  startDate: Date;
  
  /** When the relationship ended (if applicable) */
  endDate?: Date;
  
  /** Current status of the relationship */
  status: RelationshipStatus;
  
  /** Permission set ID for this relationship */
  permissionSetId: string;
  
  /** Additional notes about the relationship */
  notes?: string;
  
  /** Reason for termination (if applicable) */
  terminationReason?: string;
  
  /** ID of user who terminated the relationship (if applicable) */
  terminatedBy?: string;
}

/**
 * Program assignment data
 */
export interface ProgramAssignmentData {
  /** ID of the assignment */
  id: string;
  
  /** Client user ID */
  clientId: string;
  
  /** Assigned program ID */
  programId: string;
  
  /** User ID of coach who assigned the program */
  assignedBy: string;
  
  /** When the program was assigned */
  assignedDate: Date;
  
  /** When the program should start */
  startDate: Date;
  
  /** When the program should end */
  endDate: Date;
  
  /** Current status of the assignment */
  status: AssignmentStatus;
  
  /** Additional notes about the assignment */
  notes?: string;
  
  /** Program modifications if any */
  modifications?: Array<{
    originalExerciseId: string;
    replacementExerciseId: string;
    reason: string;
  }>;
}

/**
 * Training feedback data
 */
export interface TrainingFeedbackData {
  /** ID of the feedback */
  id: string;
  
  /** Client user ID */
  clientId: string;
  
  /** Coach user ID */
  coachId: string;
  
  /** Workout session ID this feedback relates to */
  workoutSessionId: string;
  
  /** Date of the feedback */
  date: Date;
  
  /** Main feedback text */
  feedbackText: string;
  
  /** Notes about form corrections */
  correctionNotes?: string;
  
  /** Comments on form execution */
  formComments?: string;
  
  /** Performance rating (1-10) */
  performanceRating?: number;
  
  /** Suggestions for progression */
  progressionSuggestions?: string;
  
  /** Whether the feedback was reviewed by the client */
  wasReviewed: boolean;
  
  /** When the feedback was reviewed (if applicable) */
  reviewDate?: Date;
  
  /** Exercise-specific feedback */
  exerciseFeedback?: Record<string, string>;
}

/**
 * Coaching session data
 */
export interface CoachingSessionData {
  /** ID of the session */
  id: string;
  
  /** Client user ID */
  clientId: string;
  
  /** Coach user ID */
  coachId: string;
  
  /** Date the session is scheduled for */
  scheduledDate: Date;
  
  /** Duration in minutes */
  duration: number;
  
  /** Type of session */
  type: SessionType;
  
  /** Current status of the session */
  status: SessionStatus;
  
  /** Focus areas for the session */
  focusAreas?: string[];
  
  /** Goals for the session */
  goals?: string[];
  
  /** Outcomes of the session */
  outcomes?: string[];
  
  /** Session location */
  location?: string;
  
  /** Whether the session is virtual */
  isVirtual: boolean;
  
  /** Virtual meeting link (if applicable) */
  meetingLink?: string;
  
  /** Cancellation reason (if applicable) */
  cancellationReason?: string;
  
  /** User ID of who cancelled (if applicable) */
  cancelledBy?: string;
}

/**
 * Client alert data
 */
export interface ClientAlertData {
  /** ID of the alert */
  id: string;
  
  /** Client user ID */
  clientId: string;
  
  /** Trainer user ID */
  trainerId: string;
  
  /** Type of alert */
  alertType: AlertType;
  
  /** Date the alert was triggered */
  date: Date;
  
  /** Alert message */
  message: string;
  
  /** Alert severity */
  severity: AlertSeverity;
  
  /** Whether the alert has been resolved */
  isResolved: boolean;
  
  /** User ID of who resolved the alert (if applicable) */
  resolvedBy?: string;
  
  /** When the alert was resolved (if applicable) */
  resolvedDate?: Date;
  
  /** Notes about resolution (if applicable) */
  resolutionNotes?: string;
  
  /** Whether the alert requires action */
  requiresAction: boolean;
}

/**
 * Permission data
 */
export interface PermissionData {
  /** ID of the permission set */
  id: string;
  
  /** Whether trainer can view workout history */
  viewWorkoutHistory: boolean;
  
  /** Whether trainer can view progression data */
  viewProgressionData: boolean;
  
  /** Whether trainer can view personal data */
  viewPersonalData: boolean;
  
  /** Whether trainer can assign workouts */
  assignWorkouts: boolean;
  
  /** Whether trainer can assign programs */
  assignPrograms: boolean;
  
  /** Whether trainer can modify workouts */
  modifyWorkouts: boolean;
  
  /** Whether trainer can view activity status */
  viewActivityStatus: boolean;
  
  /** Whether trainer can contact outside defined hours */
  canContactOutsideHours: boolean;
  
  /** Whether trainer can view nutrition data */
  viewNutritionData: boolean;
  
  /** Whether trainer can provide feedback */
  provideFeedback: boolean;
  
  /** Whether trainer can modify goals */
  modifyGoals: boolean;
}

/**
 * Event for when a client-coach relationship is created
 */
export class RelationshipAcceptedEvent extends DomainEvent<RelationshipData> {
  constructor(data: {
    clientId: string;
    coachId: string;
    relationshipData: RelationshipData;
  }) {
    super({
      type: TrainerClientEventTypes.RELATIONSHIP_ACCEPTED as unknown as EventType,
      entityType: 'client-coach-relationship',
      entityId: data.relationshipData.id,
      action: 'relationship.accepted',
      data: data.relationshipData,
      userId: data.clientId // Action is performed by the client
    });
  }
}

/**
 * Event for when a program is assigned to a client
 */
export class ProgramAssignedEvent extends DomainEvent<ProgramAssignmentData> {
  constructor(data: {
    clientId: string;
    coachId: string;
    assignmentData: ProgramAssignmentData;
  }) {
    super({
      type: TrainerClientEventTypes.PROGRAM_ASSIGNED as EventType,
      entityType: 'program-assignment',
      entityId: data.assignmentData.id,
      action: 'program.assigned',
      data: data.assignmentData,
      userId: data.coachId // Action is performed by the coach
    });
  }
}

/**
 * Event for when a trainer provides feedback
 */
export class FeedbackSubmittedEvent extends DomainEvent<TrainingFeedbackData> {
  constructor(data: {
    clientId: string;
    coachId: string;
    feedbackData: TrainingFeedbackData;
  }) {
    super({
      type: TrainerClientEventTypes.FEEDBACK_SUBMITTED as EventType,
      entityType: 'training-feedback',
      entityId: data.feedbackData.id,
      action: 'feedback.submitted',
      data: data.feedbackData,
      userId: data.coachId // Action is performed by the coach
    });
  }
}

/**
 * Event for when feedback is reviewed by client
 */
export class FeedbackReviewedEvent extends DomainEvent<TrainingFeedbackData> {
  constructor(data: {
    clientId: string;
    coachId: string;
    feedbackData: TrainingFeedbackData;
  }) {
    super({
      type: TrainerClientEventTypes.FEEDBACK_REVIEWED as EventType,
      entityType: 'training-feedback',
      entityId: data.feedbackData.id,
      action: 'feedback.reviewed',
      data: data.feedbackData,
      userId: data.clientId // Action is performed by the client
    });
  }
}

/**
 * Event for when a coaching session is scheduled
 */
export class SessionScheduledEvent extends DomainEvent<CoachingSessionData> {
  constructor(data: {
    clientId: string;
    coachId: string;
    sessionData: CoachingSessionData;
  }) {
    super({
      type: TrainerClientEventTypes.SESSION_SCHEDULED as EventType,
      entityType: 'coaching-session',
      entityId: data.sessionData.id,
      action: 'session.scheduled',
      data: data.sessionData,
      userId: data.coachId // Action is typically performed by the coach
    });
  }
}

/**
 * Event for when a client alert is created
 */
export class ClientAlertCreatedEvent extends DomainEvent<ClientAlertData> {
  constructor(data: {
    clientId: string;
    trainerId: string;
    alertData: ClientAlertData;
  }) {
    super({
      type: TrainerClientEventTypes.CLIENT_ALERT_CREATED as EventType,
      entityType: 'client-alert',
      entityId: data.alertData.id,
      action: 'alert.created',
      data: data.alertData,
      userId: data.trainerId // Typically created by the system but attributed to trainer
    });
  }
}

/**
 * Event for when a client alert is resolved
 */
export class ClientAlertResolvedEvent extends DomainEvent<ClientAlertData> {
  constructor(data: {
    clientId: string;
    trainerId: string;
    alertData: ClientAlertData;
    resolvedBy: string;
  }) {
    super({
      type: TrainerClientEventTypes.CLIENT_ALERT_RESOLVED as EventType,
      entityType: 'client-alert',
      entityId: data.alertData.id,
      action: 'alert.resolved',
      data: data.alertData,
      userId: data.resolvedBy // Could be either trainer or client
    });
  }
}

/**
 * Event for when trainer-client permissions are updated
 */
export class PermissionsUpdatedEvent extends DomainEvent<{
  relationshipId: string;
  clientId: string;
  coachId: string;
  permissions: PermissionData;
  updatedBy: string;
}> {
  constructor(data: {
    relationshipId: string;
    clientId: string;
    coachId: string;
    permissions: PermissionData;
    updatedBy: string;
  }) {
    super({
      type: TrainerClientEventTypes.PERMISSIONS_UPDATED as EventType,
      entityType: 'client-coach-relationship',
      entityId: data.relationshipId,
      action: 'permissions.updated',
      data: data,
      userId: data.updatedBy // Could be either client, coach, or admin
    });
  }
}