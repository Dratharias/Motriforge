import { ActivityAction, IActivityActionInfo, ITimeResolutionInfo, TimeResolution } from '@/types/models';
import mongoose, { Schema } from 'mongoose';

/** ============================
 *  This file list analytics
 *  - TimeResolution
 *  - ActivityAction
 ** ============================ */

const TimeResolutionInfoSchema: Schema = new Schema<ITimeResolutionInfo>({
  resolution: { 
    type: String, 
    enum: TimeResolution, 
    required: true, 
    unique: true 
  },
  label: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  color: { type: String, required: true },
  durationInDays: { type: Number, required: true },
  format: { type: String, required: true },
  recommendedUse: { type: String, required: true }
}, {
  timestamps: true
});

TimeResolutionInfoSchema.index({ resolution: 1 });
TimeResolutionInfoSchema.index({ durationInDays: 1 });

export const TimeResolutionInfoModel = mongoose.model<ITimeResolutionInfo>('TimeResolutionInfo', TimeResolutionInfoSchema);

/** ========================
 *  ActivityAction
 ** ======================== */

const ActivityActionInfoSchema: Schema = new Schema<IActivityActionInfo>({
  action: {
    type: String,
    enum: ActivityAction,
    required: true
  },
  label: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  color: { type: String, required: true },
  category: { type: String, required: true },
  points: { type: Number, required: true, default: 0 },
  requiresVerification: { type: Boolean, required: true, default: false },
  notifiable: { type: Boolean, required: true, default: true },
  displayInFeed: { type: Boolean, required: true, default: true }
}, {
  timestamps: true
});

ActivityActionInfoSchema.index({ action: 1 });
ActivityActionInfoSchema.index({ category: 1 });
ActivityActionInfoSchema.index({ points: 1 });

export const ActivityActionInfoModel = mongoose.model<IActivityActionInfo>('ActivityActionInfo', ActivityActionInfoSchema);