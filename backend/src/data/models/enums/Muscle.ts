import mongoose, { Schema, Document, Types } from 'mongoose';

/** ============================
 *  This file list muscle
 *  - Zone
 *  - Level
 *  - Type
 ** ============================ */

/** ========================
 *  MuscleType
 ** ======================== */

const muscleTypeEnum = [
  'muscle',
  'tendon'
] as const;

export type MuscleTypeValue = typeof muscleTypeEnum[number];

export interface IMuscleTypeInfo extends Document {
  type: MuscleTypeValue;
  label: string;
  description: string;
  icon: string;
  color: string;
  properties: string[];
  commonExercises: Types.ObjectId[];
  recoveryTime: string;
}

const MuscleTypeInfoSchema: Schema = new Schema<IMuscleTypeInfo>({
  type: { 
    type: String, 
    enum: muscleTypeEnum, 
    required: true, 
    unique: true 
  },
  label: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  color: { type: String, required: true },
  properties: { type: [String], required: true },
  commonExercises: { type: [String], required: true },
  recoveryTime: { type: String, required: true }
}, {
  timestamps: true
});

MuscleTypeInfoSchema.index({ type: 1 });

export const MuscleTypeInfoModel = mongoose.model<IMuscleTypeInfo>('MuscleTypeInfo', MuscleTypeInfoSchema);

/** ========================
 *  MuscleZone
 ** ======================== */

const muscleZoneEnum = [
  'ankle',
  'knee',
  'hip',
  'calf',
  'shoulder',
  'neck',
  'chest',
  'back',
  'abs',
  'forearm',
  'biceps',
  'triceps',
  'glutes',
  'quadriceps',
  'hamstrings'
] as const;

export type MuscleZoneValue = typeof muscleZoneEnum[number];

export interface IMuscleZoneInfo extends Document {
  zone: MuscleZoneValue;
  label: string;
  description: string;
  icon: string;
  color: string;
  muscleCount: number;
  relatedZones: Types.ObjectId[];
  commonInjuries: string[];
  recommendedExercises: Types.ObjectId[];
  majorMuscles: Types.ObjectId[];
}

const MuscleZoneInfoSchema: Schema = new Schema<IMuscleZoneInfo>({
  zone: { 
    type: String, 
    enum: muscleZoneEnum, 
    required: true, 
    unique: true 
  },
  label: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  color: { type: String, required: true },
  muscleCount: { type: Number, required: true },
  relatedZones: { type: [Schema.Types.ObjectId], ref: 'MuscleZoneInfo', required: true },
  recommendedExercises: { type: [Schema.Types.ObjectId], ref: 'Exercise', required: true },
  majorMuscles: { type: [Schema.Types.ObjectId], ref: 'Muscle', required: true }
}, {
  timestamps: true
});

MuscleZoneInfoSchema.index({ zone: 1 });

export const MuscleZoneInfoModel = mongoose.model<IMuscleZoneInfo>('MuscleZoneInfo', MuscleZoneInfoSchema);

/** ========================
 *  MuscleLevel
 ** ======================== */

const muscleLevelEnum = [
  'training',
  'intermediate',
  'medical'
] as const;

export type MuscleLevelValue = typeof muscleLevelEnum[number];

export interface IMuscleLevelInfo extends Document {
  level: MuscleLevelValue;
  label: string;
  description: string;
  icon: string;
  color: string;
  knowledgeRequirements: string;
  recommendedAudience: string[];
  detailLevel: string;
  anatomicalPrecision: string;
}

const MuscleLevelInfoSchema: Schema = new Schema<IMuscleLevelInfo>({
  level: { 
    type: String, 
    enum: muscleLevelEnum, 
    required: true, 
    unique: true 
  },
  label: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  color: { type: String, required: true },
  knowledgeRequirements: { type: String, required: true },
  recommendedAudience: { type: [String], required: true },
  detailLevel: { type: String, required: true },
  anatomicalPrecision: { type: String, required: true }
}, {
  timestamps: true
});

MuscleLevelInfoSchema.index({ level: 1 });

export const MuscleLevelInfoModel = mongoose.model<IMuscleLevelInfo>('MuscleLevelInfo', MuscleLevelInfoSchema);

