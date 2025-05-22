import { IOrganizationDocument, OrganizationRole, OrganizationRoleValue } from "@/types/models";
import mongoose, { Schema, Types } from "mongoose";
import { OrganizationRoleInfoModel } from "../enums/Organization";
import { OrganizationMemberModel } from "./OrganizationMember";


const AddressSchema = new Schema({
  street: { type: String },
  city: { type: String },
  state: { type: String },
  postalCode: { type: String },
  country: { type: String },
  coordinates: {
    latitude: { type: Number },
    longitude: { type: Number }
  }
}, { _id: false });

const ContactSchema = new Schema({
  phone: { type: String },
  email: { type: String, required: true },
  website: { type: String },
  socialMedia: {
    facebook: { type: String },
    instagram: { type: String },
    twitter: { type: String },
    linkedin: { type: String }
  }
}, { _id: false });

const SettingsSchema = new Schema({
  allowMemberInvites: { type: Boolean, default: true },
  requireAdminApproval: { type: Boolean, default: true },
  defaultMemberRole: { type: String, default: 'member' },
  contentSharingLevel: { type: String, default: 'organization' },
  customBranding: {
    logo: { type: String },
    colors: {
      primary: { type: String, default: '#3b82f6' },
      secondary: { type: String, default: '#1e40af' },
      accent: { type: String, default: '#f472b6' }
    }
  }
}, { _id: false });

const StatsSchema = new Schema({
  memberCount: { type: Number, default: 1 },
  exerciseCount: { type: Number, default: 0 },
  workoutCount: { type: Number, default: 0 },
  programCount: { type: Number, default: 0 },
  averageEngagement: { type: Number, default: 0 },
  lastActivityDate: { type: Date, default: Date.now }
}, { _id: false });


const OrganizationSchema = new Schema<IOrganizationDocument>({
  name: { 
    type: String, 
    required: true, 
    trim: true,
    index: true
  },
  type: { 
    type: String, 
    required: true
  },
  description: { 
    type: String, 
    required: true 
  },
  logoUrl: { 
    type: String 
  },
  owner: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    index: true
  },
  admins: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    index: true
  }],
  address: {
    type: AddressSchema,
    default: () => ({})
  },
  contact: {
    type: ContactSchema,
    required: true
  },
  visibility: { 
    type: String,
    required: true 
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  trustLevel: { 
    type: String,
    required: true 
  },
  settings: {
    type: SettingsSchema,
    default: () => ({})
  },
  stats: {
    type: StatsSchema,
    default: () => ({})
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  isArchived: { 
    type: Boolean, 
    default: false 
  }
}, {
  timestamps: true
});

// Indexes
OrganizationSchema.index({ name: 1 }, { unique: true });
OrganizationSchema.index({ visibility: 1 });
OrganizationSchema.index({ type: 1 });
OrganizationSchema.index({ isActive: 1, isArchived: 1 });

// Instance methods
OrganizationSchema.methods.addMember = async function(
  this: IOrganizationDocument,
  userId: Types.ObjectId, 
  role: OrganizationRoleValue, 
  invitedBy: Types.ObjectId
): Promise<IOrganizationDocument> {
  // Check if user is already a member
  const existingMember = await OrganizationMemberModel.findOne({
    organization: this._id,
    user: userId
  });

  if (existingMember) {
    if (existingMember.active) {
      throw new Error('User is already an active member of this organization');
    } else {
      // Reactivate existing member
      existingMember.role = new Types.ObjectId(role);
      await existingMember.save();
    }
  } else {
    // Create new membership
    await OrganizationMemberModel.create({
      organization: this._id,
      user: userId,
      role: role,
      invitedBy: invitedBy,
      active: true,
      permissions: [] // Default permissions
    });
  }

  // Update organization stats
  this.stats.memberCount = await OrganizationMemberModel.countDocuments({
    organization: this._id,
    active: true
  });
  await this.save();

  return this;
};

OrganizationSchema.methods.removeMember = async function(
  this: IOrganizationDocument,
  userId: Types.ObjectId
): Promise<IOrganizationDocument> {
  // Check if this is the owner (cannot remove)
  if (this.owner.equals(userId)) {
    throw new Error('Cannot remove organization owner');
  }

  // Find and deactivate the member
  const member = await OrganizationMemberModel.findOne({
    organization: this._id,
    user: userId,
    active: true
  });

  if (!member) {
    throw new Error('User is not an active member of this organization');
  }

  member.active = false;
  await member.save();

  // Update organization stats
  this.stats.memberCount = await OrganizationMemberModel.countDocuments({
    organization: this._id,
    active: true
  });

  // Remove from admins array if present
  this.admins = this.admins.filter(adminId => !adminId.equals(userId));
  await this.save();

  return this;
};

OrganizationSchema.methods.updateMemberRole = async function(
  this: IOrganizationDocument,
  userId: Types.ObjectId, 
  newRole: OrganizationRole
): Promise<IOrganizationDocument> {
  // Cannot change owner's role
  if (this.owner.equals(userId)) {
    throw new Error('Cannot change organization owner\'s role');
  }

  // Find the member
  const member = await OrganizationMemberModel.findOne({
    organization: this._id,
    user: userId,
    active: true
  });

  if (!member) {
    throw new Error('User is not an active member of this organization');
  }

  // Update role
  member.role = new Types.ObjectId(newRole);
  await member.save();

  // Update admins array based on new role
  const isNowAdmin = newRole === OrganizationRole.Admin; // Adjust according to your role constants
  const isCurrentlyAdmin = this.admins.some(adminId => adminId.equals(userId));

  if (isNowAdmin && !isCurrentlyAdmin) {
    this.admins.push(userId);
  } else if (!isNowAdmin && isCurrentlyAdmin) {
    this.admins = this.admins.filter(adminId => !adminId.equals(userId));
  }

  await this.save();
  return this;
};

OrganizationSchema.methods.hasMember = async function(
  this: IOrganizationDocument,
  userId: Types.ObjectId
): Promise<boolean> {
  // Check if user is owner or admin
  if (this.owner.equals(userId) || this.admins.some(adminId => adminId.equals(userId))) {
    return true;
  }

  // Check membership
  const member = await OrganizationMemberModel.findOne({
    organization: this._id,
    user: userId,
    active: true
  });

  return !!member;
};

OrganizationSchema.methods.canUserAccess = async function (
  this: IOrganizationDocument,
  userId: Types.ObjectId,
  requiredRole: OrganizationRoleValue
): Promise<boolean> {
  // Owner has full access
  if (this.owner.equals(userId)) return true;

  // Admins can access almost everything
  if (this.admins.some(adminId => adminId.equals(userId))) return true;

  // Find active membership
  const member = await OrganizationMemberModel.findOne({
    organization: this._id,
    user: userId,
    active: true
  });

  if (!member) return false;

  const [memberRoleInfo, requiredRoleInfo] = await Promise.all([
    OrganizationRoleInfoModel.findOne({ role: member.role }),
    OrganizationRoleInfoModel.findOne({ role: requiredRole })
  ]);

  if (!memberRoleInfo || !requiredRoleInfo) {
    console.warn(`Role info not found: member=${member.role}, required=${requiredRole}`);
    return false;
  }

  return memberRoleInfo.level <= requiredRoleInfo.level;
};

export const OrganizationModel = mongoose.model<IOrganizationDocument, IOrganizationModel>('Organization', OrganizationSchema);