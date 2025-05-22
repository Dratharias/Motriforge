import { IWorkoutSession, SessionStatus } from '@/types/models';
import mongoose, { Schema } from 'mongoose';


const WorkoutSessionSchema: Schema = new Schema<IWorkoutSession>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  workout: {
    type: Schema.Types.ObjectId,
    ref: 'Workout',
    required: true,
    index: true
  },
  program: {
    type: Schema.Types.ObjectId,
    ref: 'Program',
    index: true
  },
  activeProgram: {
    type: Schema.Types.ObjectId,
    ref: 'ActiveProgram',
    index: true
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: SessionStatus,
    default: SessionStatus.IN_PROGRESS,
    required: true,
    index: true
  },
  completionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  metrics: {
    type: Schema.Types.Mixed,
    default: {}
  },
  notes: {
    type: String
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  perceivedDifficulty: {
    type: Number,
    min: 1,
    max: 10
  },
  energyLevel: {
    type: Number,
    min: 1,
    max: 10
  },
  location: {
    type: String
  },
  deviceInfo: {
    type: String
  },
  mediaIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Media'
  }],
  feedback: {
    type: String
  },
  wasModified: {
    type: Boolean,
    default: false
  },
  wasGuided: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
WorkoutSessionSchema.index({ user: 1, startTime: -1 });
WorkoutSessionSchema.index({ user: 1, workout: 1 });
WorkoutSessionSchema.index({ user: 1, status: 1 });
WorkoutSessionSchema.index({ program: 1, user: 1 });

export const WorkoutSessionModel = mongoose.model<IWorkoutSession>('WorkoutSession', WorkoutSessionSchema);