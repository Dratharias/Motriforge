import { ActivityAction, IActivityEntry } from '@/types/models';
import mongoose, { Schema } from 'mongoose';

const ActivityEntrySchema: Schema = new Schema<IActivityEntry>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  activityId: {
    type: Schema.Types.ObjectId,
    ref: 'Activity',
    required: true,
    index: true
  },
  targetModel: {
    type: String,
    required: true,
    index: true
  },
  targetId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
    refPath: 'targetModel'
  },
  action: {
    type: String,
    enum: ActivityAction,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  duration: {
    type: Number,
    min: 0
  },
  progress: {
    type: Number,
    min: 0,
    max: 100
  },
  meta: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
ActivityEntrySchema.index({ user: 1, timestamp: -1 });
ActivityEntrySchema.index({ user: 1, targetModel: 1, targetId: 1 });
ActivityEntrySchema.index({ user: 1, action: 1, timestamp: -1 });

export const ActivityEntryModel = mongoose.model<IActivityEntry>('ActivityEntry', ActivityEntrySchema);