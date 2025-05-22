import { IProgressionTracking, MetricType } from '@/types/models';
import mongoose, { Schema } from 'mongoose';

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