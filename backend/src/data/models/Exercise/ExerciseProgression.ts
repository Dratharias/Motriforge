import { IExerciseProgression } from '@/types/models';
import mongoose, { Schema } from 'mongoose';

const ExerciseProgressionSchema: Schema = new Schema<IExerciseProgression>({
  exerciseId: {
    type: Schema.Types.ObjectId,
    ref: 'Exercise',
    required: true,
    index: true
  },
  progressionExerciseId: {
    type: Schema.Types.ObjectId,
    ref: 'Exercise',
    required: true,
    index: true
  },
  notes: {
    type: String
  },
  modifications: [{
    type: String
  }],
  isEasier: {
    type: Boolean,
    required: true,
    index: true
  },
  progressionOrder: {
    type: Number,
    required: true,
    default: 0
  },
  difficultyDelta: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    default: 1
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
ExerciseProgressionSchema.index({ exerciseId: 1, isEasier: 1, progressionOrder: 1 });
ExerciseProgressionSchema.index({ progressionExerciseId: 1, isEasier: 1 });

// Enforce that an exercise cannot progress to itself
ExerciseProgressionSchema.pre<IExerciseProgression>('validate', function (next) {
  if (this.exerciseId.toString() === this.progressionExerciseId.toString()) {
    return next(new Error('An exercise cannot progress to itself'));
  }
  next();
});


export const ExerciseProgressionModel = mongoose.model<IExerciseProgression>('ExerciseProgression', ExerciseProgressionSchema);