import mongoose, { Schema, Document } from 'mongoose';

/** ============================
 *  This file list analytics
 *  - TimeResolution
 *  - ActivityAction
 ** ============================ */

/** ========================
 *  TimeResolution
 ** ======================== */

const timeResolutionEnum = [
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'yearly'
] as const;

export type TimeResolutionValue = typeof timeResolutionEnum[number];

export interface ITimeResolutionInfo extends Document {
  resolution: TimeResolutionValue;
  label: string;
  description: string;
  icon: string;
  color: string;
  durationInDays: number;
  format: string;
  recommendedUse: string;
}

const TimeResolutionInfoSchema: Schema = new Schema<ITimeResolutionInfo>({
  resolution: { 
    type: String, 
    enum: timeResolutionEnum, 
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

const activityActionEnum = [
  'workout_started',
  'workout_completed',
  'workout_paused',
  'workout_resumed',
  'workout_cancelled',
  'program_started',
  'program_completed',
  'program_paused',
  'program_resumed',
  'program_cancelled',
  'exercise_completed',
  'personal_record',
  'goal_achieved',
  'feedback_received',
  'profile_updated',
  'logged_in',
  'logged_out',
  'joined_organization',
  'content_created',
  'content_saved'
] as const;

export type ActivityActionValue = typeof activityActionEnum[number];

export interface IActivityActionInfo extends Document {
  action: ActivityActionValue;
  label: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  points: number; // Points awarded for this action
  requiresVerification: boolean;
  notifiable: boolean;
  displayInFeed: boolean;
}

const ActivityActionInfoSchema: Schema = new Schema<IActivityActionInfo>({
  action: { 
    type: String, 
    enum: activityActionEnum, 
    required: true, 
    unique: true 
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