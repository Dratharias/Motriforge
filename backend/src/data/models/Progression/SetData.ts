import { ISetData } from '@/types/models';
import mongoose, { Schema } from 'mongoose';

export const SetDataSchema: Schema = new Schema<ISetData>({
  workoutSessionExercise: {
    type: Schema.Types.ObjectId,
    ref: 'WorkoutSessionExercise',
    required: true,
    index: true
  },
  setNumber: {
    type: Number,
    required: true,
    min: 1
  },
  weight: {
    type: Number,
    min: 0
  },
  reps: {
    type: Number,
    min: 0
  },
  distance: {
    type: Number,
    min: 0
  },
  duration: {
    type: Number, // in seconds
    min: 0
  },
  rpe: {
    type: Number,
    min: 1,
    max: 10
  },
  tempo: {
    type: String
  },
  isWarmupSet: {
    type: Boolean,
    default: false
  },
  isDropSet: {
    type: Boolean,
    default: false
  },
  restAfter: {
    type: Number, // in seconds
    min: 0
  },
  completedAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
SetDataSchema.index({ workoutSessionExercise: 1, setNumber: 1 });
SetDataSchema.index({ workoutSessionExercise: 1, completedAt: 1 });

export const SetDataModel = mongoose.model<ISetData>('SetData', SetDataSchema);