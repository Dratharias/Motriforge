import { IWorkoutExercise } from '@/types/models';
import mongoose, { Schema } from 'mongoose';

const WorkoutExerciseSchema: Schema = new Schema<IWorkoutExercise>({
  workoutBlockId: {
    type: Schema.Types.ObjectId,
    ref: 'WorkoutBlock',
    required: true,
    index: true
  },
  exerciseId: {
    type: Schema.Types.ObjectId,
    ref: 'Exercise',
    required: true,
    index: true
  },
  sets: {
    type: Number,
    required: true,
    min: 1
  },
  reps: {
    type: Number,
    min: 0,
    default: null // null when not applicable (e.g., for time-based exercises)
  },
  weight: {
    type: Number,
    min: 0,
    default: null // null when not applicable (e.g., bodyweight exercises)
  },
  time: {
    type: Number,
    min: 0,
    default: null // Duration in seconds, null when not applicable
  },
  distance: {
    type: Number,
    min: 0,
    default: null // Distance in meters, null when not applicable
  },
  rest: {
    type: Number,
    default: 60,
    min: 0 // Rest in seconds
  },
  notes: {
    type: String
  },
  metrics: {
    rpe: {
      type: Number,
      min: 1,
      max: 10
    },
    tempo: {
      type: String
    },
    restPause: {
      type: Boolean,
      default: false
    },
    failureType: {
      type: String
    },
    percentOfOneRepMax: {
      type: Number,
      min: 1,
      max: 100
    }
  },
  position: {
    type: Number,
    required: true,
    min: 0
  },
  alternativeExerciseIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Exercise'
  }],
  isRequired: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
WorkoutExerciseSchema.index({ workoutBlockId: 1, position: 1 });
WorkoutExerciseSchema.index({ exerciseId: 1 });

export const WorkoutExerciseModel = mongoose.model<IWorkoutExercise>('WorkoutExercise', WorkoutExerciseSchema);