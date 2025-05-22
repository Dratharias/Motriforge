import { GoalStatus, RelationshipStatus, IRelationshipStatusInfo, IGoalStatusInfo } from '@/types/models';
import mongoose, { Schema } from 'mongoose';

/** ============================
 *  This file list status
 *  - GoalStatus
 *  - RelationshipStatus
 ** ============================ */

/** ========================
 *  GoalStatus
 ** ======================== */

const GoalStatusInfoSchema: Schema = new Schema<IGoalStatusInfo>({
  status: { 
    type: String, 
    enum: GoalStatus, 
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

const RelationshipStatusInfoSchema: Schema = new Schema<IRelationshipStatusInfo>({
  status: { 
    type: String, 
    enum: RelationshipStatus, 
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