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
