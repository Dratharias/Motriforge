import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPerformanceContext {
  workout?: Types.ObjectId;
  workoutSession?: Types.ObjectId;
  program?: Types.ObjectId;
  notes?: string;
  energyLevel?: number;
  rpe?: number;
  equipment?: Types.ObjectId;
  sets?: ISetData[];
}

export interface ISetData {
  setNumber: number;
  weight?: number;
  reps?: number;
  distance?: number;
  duration?: number;
  rpe?: number;
}

export interface IDailyPerformance extends Document {
  user: Types.ObjectId;
  exercise: Types.ObjectId;
  progressionTracking: Types.ObjectId;
  date: Date;
  metrics: Map<string, number>;
  context: IPerformanceContext;
  createdAt: Date;
  updatedAt: Date;
}

const SetDataSchema = new Schema({
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
    type: Number,
    min: 0
  },
  rpe: {
    type: Number,
    min: 1,
    max: 10
  }
}, { _id: false });

export const PerformanceContextSchema = new Schema({
  workout: {
    type: Schema.Types.ObjectId,
    ref: 'Workout'
  },
  workoutSession: {
    type: Schema.Types.ObjectId,
    ref: 'WorkoutSession'
  },
  program: {
    type: Schema.Types.ObjectId,
    ref: 'Program'
  },
  notes: {
    type: String
  },
  energyLevel: {
    type: Number,
    min: 1,
    max: 10
  },
  rpe: {
    type: Number,
    min: 1,
    max: 10
  },
  equipment: {
    type: Schema.Types.ObjectId,
    ref: 'Equipment'
  },
  sets: [SetDataSchema]
}, { _id: false });

const DailyPerformanceSchema: Schema = new Schema<IDailyPerformance>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  exercise: {
    type: Schema.Types.ObjectId,
    ref: 'Exercise',
    required: true,
    index: true
  },
  progressionTracking: {
    type: Schema.Types.ObjectId,
    ref: 'ProgressionTracking',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  metrics: {
    type: Map,
    of: Number,
    default: new Map(),
    required: true
  },
  context: {
    type: PerformanceContextSchema,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for common queries
DailyPerformanceSchema.index({ progressionTracking: 1, date: -1 });
DailyPerformanceSchema.index({ user: 1, exercise: 1, date: -1 });
DailyPerformanceSchema.index({ 'context.workout': 1 });
DailyPerformanceSchema.index({ 'context.workoutSession': 1 });
DailyPerformanceSchema.index({ 'context.program': 1 });

export const DailyPerformanceModel = mongoose.model<IDailyPerformance>('DailyPerformance', DailyPerformanceSchema);