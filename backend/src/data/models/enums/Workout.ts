import mongoose, { Schema, Document } from 'mongoose';

/** ============================
 *  This file list workout
 *  - WorkoutGoal
 *  - BlockType
 *  - IntensityLevel
 ** ============================ */

/** ========================
 *  Workout Goal
 ** ======================== */

const workoutGoalEnum = [
  'strength',
  'hypertrophy',
  'endurance',
  'cardio',
  'flexibility',
  'weight_loss',
  'rehabilitation',
  'skill',
  'general_fitness',
  'sport_specific',
  'balance',
  'power'
] as const;

export type WorkoutGoalValue = typeof workoutGoalEnum[number];

export interface IWorkoutGoalInfo extends Document {
  goal: WorkoutGoalValue;
  subGoal: WorkoutGoalValue;
  label: string;
  description: string;
  icon: string;
  color: string;
  recommendedFrequency: string;
  recommendedDuration: string;
  recommendedIntensity: string;
  recommendedRecovery: string;
  bestMetrics: string[];
}

const WorkoutGoalInfoSchema: Schema = new Schema<IWorkoutGoalInfo>({
  goal: { 
    type: String, 
    enum: workoutGoalEnum, 
    required: true, 
    unique: true 
  },
  subGoal: { 
    type: String, 
    enum: workoutGoalEnum, 
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

const blockTypeEnum = [
  'warm_up',
  'cool_down',
  'strength',
  'cardio',
  'circuit',
  'superset',
  'giant_set',
  'emom',
  'amrap',
  'pyramid',
  'drop_set',
  'tabata',
  'hiit',
  'active_recovery',
  'mobility',
  'custom'
] as const;

export type BlockTypeValue = typeof blockTypeEnum[number];

export interface IBlockTypeInfo extends Document {
  type: BlockTypeValue;
  label: string;
  description: string;
  icon: string;
  color: string;
  recommendedPosition: string;
  typicalDuration: string;
  typicalRestPeriod: string;
  structure: string;
  bestFor: string[];
}

const BlockTypeInfoSchema: Schema = new Schema<IBlockTypeInfo>({
  type: { 
    type: String, 
    enum: blockTypeEnum, 
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

const intensityLevelEnum = [
  'very_light',
  'light',
  'moderate',
  'vigorous',
  'intense',
  'maximum'
] as const;

export type IntensityLevelValue = typeof intensityLevelEnum[number];

export interface IIntensityLevelInfo extends Document {
  level: IntensityLevelValue;
  label: string;
  description: string;
  heartRatePercent: string;
  perceivedExertion: string;
  color: string;
  icon: string;
  // Percentage of max heart rate typically associated with this intensity
  targetHeartRateZoneMin: number;
  targetHeartRateZoneMax: number;
}

const IntensityLevelInfoSchema: Schema = new Schema<IIntensityLevelInfo>({
  level: { 
    type: String, 
    enum: intensityLevelEnum, 
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