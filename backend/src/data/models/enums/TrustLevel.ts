import { ITrustLevelInfo, TrustLevel } from '@/types/models';
import mongoose, { Schema } from 'mongoose';

const TrustLevelInfoSchema: Schema = new Schema<ITrustLevelInfo>({
  level: { 
    type: String, 
    enum: TrustLevel, 
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