import { IExerciseAlternative } from '@/types/models';
import mongoose, { Schema } from 'mongoose';

const ExerciseAlternativeSchema: Schema = new Schema<IExerciseAlternative>({
  exerciseId: {
    type: Schema.Types.ObjectId,
    ref: 'Exercise',
    required: true,
    index: true
  },
  alternativeExerciseId: {
    type: Schema.Types.ObjectId,
    ref: 'Exercise',
    required: true,
    index: true
  },
  reason: {
    type: String,
    required: true
  },
  notes: {
    type: String
  },
  accommodates: [{
    type: String,
    index: true
  }],
  similarityScore: {
    type: Number,
    min: 1,
    max: 10,
    default: 5,
    required: true
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
ExerciseAlternativeSchema.index({ exerciseId: 1, accommodates: 1 });
ExerciseAlternativeSchema.index({ exerciseId: 1, similarityScore: -1 });

// Ensure an exercise cannot be an alternative to itself
ExerciseAlternativeSchema.pre<IExerciseAlternative>('validate', function(next) {
  if (this.exerciseId.toString() === this.alternativeExerciseId.toString()) {
    return next(new Error('An exercise cannot be an alternative to itself'));
  }
  next();
});

export const ExerciseAlternativeModel = mongoose.model<IExerciseAlternative>('ExerciseAlternative', ExerciseAlternativeSchema);