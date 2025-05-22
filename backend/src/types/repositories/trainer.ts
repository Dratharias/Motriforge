import { Types } from 'mongoose';
import { Repository } from './base';
import {
  ITrainerProfile,
  IClientCoachRelationship,
  ICoachingSession,
  ITrainingFeedback,
  IClientAlert,
  IPermissionSet,
  ITrainerDashboard
} from '../models/coaching';
import {
  IProgramAssignment,
  IProgramModification
} from '../models/program';
import { RelationshipStatus, SessionStatus, AlertType, AlertSeverity } from '../models/enums';

/**
 * Trainer profile repository interface
 */
export interface ITrainerProfileRepository extends Repository<ITrainerProfile> {
  findByUser(userId: string | Types.ObjectId): Promise<ITrainerProfile | null>;
  findBySpecialization(specialization: string): Promise<ITrainerProfile[]>;
  findAvailableTrainers(): Promise<ITrainerProfile[]>;
  findFeaturedTrainers(): Promise<ITrainerProfile[]>;
  findByRating(minRating: number): Promise<ITrainerProfile[]>;
  searchByName(query: string, limit?: number): Promise<ITrainerProfile[]>;
  updateAvailability(userId: string | Types.ObjectId, schedule: any): Promise<ITrainerProfile | null>;
  updateClientCount(userId: string | Types.ObjectId, count: number): Promise<ITrainerProfile | null>;
  incrementClientCount(userId: string | Types.ObjectId): Promise<void>;
  decrementClientCount(userId: string | Types.ObjectId): Promise<void>;
  findNearbyTrainers(location: { lat: number; lng: number }, radiusKm: number): Promise<ITrainerProfile[]>;
}

/**
 * Client-coach relationship repository interface
 */
export interface IClientCoachRelationshipRepository extends Repository<IClientCoachRelationship> {
  findByClient(clientId: string | Types.ObjectId): Promise<IClientCoachRelationship[]>;
  findByCoach(coachId: string | Types.ObjectId): Promise<IClientCoachRelationship[]>;
  findActiveRelationship(clientId: string | Types.ObjectId, coachId: string | Types.ObjectId): Promise<IClientCoachRelationship | null>;
  findByStatus(status: RelationshipStatus): Promise<IClientCoachRelationship[]>;
  findActiveRelationships(coachId: string | Types.ObjectId): Promise<IClientCoachRelationship[]>;
  findPendingRelationships(coachId: string | Types.ObjectId): Promise<IClientCoachRelationship[]>;
  updateStatus(id: string | Types.ObjectId, status: RelationshipStatus, reason?: string): Promise<IClientCoachRelationship | null>;
  terminateRelationship(id: string | Types.ObjectId, terminatedBy: string | Types.ObjectId, reason: string): Promise<IClientCoachRelationship | null>;
  extendRelationship(id: string | Types.ObjectId, newEndDate: Date): Promise<IClientCoachRelationship | null>;
  findExpiredRelationships(): Promise<IClientCoachRelationship[]>;
}

/**
 * Coaching session repository interface
 */
export interface ICoachingSessionRepository extends Repository<ICoachingSession> {
  findByClient(clientId: string | Types.ObjectId): Promise<ICoachingSession[]>;
  findByCoach(coachId: string | Types.ObjectId): Promise<ICoachingSession[]>;
  findByStatus(status: SessionStatus): Promise<ICoachingSession[]>;
  findUpcomingSessions(coachId: string | Types.ObjectId, days?: number): Promise<ICoachingSession[]>;
  findSessionsInDateRange(
    userId: string | Types.ObjectId,
    startDate: Date,
    endDate: Date,
    role: 'client' | 'coach'
  ): Promise<ICoachingSession[]>;
  rescheduleSession(id: string | Types.ObjectId, newDate: Date): Promise<ICoachingSession | null>;
  cancelSession(id: string | Types.ObjectId, cancelledBy: string | Types.ObjectId, reason: string): Promise<ICoachingSession | null>;
  completeSession(id: string | Types.ObjectId, outcomes: string[], notes?: string): Promise<ICoachingSession | null>;
  findOverdueSessions(): Promise<ICoachingSession[]>;
  findConflictingSessions(coachId: string | Types.ObjectId, startTime: Date, endTime: Date): Promise<ICoachingSession[]>;
}

/**
 * Training feedback repository interface
 */
export interface ITrainingFeedbackRepository extends Repository<ITrainingFeedback> {
  findByClient(clientId: string | Types.ObjectId): Promise<ITrainingFeedback[]>;
  findByCoach(coachId: string | Types.ObjectId): Promise<ITrainingFeedback[]>;
  findByWorkoutSession(sessionId: string | Types.ObjectId): Promise<ITrainingFeedback[]>;
  findPendingFeedback(coachId: string | Types.ObjectId): Promise<ITrainingFeedback[]>;
  findRecentFeedback(clientId: string | Types.ObjectId, limit?: number): Promise<ITrainingFeedback[]>;
  markAsReviewed(id: string | Types.ObjectId, reviewedBy: string | Types.ObjectId): Promise<ITrainingFeedback | null>;
  findUnreviewedFeedback(clientId: string | Types.ObjectId): Promise<ITrainingFeedback[]>;
  addExerciseFeedback(id: string | Types.ObjectId, exerciseId: string, feedback: string): Promise<ITrainingFeedback | null>;
}

