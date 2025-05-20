import mongoose, { Schema, Document, Types } from 'mongoose';

export enum SessionStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
  PAUSED = 'paused'
}

export interface IWorkoutSessionMetrics {
  totalVolume?: number;
  totalCaloriesBurned?: number;
  averageHeartRate?: number;
  peakHeartRate?: number;
  averageRPE?: number;
  totalDistance?: number;
  totalDuration?: number;
  restTime?: number;
  workTime?: number;
  [key: string]: any;
}

export interface IWorkoutSession extends Document {
  user: Types.ObjectId;
  workout: Types.ObjectId;
  program?: Types.ObjectId;
  activeProgram?: Types.ObjectId;
  startTime: Date;
  endTime?: Date;
  duration: number; // In seconds
  status: SessionStatus;
  completionPercentage: number;
  metrics: IWorkoutSessionMetrics;
  notes: string;
  rating?: number; // User rating of the session, e.g., 1-5
  perceivedDifficulty?: number; // User perceived difficulty, e.g., 1-10
  energyLevel?: number; // User energy level, e.g., 1-10
  location?: string;
  deviceInfo?: string;
  mediaIds?: Types.ObjectId[];
  feedback?: string;
  wasModified: boolean; // Renamed from isModified to avoid conflict
  wasGuided: boolean; // Whether the workout was guided by a trainer
  createdAt: Date;
  updatedAt: Date;
}

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
    enum: Object.values(SessionStatus),
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