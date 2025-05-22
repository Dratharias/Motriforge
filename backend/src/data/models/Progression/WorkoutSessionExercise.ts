import { IWorkoutSessionExercise } from '@/types/models';
import mongoose, { Schema } from 'mongoose';

const WorkoutSessionExerciseSchema: Schema = new Schema<IWorkoutSessionExercise>({
  workoutSession: {
    type: Schema.Types.ObjectId,
    ref: 'WorkoutSession',
    required: true,
    index: true
  },
  exercise: {
    type: Schema.Types.ObjectId,
    ref: 'Exercise',
    required: true,
    index: true
  },
  originalWorkoutExercise: {
    type: Schema.Types.ObjectId,
    ref: 'WorkoutExercise'
  },
  sets: [{
    type: Schema.Types.ObjectId,
    ref: 'SetData'
  }],
  order: {
    type: Number,
    required: true,
    min: 0
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number, // in seconds
    min: 0
  },
  wasSubstituted: {
    type: Boolean,
    default: false
  },
  substitutionReason: {
    type: String
  },
  metrics: {
    type: Schema.Types.Mixed,
    default: {}
  },
  notes: {
    type: String
  },
  completed: {
    type: Boolean,
    default: false,
    index: true
  },
  skipped: {
    type: Boolean,
    default: false,
    index: true
  },
  mediaIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Media'
  }]
}, {
  timestamps: true
});

// Compound indexes for common queries
WorkoutSessionExerciseSchema.index({ workoutSession: 1, order: 1 });
WorkoutSessionExerciseSchema.index({ workoutSession: 1, completed: 1 });
WorkoutSessionExerciseSchema.index({ exercise: 1, completed: 1 });

export const WorkoutSessionExerciseModel = mongoose.model<IWorkoutSessionExercise>(
  'WorkoutSessionExercise', 
  WorkoutSessionExerciseSchema
);