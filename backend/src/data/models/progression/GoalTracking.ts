import { IGoalTracking } from '@/types/models';
import mongoose, { Schema } from 'mongoose';

const MilestoneSchema = new Schema({
  value: {
    type: Number,
    required: true
  },
  targetDate: {
    type: Date,
    required: true
  },
  achievedDate: {
    type: Date
  },
  isAchieved: {
    type: Boolean,
    default: false,
    required: true
  }
}, { _id: false });

const GoalTrackingSchema: Schema = new Schema<IGoalTracking>({
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
  metric: {
    type: String,
    required: true
  },
  targetValue: {
    type: Number,
    required: true
  },
  startValue: {
    type: Number,
    required: true
  },
  currentValue: {
    type: Number,
    required: true
  },
  deadline: {
    type: Date,
    required: true,
    index: true
  },
  milestones: [MilestoneSchema],
  progressPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    required: true
  },
  strategies: [{
    type: String
  }],
  isAchieved: {
    type: Boolean,
    default: false,
    required: true,
    index: true
  },
  achievedDate: {
    type: Date
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  trainer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  }
}, {
  timestamps: true
});

// Indexes for common queries
GoalTrackingSchema.index({ user: 1, isAchieved: 1 });
GoalTrackingSchema.index({ trainer: 1, user: 1 });
GoalTrackingSchema.index({ user: 1, exercise: 1, metric: 1 });
GoalTrackingSchema.index({ deadline: 1, isAchieved: 1 });

export const GoalTrackingModel = mongoose.model<IGoalTracking>('GoalTracking', GoalTrackingSchema);