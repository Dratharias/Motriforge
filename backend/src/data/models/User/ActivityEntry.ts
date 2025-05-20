import mongoose, { Schema, Document, Types } from 'mongoose';

export enum ActivityAction {
  WORKOUT_STARTED = 'workout_started',
  WORKOUT_COMPLETED = 'workout_completed',
  WORKOUT_PAUSED = 'workout_paused',
  WORKOUT_RESUMED = 'workout_resumed',
  WORKOUT_CANCELLED = 'workout_cancelled',
  PROGRAM_STARTED = 'program_started',
  PROGRAM_COMPLETED = 'program_completed',
  PROGRAM_PAUSED = 'program_paused',
  PROGRAM_RESUMED = 'program_resumed',
  PROGRAM_CANCELLED = 'program_cancelled',
  EXERCISE_COMPLETED = 'exercise_completed',
  PERSONAL_RECORD = 'personal_record',
  GOAL_ACHIEVED = 'goal_achieved',
  FEEDBACK_RECEIVED = 'feedback_received',
  PROFILE_UPDATED = 'profile_updated',
  LOGGED_IN = 'logged_in',
  LOGGED_OUT = 'logged_out',
  JOINED_ORGANIZATION = 'joined_organization',
  CONTENT_CREATED = 'content_created',
  CONTENT_SAVED = 'content_saved'
}

export interface IActivityEntry extends Document {
  user: Types.ObjectId;
  activityId: Types.ObjectId;
  targetModel: string; // 'Workout', 'Program', 'Exercise', etc.
  targetId: Types.ObjectId;
  action: ActivityAction;
  timestamp: Date;
  duration?: number; // Duration in seconds if applicable
  progress?: number; // Progress percentage if applicable
  meta: Record<string, any>; // Additional metadata
  createdAt: Date;
  updatedAt: Date;
}

const ActivityEntrySchema: Schema = new Schema<IActivityEntry>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  activityId: {
    type: Schema.Types.ObjectId,
    ref: 'Activity',
    required: true,
    index: true
  },
  targetModel: {
    type: String,
    required: true,
    index: true
  },
  targetId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
    refPath: 'targetModel'
  },
  action: {
    type: String,
    enum: Object.values(ActivityAction),
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  duration: {
    type: Number,
    min: 0
  },
  progress: {
    type: Number,
    min: 0,
    max: 100
  },
  meta: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
ActivityEntrySchema.index({ user: 1, timestamp: -1 });
ActivityEntrySchema.index({ user: 1, targetModel: 1, targetId: 1 });
ActivityEntrySchema.index({ user: 1, action: 1, timestamp: -1 });

export const ActivityEntryModel = mongoose.model<IActivityEntry>('ActivityEntry', ActivityEntrySchema);