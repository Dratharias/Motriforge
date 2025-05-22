import { IPermissionSet } from '@/types/models';
import mongoose, { Schema } from 'mongoose';

const PermissionSetSchema: Schema = new Schema<IPermissionSet>({
  viewWorkoutHistory: {
    type: Boolean,
    default: true
  },
  viewProgressionData: {
    type: Boolean,
    default: true
  },
  viewPersonalData: {
    type: Boolean,
    default: false
  },
  assignWorkouts: {
    type: Boolean,
    default: true
  },
  assignPrograms: {
    type: Boolean,
    default: true
  },
  modifyWorkouts: {
    type: Boolean,
    default: true
  },
  viewActivityStatus: {
    type: Boolean,
    default: true
  },
  canContactOutsideHours: {
    type: Boolean,
    default: false
  },
  viewNutritionData: {
    type: Boolean,
    default: false
  },
  provideFeedback: {
    type: Boolean,
    default: true
  },
  modifyGoals: {
    type: Boolean,
    default: true
  },
  exportClientData: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Instance methods
PermissionSetSchema.methods.viewAllClientData = function(): boolean {
  return this.viewWorkoutHistory && this.viewProgressionData && 
         this.viewPersonalData && this.viewActivityStatus &&
         this.viewNutritionData;
};

PermissionSetSchema.methods.updatePermissions = function(
  permissions: Partial<IPermissionSet>
): void {
  Object.assign(this, permissions);
};

export const PermissionSetModel = mongoose.model<IPermissionSet>('PermissionSet', PermissionSetSchema);