import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IActiveWorkout {
  workoutId: Types.ObjectId;
  startedAt: Date;
  lastUpdatedAt: Date;
  completionPercentage: number;
  notes: string;
}

export interface IActiveProgram {
  programId: Types.ObjectId;
  startedAt: Date;
  currentDay: number;
  completedWorkouts: Types.ObjectId[];
  lastCompletedDate: Date;
  adherencePercentage: number;
  notes: string;
}

export interface IActivity extends Document {
  user: Types.ObjectId;
  subscribedWorkouts: Types.ObjectId[];
  subscribedPrograms: Types.ObjectId[];
  activeWorkout: IActiveWorkout | null;
  activeProgram: IActiveProgram | null;
  totalWorkoutsCompleted: number;
  totalWorkoutDuration: number; // in minutes
  lastWorkoutDate: Date;
  streak: number; // consecutive days with activity
  longestStreak: number;
  createdAt: Date;
  updatedAt: Date;
}

const ActiveWorkoutSchema = new Schema({
  workoutId: {
    type: Schema.Types.ObjectId,
    ref: 'Workout',
    required: true
  },
  startedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  },
  completionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  notes: {
    type: String
  }
}, { _id: false });

const ActiveProgramSchema = new Schema({
  programId: {
    type: Schema.Types.ObjectId,
    ref: 'Program',
    required: true
  },
  startedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  currentDay: {
    type: Number,
    default: 1,
    min: 1
  },
  completedWorkouts: [{
    type: Schema.Types.ObjectId,
    ref: 'Workout'
  }],
  lastCompletedDate: {
    type: Date
  },
  adherencePercentage: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  },
  notes: {
    type: String
  }
}, { _id: false });

const ActivitySchema: Schema = new Schema<IActivity>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  subscribedWorkouts: [{
    type: Schema.Types.ObjectId,
    ref: 'Workout',
    index: true
  }],
  subscribedPrograms: [{
    type: Schema.Types.ObjectId,
    ref: 'Program',
    index: true
  }],
  activeWorkout: {
    type: ActiveWorkoutSchema,
    default: null
  },
  activeProgram: {
    type: ActiveProgramSchema,
    default: null
  },
  totalWorkoutsCompleted: {
    type: Number,
    default: 0,
    min: 0
  },
  totalWorkoutDuration: {
    type: Number,
    default: 0,
    min: 0
  },
  lastWorkoutDate: {
    type: Date
  },
  streak: {
    type: Number,
    default: 0,
    min: 0
  },
  longestStreak: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Indexes for common queries
ActivitySchema.index({ 'activeWorkout.workoutId': 1 });
ActivitySchema.index({ 'activeProgram.programId': 1 });
ActivitySchema.index({ lastWorkoutDate: -1 });
ActivitySchema.index({ streak: -1 });

export const ActivityModel = mongoose.model<IActivity>('Activity', ActivitySchema);