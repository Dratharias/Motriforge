import mongoose, { Schema, Document } from 'mongoose';

// Use enum strings as TypeScript enum is not available in runtime,
// we can define them here to enforce allowed values.
const difficultyLevelEnum = [
  'beginner I',
  'beginner II',
  'beginner III',
  'intermediate I',
  'intermediate II',
  'intermediate III',
  'advanced I',
  'advanced II',
  'advanced III',
  'expert',
  'master',
  'elite',
  'all'
] as const;

export type DifficultyLevelType = typeof difficultyLevelEnum[number];

export interface IDifficultyLevelInfo extends Document {
  level: DifficultyLevelType;
  label: string;
  description: string;
  experienceMonths: number;
  color: string;
  icon: string;
  criteria: string[];
  nextSteps: string[];
}

const DifficultyLevelInfoSchema: Schema = new Schema<IDifficultyLevelInfo>({
  level: { 
    type: String, 
    enum: difficultyLevelEnum, 
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