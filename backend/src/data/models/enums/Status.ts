import mongoose, { Schema, Document } from 'mongoose';

/** ============================
 *  This file list status
 *  - GoalStatus
 *  - RelationshipStatus
 ** ============================ */

/** ========================
 *  GoalStatus
 ** ======================== */

const goalStatusEnum = [
  'not_started',
  'in_progress',
  'on_track',
  'behind',
  'achieved',
  'missed'
] as const;

export type GoalStatusValue = typeof goalStatusEnum[number];

export interface IGoalStatusInfo extends Document {
  status: GoalStatusValue;
  label: string;
  description: string;
  icon: string;
  color: string;
  progressRequired: number; // percentage of progress required
  recommendedActions: string[];
  alertLevel: string;
}

const GoalStatusInfoSchema: Schema = new Schema<IGoalStatusInfo>({
  status: { 
    type: String, 
    enum: goalStatusEnum, 
    required: true, 
    unique: true 
  },
  label: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  color: { type: String, required: true },
  progressRequired: { 
    type: Number, 
    required: true, 
    min: 0, 
    max: 100 
  },
  recommendedActions: { type: [String], required: true },
  alertLevel: { type: String, required: true }
}, {
  timestamps: true
});

GoalStatusInfoSchema.index({ status: 1 });
GoalStatusInfoSchema.index({ progressRequired: 1 });

export const GoalStatusInfoModel = mongoose.model<IGoalStatusInfo>('GoalStatusInfo', GoalStatusInfoSchema);

/** ========================
 *  RelationshipStatus
 ** ======================== */

const relationshipStatusEnum = [
  'pending',
  'active',
  'paused',
  'terminated',
  'expired'
] as const;

export type RelationshipStatusValue = typeof relationshipStatusEnum[number];

export interface IRelationshipStatusInfo extends Document {
  status: RelationshipStatusValue;
  label: string;
  description: string;
  icon: string;
  color: string;
  allowedActions: string[];
  clientPermissions: boolean;
  trainerPermissions: boolean;
  recommendedFollowUp: string;
}

const RelationshipStatusInfoSchema: Schema = new Schema<IRelationshipStatusInfo>({
  status: { 
    type: String, 
    enum: relationshipStatusEnum, 
    required: true, 
    unique: true 
  },
  label: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  color: { type: String, required: true },
  allowedActions: { type: [String], required: true },
  clientPermissions: { type: Boolean, required: true },
  trainerPermissions: { type: Boolean, required: true },
  recommendedFollowUp: { type: String, required: true }
}, {
  timestamps: true
});

RelationshipStatusInfoSchema.index({ status: 1 });

export const RelationshipStatusInfoModel = mongoose.model<IRelationshipStatusInfo>('RelationshipStatusInfo', RelationshipStatusInfoSchema);