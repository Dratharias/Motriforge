import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IProgramScheduleItem extends Document {
  programId: Types.ObjectId;
  day: number; // Day number within the program
  workoutId: Types.ObjectId;
  notes: string;
  isOptional: boolean;
  restDay: boolean;
  alternateWorkoutIds: Types.ObjectId[]; // Alternative workouts
  week: number; // Week number within the program
  dayOfWeek: number; // 0-6 for Sunday-Saturday
  createdAt: Date;
  updatedAt: Date;
}

const ProgramScheduleItemSchema: Schema = new Schema<IProgramScheduleItem>({
  programId: {
    type: Schema.Types.ObjectId,
    ref: 'Program',
    required: true,
    index: true
  },
  day: {
    type: Number,
    required: true,
    min: 1,
    index: true
  },
  workoutId: {
    type: Schema.Types.ObjectId,
    ref: 'Workout',
    index: true
  },
  notes: {
    type: String
  },
  isOptional: {
    type: Boolean,
    default: false
  },
  restDay: {
    type: Boolean,
    default: false
  },
  alternateWorkoutIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Workout'
  }],
  week: {
    type: Number,
    required: true,
    min: 1,
    index: true
  },
  dayOfWeek: {
    type: Number,
    required: true,
    min: 0,
    max: 6,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
ProgramScheduleItemSchema.index({ programId: 1, day: 1 }, { unique: true });
ProgramScheduleItemSchema.index({ programId: 1, week: 1, dayOfWeek: 1 });
ProgramScheduleItemSchema.index({ workoutId: 1 });

// Validate either workoutId is provided or restDay is true
ProgramScheduleItemSchema.pre('validate', function(next) {
  if (!this.workoutId && !this.restDay) {
    return next(new Error('Either a workout must be assigned or it must be marked as a rest day'));
  }
  next();
});

export const ProgramScheduleItemModel = mongoose.model<IProgramScheduleItem>('ProgramScheduleItem', ProgramScheduleItemSchema);