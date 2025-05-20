import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IWorkoutExerciseMetrics {
  rpe?: number; // Rate of Perceived Exertion
  tempo?: string; // e.g., "3-1-3" for 3s down, 1s pause, 3s up
  restPause?: boolean; // Whether to use rest-pause technique
  failureType?: string; // e.g., "technical", "muscular", "none"
  percentOfOneRepMax?: number; // Percentage of 1RM
  [key: string]: any; // Additional custom metrics
}

export interface IWorkoutExercise extends Document {
  workoutBlockId: Types.ObjectId;
  exerciseId: Types.ObjectId;
  sets: number;
  reps: number | null;
  weight: number | null;
  time: number | null; // Duration in seconds
  distance: number | null; // Distance in meters
  rest: number; // Rest in seconds
  notes: string;
  metrics: IWorkoutExerciseMetrics;
  position: number; // Order within block
  alternativeExerciseIds: Types.ObjectId[];
  isRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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