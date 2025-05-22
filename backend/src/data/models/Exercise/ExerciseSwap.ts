import { IExerciseSwap } from '@/types/models';
import mongoose, { Schema } from 'mongoose';

const ExerciseSwapSchema: Schema = new Schema<IExerciseSwap>({
  originalExerciseId: {
    type: Schema.Types.ObjectId,
    ref: 'Exercise',
    required: true,
    index: true
  },
  replacementExerciseId: {
    type: Schema.Types.ObjectId,
    ref: 'Exercise',
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  workoutId: {
    type: Schema.Types.ObjectId,
    ref: 'Workout',
    index: true
  },
  programId: {
    type: Schema.Types.ObjectId,
    ref: 'Program',
    index: true
  },
  sessionId: {
    type: String,
    index: true
  },
  reason: {
    type: String
  },
  permanent: {
    type: Boolean,
    default: false
  },
  swappedAt: {
    type: Date,
    default: Date.now,
    required: true
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
ExerciseSwapSchema.index({ userId: 1, permanent: 1 });
ExerciseSwapSchema.index({ userId: 1, workoutId: 1 });
ExerciseSwapSchema.index({ userId: 1, programId: 1 });

export const ExerciseSwapModel = mongoose.model<IExerciseSwap>('ExerciseSwap', ExerciseSwapSchema);