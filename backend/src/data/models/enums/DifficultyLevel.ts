import { DifficultyLevel, IDifficultyLevelInfo } from '@/types/models';
import mongoose, { Schema } from 'mongoose';

const DifficultyLevelInfoSchema: Schema = new Schema<IDifficultyLevelInfo>({
  level: { 
    type: String, 
    enum: DifficultyLevel, 
    required: true, 
    unique: true 
  },
  label: { type: String, required: true },
  description: { type: String, required: true },
  experienceMonths: { type: Number, required: true, min: 0 },
  color: { type: String, required: true },
  icon: { type: String, required: true },
  criteria: { type: [String], required: true },
  nextSteps: { type: [String], required: true }
}, {
  timestamps: true // for createdAt and updatedAt
});

// Optional: Create index on experienceMonths to query by experience
DifficultyLevelInfoSchema.index({ experienceMonths: 1 });

export const DifficultyLevelInfoModel = mongoose.model<IDifficultyLevelInfo>(
  'DifficultyLevelInfo',
  DifficultyLevelInfoSchema
);