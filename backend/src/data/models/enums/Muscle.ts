import { IMuscleLevelInfo, IMuscleTypeInfo, IMuscleZoneInfo, MuscleLevel, MuscleType, MuscleZone } from '@/types/models';
import mongoose, { Schema } from 'mongoose';

/** ============================
 *  This file list muscle
 *  - Zone
 *  - Level
 *  - Type
 ** ============================ */

/** ========================
 *  MuscleType
 ** ======================== */


const MuscleTypeInfoSchema: Schema = new Schema<IMuscleTypeInfo>({
  type: { 
    type: String, 
    enum: MuscleType, 
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

const MuscleZoneInfoSchema: Schema = new Schema<IMuscleZoneInfo>({
  zone: { 
    type: String, 
    enum: MuscleZone, 
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


const MuscleLevelInfoSchema: Schema = new Schema<IMuscleLevelInfo>({
  level: { 
    type: String, 
    enum: MuscleLevel, 
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

