import { BlockType, IBlockTypeInfo, IIntensityLevelInfo, IntensityLevel, IWorkoutGoalInfo, WorkoutGoal } from '@/types/models';
import mongoose, { Schema } from 'mongoose';

/** ============================
 *  This file list workout
 *  - WorkoutGoal
 *  - BlockType
 *  - IntensityLevel
 ** ============================ */

/** ========================
 *  Workout Goal
 ** ======================== */

const WorkoutGoalInfoSchema: Schema = new Schema<IWorkoutGoalInfo>({
  goal: { 
    type: String, 
    enum: WorkoutGoal, 
    required: true, 
    unique: true 
  },
  subGoal: { 
    type: String, 
    enum: WorkoutGoal, 
    required: true, 
    unique: true 
  },
  label: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  color: { type: String, required: true },
  recommendedFrequency: { type: String, required: true },
  recommendedDuration: { type: String, required: true },
  recommendedIntensity: { type: String, required: true },
  recommendedRecovery: { type: String, required: true },
  bestMetrics: { type: [String], required: true }
}, {
  timestamps: true
});

WorkoutGoalInfoSchema.index({ goal: 1 });

export const WorkoutGoalInfoModel = mongoose.model<IWorkoutGoalInfo>('WorkoutGoalInfo', WorkoutGoalInfoSchema);

/** ========================
 *  Block Type
 ** ======================== */

const BlockTypeInfoSchema: Schema = new Schema<IBlockTypeInfo>({
  type: { 
    type: String, 
    enum: BlockType, 
    required: true, 
    unique: true 
  },
  label: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  color: { type: String, required: true },
  recommendedPosition: { type: String, required: true },
  typicalDuration: { type: String, required: true },
  typicalRestPeriod: { type: String, required: true },
  structure: { type: String, required: true },
  bestFor: { type: [String], required: true }
}, {
  timestamps: true
});

BlockTypeInfoSchema.index({ type: 1 });

export const BlockTypeInfoModel = mongoose.model<IBlockTypeInfo>('BlockTypeInfo', BlockTypeInfoSchema);

/** ========================
 *  IntensityLevel
 ** ======================== */

const IntensityLevelInfoSchema: Schema = new Schema<IIntensityLevelInfo>({
  level: { 
    type: String, 
    enum: IntensityLevel, 
    required: true, 
    unique: true 
  },
  label: { type: String, required: true },
  description: { type: String, required: true },
  heartRatePercent: { type: String, required: true },
  perceivedExertion: { type: String, required: true },
  color: { type: String, required: true },
  icon: { type: String, required: true },
  targetHeartRateZoneMin: { 
    type: Number, 
    required: true, 
    min: 0, 
    max: 100 
  },
  targetHeartRateZoneMax: { 
    type: Number, 
    required: true, 
    min: 0, 
    max: 100 
  }
}, {
  timestamps: true
});

IntensityLevelInfoSchema.index({ level: 1 });
IntensityLevelInfoSchema.index({ targetHeartRateZoneMin: 1, targetHeartRateZoneMax: 1 });

export const IntensityLevelInfoModel = mongoose.model<IIntensityLevelInfo>('IntensityLevelInfo', IntensityLevelInfoSchema);