import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMilestone extends Document {
  goalTracking: Types.ObjectId;
  value: number;
  targetDate: Date;
  achievedDate?: Date;
  isAchieved: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MilestoneSchema: Schema = new Schema<IMilestone>({
  goalTracking: {
    type: Schema.Types.ObjectId,
    ref: 'GoalTracking',
    required: true,
    index: true
  },
  value: {
    type: Number,
    required: true
  },
  targetDate: {
    type: Date,
    required: true,
    index: true
  },
  achievedDate: {
    type: Date
  },
  isAchieved: {
    type: Boolean,
    default: false,
    required: true,
    index: true
  },
  description: {
    type: String
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
MilestoneSchema.index({ goalTracking: 1, targetDate: 1 });
MilestoneSchema.index({ goalTracking: 1, isAchieved: 1 });

export const MilestoneModel = mongoose.model<IMilestone>('Milestone', MilestoneSchema);