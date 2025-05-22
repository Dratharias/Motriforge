import { ExerciseType, IExerciseTypeInfo, IMetricTypeInfo, MetricType } from '@/types/models';
import mongoose, { Schema } from 'mongoose';

/** ============================
 *  This file list exercise
 *  - ExerciseType
 *  - MetricType
 ** ============================ */

/** ========================
 *  ExerciseType
 ** ======================== */

const ExerciseTypeInfoSchema: Schema = new Schema<IExerciseTypeInfo>({
  type: { 
    type: String, 
    enum: ExerciseType, 
    required: true, 
    unique: true 
  },
  label: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  color: { type: String, required: true },
  primaryMetrics: { type: [String], required: true },
  recommendedEquipment: { type: [String], required: true }
}, {
  timestamps: true
});

ExerciseTypeInfoSchema.index({ type: 1 });

export const ExerciseTypeInfoModel = mongoose.model<IExerciseTypeInfo>('ExerciseTypeInfo', ExerciseTypeInfoSchema);

/** ========================
 *  MetricType
 ** ======================== */

const MetricTypeInfoSchema: Schema = new Schema<IMetricTypeInfo>({
  type: { 
    type: String, 
    enum: MetricType, 
    required: true, 
    unique: true 
  },
  label: { type: String, required: true },
  description: { type: String, required: true },
  unit: { type: String, required: true },
  alternateUnits: { type: [String], required: true },
  icon: { type: String, required: true },
  color: { type: String, required: true },
  minValue: { type: Number, required: true },
  maxValue: { type: Number, required: true },
  defaultIncrement: { type: Number, required: true },
  bestForExerciseTypes: { type: [String], required: true }
}, {
  timestamps: true
});

MetricTypeInfoSchema.index({ type: 1 });

export const MetricTypeInfoModel = mongoose.model<IMetricTypeInfo>('MetricTypeInfo', MetricTypeInfoSchema);