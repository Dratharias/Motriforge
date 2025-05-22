import { ClientAlertData, CoachingSessionData, EventType, PermissionData, ProgramAssignmentData, RelationshipData, TrainerClientEventTypes, TrainingFeedbackData } from "@/types/events";
import { DomainEvent } from "./models/DomainEvent";

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