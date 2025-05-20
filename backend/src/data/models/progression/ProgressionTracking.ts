import mongoose, { Schema, Document, Types } from 'mongoose';

export enum MetricType {
  WEIGHT = 'weight',
  REPS = 'reps',
  SETS = 'sets',
  DISTANCE = 'distance',
  DURATION = 'duration',
  SPEED = 'speed',
  ONE_REP_MAX = 'one_rep_max',
  VOLUME = 'volume',
  RPE = 'rpe',
  ORM = 'orm',
  HEART_RATE = 'heart_rate',
  REST_TIME = 'rest_time',
  RANGE_OF_MOTION = 'range_of_motion'
}

export enum TimeResolution {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly'
}

export interface IMetricSnapshot {
  date: Date;
  metrics: Map<string, number>;
}

export interface IProgressMetrics {
  percentage: number;
  absoluteChange: number;
}

export interface IProgressionTracking extends Document {
  user: Types.ObjectId;
  exercise: Types.ObjectId;
  trackedMetrics: MetricType[];
  firstRecorded: IMetricSnapshot;
  lastRecorded: IMetricSnapshot;
  overallProgress: Record<string, IProgressMetrics>;
  createdAt: Date;
  updatedAt: Date;
}

const MetricSnapshotSchema = new Schema({
  date: {
    type: Date,
    required: true
  },
  metrics: {
    type: Map,
    of: Number,
    default: new Map()
  }
}, { _id: false });

const ProgressMetricsSchema = new Schema({
  percentage: {
    type: Number,
    required: true
  },
  absoluteChange: {
    type: Number,
    required: true
  }
}, { _id: false });

const ProgressionTrackingSchema: Schema = new Schema<IProgressionTracking>({
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
  trackedMetrics: [{
    type: String,
    enum: Object.values(MetricType),
    required: true
  }],
  firstRecorded: {
    type: MetricSnapshotSchema
  },
  lastRecorded: {
    type: MetricSnapshotSchema
  },
  overallProgress: {
    type: Map,
    of: ProgressMetricsSchema,
    default: new Map()
  }
}, {
  timestamps: true
});

// Compound index for efficient querying
ProgressionTrackingSchema.index({ user: 1, exercise: 1 }, { unique: true });
ProgressionTrackingSchema.index({ user: 1, 'trackedMetrics': 1 });
ProgressionTrackingSchema.index({ exercise: 1, 'trackedMetrics': 1 });

export const ProgressionTrackingModel = mongoose.model<IProgressionTracking>('ProgressionTracking', ProgressionTrackingSchema);