import mongoose, { Schema, Document } from 'mongoose';

const trustLevelEnum = [
  'unverified',
  'verified',
  'certified',
  'partner',
  'official'
] as const;

export type TrustLevelValue = typeof trustLevelEnum[number];

export interface ITrustLevelInfo extends Document {
  level: TrustLevelValue;
  label: string;
  description: string;
  icon: string;
  color: string;
  privileges: string[];
  requirements: string[];
  contentVisibility: string;
}

const TrustLevelInfoSchema: Schema = new Schema<ITrustLevelInfo>({
  level: { 
    type: String, 
    enum: trustLevelEnum, 
    required: true, 
    unique: true 
  },
  label: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  color: { type: String, required: true },
  privileges: { type: [String], required: true },
  requirements: { type: [String], required: true },
  contentVisibility: { type: String, required: true }
}, {
  timestamps: true
});

TrustLevelInfoSchema.index({ level: 1 });

export const TrustLevelInfoModel = mongoose.model<ITrustLevelInfo>('TrustLevelInfo', TrustLevelInfoSchema);