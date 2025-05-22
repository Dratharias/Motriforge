import { IOrganizationTypeInfo, IOrganizationVisibilityInfo, IOrganizationRoleInfo, OrganizationRole, OrganizationType, OrganizationVisibility } from '@/types/models';
import mongoose, { Schema, Document } from 'mongoose';

/** ============================
 *  This file list organization
 *  - Visibility
 *  - Role
 *  - Types
 ** ============================ */

/** ========================
 *  Organization Type
 ** ======================== */

const OrganizationTypeInfoSchema: Schema = new Schema<IOrganizationTypeInfo>({
  type: { 
    type: String, 
    enum: OrganizationType, 
    required: true, 
    unique: true 
  },
  label: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  color: { type: String, required: true },
  memberRoles: { type: [String], required: true },
  features: { type: [String], required: true },
  limitations: { type: [String], required: true }
}, {
  timestamps: true
});

OrganizationTypeInfoSchema.index({ type: 1 });

export const OrganizationTypeInfoModel = mongoose.model<IOrganizationTypeInfo>('OrganizationTypeInfo', OrganizationTypeInfoSchema);

/** ========================
 *  Organization Visibility
 ** ======================== */


const OrganizationVisibilityInfoSchema: Schema = new Schema<IOrganizationVisibilityInfo>({
  visibility: { 
    type: String, 
    enum: OrganizationVisibility, 
    required: true, 
    unique: true 
  },
  label: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  color: { type: String, required: true },
  searchable: { type: Boolean, required: true },
  joinable: { type: Boolean, required: true },
  viewableContent: { type: Boolean, required: true },
  requiresApproval: { type: Boolean, required: true }
}, {
  timestamps: true
});

OrganizationVisibilityInfoSchema.index({ visibility: 1 });

export const OrganizationVisibilityInfoModel = mongoose.model<IOrganizationVisibilityInfo>('OrganizationVisibilityInfo', OrganizationVisibilityInfoSchema);

/** ========================
 *  Organization Role
 ** ======================== */

const OrganizationRoleInfoSchema: Schema = new Schema<IOrganizationRoleInfo>({
  role: { 
    type: String, 
    enum: OrganizationRole, 
    required: true, 
    unique: true 
  },
  label: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  color: { type: String, required: true },
  permissions: { type: [String], required: true },
  canInvite: { type: Boolean, required: true },
  canModify: { type: Boolean, required: true },
  canDelete: { type: Boolean, required: true },
  level: { type: Number, required: true, min: 1, max: 6 }
}, {
  timestamps: true
});

OrganizationRoleInfoSchema.index({ role: 1 });
OrganizationRoleInfoSchema.index({ level: 1 });

export const OrganizationRoleInfoModel = mongoose.model<IOrganizationRoleInfo>('OrganizationRoleInfo', OrganizationRoleInfoSchema);