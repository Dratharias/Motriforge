import mongoose, { Schema, Document } from 'mongoose';

/** ============================
 *  This file list exercise
 *  - ExerciseType
 *  - MetricType
 ** ============================ */

/** ========================
 *  ExerciseType
 ** ======================== */

const exerciseTypeEnum = [
  'strength',
  'cardio',
  'flexibility',
  'balance',
  'plyometric',
  'compound',
  'isolation',
  'calisthenics',
  'sport_specific',
  'rehabilitation',
  'other'
] as const;

export type ExerciseTypeValue = typeof exerciseTypeEnum[number];

export interface IExerciseTypeInfo extends Document {
  type: ExerciseTypeValue;
  label: string;
  description: string;
  icon: string;
  color: string;
  primaryMetrics: string[];
  recommendedEquipment: string[];
}

const ExerciseTypeInfoSchema: Schema = new Schema<IExerciseTypeInfo>({
  type: { 
    type: String, 
    enum: exerciseTypeEnum, 
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

const metricTypeEnum = [
  'weight',
  'reps',
  'sets',
  'distance',
  'duration',
  'speed',
  'one_rep_max',
  'volume',
  'rpe',
  'heart_rate',
  'rest_time',
  'range_of_motion'
] as const;

export type MetricTypeValue = typeof metricTypeEnum[number];

export interface IMetricTypeInfo extends Document {
  type: MetricTypeValue;
  label: string;
  description: string;
  unit: string;
  alternateUnits: string[];
  icon: string;
  color: string;
  minValue: number;
  maxValue: number;
  defaultIncrement: number;
  bestForExerciseTypes: string[];
}

const MetricTypeInfoSchema: Schema = new Schema<IMetricTypeInfo>({
  type: { 
    type: String, 
    enum: metricTypeEnum, 
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