import { RelationshipStatus, AssignmentStatus, SessionType, SessionStatus, AlertType, AlertSeverity } from "../models";

/**
 * Client-coach relationship data
 */
export interface RelationshipData {
  id: string;
  clientId: string;
  coachId: string;
  startDate: Date;
  endDate?: Date;
  status: RelationshipStatus;
  permissionSetId: string;
  notes?: string;
  terminationReason?: string;
  terminatedBy?: string;
}

/**
 * Program assignment data
 */
export interface ProgramAssignmentData {
  id: string;
  clientId: string;
  programId: string;
  assignedBy: string;
  assignedDate: Date;
  startDate: Date;
  endDate: Date;
  status: AssignmentStatus;
  notes?: string;
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
  id: string;
  clientId: string;
  coachId: string;
  workoutSessionId: string;
  date: Date;
  feedbackText: string;
  correctionNotes?: string;
  formComments?: string;
  performanceRating?: number;
  progressionSuggestions?: string;
  wasReviewed: boolean;
  reviewDate?: Date;
  exerciseFeedback?: Record<string, string>;
}

/**
 * Coaching session data
 */
export interface CoachingSessionData {
  id: string;
  clientId: string;
  coachId: string;
  scheduledDate: Date;
  duration: number;
  type: SessionType;
  status: SessionStatus;
  focusAreas?: string[];
  goals?: string[];
  outcomes?: string[];
  location?: string;
  isVirtual: boolean;
  meetingLink?: string;
  cancellationReason?: string;
  cancelledBy?: string;
}

/**
 * Client alert data
 */
export interface ClientAlertData {
  id: string;
  clientId: string;
  trainerId: string;
  alertType: AlertType;
  date: Date;
  message: string;
  severity: AlertSeverity;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedDate?: Date;
  resolutionNotes?: string;
  requiresAction: boolean;
}

/**
 * Permission data
 */
export interface PermissionData {
  id: string;
  viewWorkoutHistory: boolean;
  viewProgressionData: boolean;
  viewPersonalData: boolean;
  assignWorkouts: boolean;
  assignPrograms: boolean;
  modifyWorkouts: boolean;
  viewActivityStatus: boolean;
  canContactOutsideHours: boolean;
  viewNutritionData: boolean;
  provideFeedback: boolean;
  modifyGoals: boolean;
}
