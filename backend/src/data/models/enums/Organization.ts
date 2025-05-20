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

const organizationTypeEnum = [
  'gym',
  'studio',
  'personal_trainer',
  'physical_therapy',
  'corporate',
  'school',
  'team',
  'family',
  'other'
] as const;

export type OrganizationTypeValue = typeof organizationTypeEnum[number];

export interface IOrganizationTypeInfo extends Document {
  type: OrganizationTypeValue;
  label: string;
  description: string;
  icon: string;
  color: string;
  memberRoles: string[];
  features: string[];
  limitations: string[];
}

const OrganizationTypeInfoSchema: Schema = new Schema<IOrganizationTypeInfo>({
  type: { 
    type: String, 
    enum: organizationTypeEnum, 
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

const organizationVisibilityEnum = [
  'public',
  'private',
  'secret'
] as const;

export type OrganizationVisibilityValue = typeof organizationVisibilityEnum[number];

export interface IOrganizationVisibilityInfo extends Document {
  visibility: OrganizationVisibilityValue;
  label: string;
  description: string;
  icon: string;
  color: string;
  searchable: boolean;
  joinable: boolean;
  viewableContent: boolean;
  requiresApproval: boolean;
}

const OrganizationVisibilityInfoSchema: Schema = new Schema<IOrganizationVisibilityInfo>({
  visibility: { 
    type: String, 
    enum: organizationVisibilityEnum, 
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

const organizationRoleEnum = [
  'owner',
  'admin',
  'manager',
  'trainer',
  'member',
  'guest'
] as const;

export type OrganizationRoleValue = typeof organizationRoleEnum[number];

export interface IOrganizationRoleInfo extends Document {
  role: OrganizationRoleValue;
  label: string;
  description: string;
  icon: string;
  color: string;
  permissions: string[];
  canInvite: boolean;
  canModify: boolean;
  canDelete: boolean;
  level: number; // Hierarchy level: 1 for Owner (highest), 6 for Guest (lowest)
}

const OrganizationRoleInfoSchema: Schema = new Schema<IOrganizationRoleInfo>({
  role: { 
    type: String, 
    enum: organizationRoleEnum, 
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