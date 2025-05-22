import mongoose, { Schema } from 'mongoose';
import { PerformanceContextSchema } from './DailyPerformance';
import { IPersonalRecord } from '@/types/models';

const PersonalRecordSchema: Schema = new Schema<IPersonalRecord>({
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
    required: true,
    index: true
  },
  value: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  previousRecord: {
    type: Number
  },
  improvement: {
    type: Number
  },
  improvementPercentage: {
    type: Number
  },
  context: {
    type: PerformanceContextSchema
  }
}, {
  timestamps: true
});

// Compound index for uniqueness and efficient querying
PersonalRecordSchema.index({ user: 1, exercise: 1, metric: 1 }, { unique: true });
PersonalRecordSchema.index({ user: 1, date: -1 });

export const PersonalRecordModel = mongoose.model<IPersonalRecord>('PersonalRecord', PersonalRecordSchema);