import { ICoachingSession, SessionType, SessionStatus } from '@/types/models';
import mongoose, { Schema } from 'mongoose';

const CoachingSessionSchema: Schema = new Schema<ICoachingSession>({
  client: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  coach: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  scheduledDate: {
    type: Date,
    required: true,
    index: true
  },
  duration: {
    type: Number,
    required: true,
    min: 5,
    default: 60
  },
  type: {
    type: String,
    enum: SessionType,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: SessionStatus,
    default: SessionStatus.SCHEDULED,
    required: true,
    index: true
  },
  notes: {
    type: String
  },
  focusAreas: [{
    type: String
  }],
  goals: [{
    type: String
  }],
  outcomes: [{
    type: String
  }],
  sessionRecording: {
    type: Schema.Types.ObjectId,
    ref: 'Media'
  },
  preparationNotes: {
    type: String
  },
  followupRequired: {
    type: Boolean,
    default: false
  },
  followupCompleted: {
    type: Boolean,
    default: false
  },
  location: {
    type: String
  },
  isVirtual: {
    type: Boolean,
    default: true
  },
  meetingLink: {
    type: String
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  cancellationReason: {
    type: String
  },
  cancelledBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  feedbackProvided: {
    type: Boolean,
    default: false
  },
  clientFeedbackRating: {
    type: Number,
    min: 1,
    max: 5
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
CoachingSessionSchema.index({ client: 1, scheduledDate: 1 });
CoachingSessionSchema.index({ coach: 1, scheduledDate: 1 });
CoachingSessionSchema.index({ client: 1, coach: 1, status: 1 });
CoachingSessionSchema.index({ status: 1, scheduledDate: 1 });

// Instance methods
CoachingSessionSchema.methods.reschedule = async function(newDate: Date): Promise<ICoachingSession> {
  this.status = SessionStatus.RESCHEDULED;
  this.scheduledDate = newDate;
  this.reminderSent = false;
  return this.save();
};

CoachingSessionSchema.methods.cancel = async function(reason: string): Promise<ICoachingSession> {
  this.status = SessionStatus.CANCELLED;
  this.cancellationReason = reason;
  this.cancelledBy = new mongoose.Types.ObjectId(); // This would be the current user's ID in practice
  return this.save();
};

CoachingSessionSchema.methods.completeSession = async function(notes: string): Promise<ICoachingSession> {
  this.status = SessionStatus.COMPLETED;
  if (notes) this.notes = notes;
  return this.save();
};

export const CoachingSessionModel = mongoose.model<ICoachingSession>(
  'CoachingSession',
  CoachingSessionSchema
);