/**
 * Client alert repository interface
 */
export interface IClientAlertRepository extends Repository<IClientAlert> {
  findByClient(clientId: string | Types.ObjectId): Promise<IClientAlert[]>;
  findByTrainer(trainerId: string | Types.ObjectId): Promise<IClientAlert[]>;
  findByType(alertType: AlertType): Promise<IClientAlert[]>;
  findBySeverity(severity: AlertSeverity): Promise<IClientAlert[]>;
  findActiveAlerts(trainerId: string | Types.ObjectId): Promise<IClientAlert[]>;
  findUnresolvedAlerts(trainerId: string | Types.ObjectId): Promise<IClientAlert[]>;
  resolveAlert(id: string | Types.ObjectId, resolvedBy: string | Types.ObjectId, notes?: string): Promise<IClientAlert | null>;
  snoozeAlert(id: string | Types.ObjectId, snoozeUntil: Date): Promise<IClientAlert | null>;
  findAlertsRequiringAction(trainerId: string | Types.ObjectId): Promise<IClientAlert[]>;
  createAlert(data: Partial<IClientAlert>): Promise<IClientAlert>;
}

/**
 * Permission set repository interface
 */
export interface IPermissionSetRepository extends Repository<IPermissionSet> {
  findByRelationship(relationshipId: string | Types.ObjectId): Promise<IPermissionSet | null>;
  updatePermissions(id: string | Types.ObjectId, permissions: Partial<IPermissionSet>): Promise<IPermissionSet | null>;
  hasPermission(relationshipId: string | Types.ObjectId, permission: keyof IPermissionSet): Promise<boolean>;
  getClientPermissions(clientId: string | Types.ObjectId, coachId: string | Types.ObjectId): Promise<IPermissionSet | null>;
  createDefaultPermissions(): Promise<IPermissionSet>;
}

/**
 * Program assignment repository interface
 */
export interface IProgramAssignmentRepository extends Repository<IProgramAssignment> {
  findByClient(clientId: string | Types.ObjectId): Promise<IProgramAssignment[]>;
  findByProgram(programId: string | Types.ObjectId): Promise<IProgramAssignment[]>;
  findByAssigner(assignerId: string | Types.ObjectId): Promise<IProgramAssignment[]>;
  findActiveAssignments(clientId: string | Types.ObjectId): Promise<IProgramAssignment[]>;
  findCompletedAssignments(clientId: string | Types.ObjectId): Promise<IProgramAssignment[]>;
  updateProgress(id: string | Types.ObjectId, progress: number): Promise<IProgramAssignment | null>;
  updateAdherence(id: string | Types.ObjectId, adherence: number): Promise<IProgramAssignment | null>;
  markAsCompleted(id: string | Types.ObjectId): Promise<IProgramAssignment | null>;
  findDueForReview(): Promise<IProgramAssignment[]>;
  addModification(assignmentId: string | Types.ObjectId, modification: Partial<IProgramModification>): Promise<IProgramModification>;
}

/**
 * Program modification repository interface
 */
export interface IProgramModificationRepository extends Repository<IProgramModification> {
  findByAssignment(assignmentId: string | Types.ObjectId): Promise<IProgramModification[]>;
  findByModifier(modifierId: string | Types.ObjectId): Promise<IProgramModification[]>;
  findByExercise(exerciseId: string | Types.ObjectId): Promise<IProgramModification[]>;
  findRecentModifications(assignmentId: string | Types.ObjectId, limit?: number): Promise<IProgramModification[]>;
  applyToFutureSessions(id: string | Types.ObjectId): Promise<void>;
  revertModification(id: string | Types.ObjectId): Promise<void>;
}

/**
 * Trainer dashboard repository interface
 */
export interface ITrainerDashboardRepository extends Repository<ITrainerDashboard> {
  findByTrainer(trainerId: string | Types.ObjectId): Promise<ITrainerDashboard | null>;
  updateClientOverviews(trainerId: string | Types.ObjectId): Promise<ITrainerDashboard | null>;
  addRecentActivity(trainerId: string | Types.ObjectId, activityId: string | Types.ObjectId): Promise<void>;
  updateMetrics(trainerId: string | Types.ObjectId, metrics: any): Promise<ITrainerDashboard | null>;
  addSavedFilter(trainerId: string | Types.ObjectId, name: string, filter: any): Promise<void>;
  removeSavedFilter(trainerId: string | Types.ObjectId, name: string): Promise<void>;
  addFavoriteClient(trainerId: string | Types.ObjectId, clientId: string | Types.ObjectId): Promise<void>;
  removeFavoriteClient(trainerId: string | Types.ObjectId, clientId: string | Types.ObjectId): Promise<void>;
}