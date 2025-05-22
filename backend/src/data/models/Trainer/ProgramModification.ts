import { IProgramModification } from '@/types/models';
import mongoose, { Schema } from 'mongoose';

const ProgramModificationSchema: Schema = new Schema<IProgramModification>({
  programAssignment: {
    type: Schema.Types.ObjectId,
    ref: 'ProgramAssignment',
    required: true,
    index: true
  },
  originalExercise: {
    type: Schema.Types.ObjectId,
    ref: 'Exercise',
    required: true,
    index: true
  },
  replacementExercise: {
    type: Schema.Types.ObjectId,
    ref: 'Exercise',
    required: true,
    index: true
  },
  reason: {
    type: String,
    required: true
  },
  modifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  modificationDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  programDay: {
    type: Number,
    min: 1
  },
  workoutBlock: {
    type: Schema.Types.ObjectId,
    ref: 'WorkoutBlock'
  },
  applyToFutureSessions: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
ProgramModificationSchema.index({ programAssignment: 1, originalExercise: 1 });
ProgramModificationSchema.index({ programAssignment: 1, modificationDate: -1 });
ProgramModificationSchema.index({ modifiedBy: 1, modificationDate: -1 });

export const ProgramModificationModel = mongoose.model<IProgramModification>(
  'ProgramModification',
  ProgramModificationSchema
);