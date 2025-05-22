import { IOrganizationDocument, OrganizationRoleValue } from "@/types/models";
import mongoose, { Schema, Types } from "mongoose";
import { OrganizationRoleInfoModel } from "../enums/Organization";
import { OrganizationMemberModel } from "./OrganizationMember";
import { AddressSchema, ContactSchema } from "../Contact";
import { logger } from "@/core/logging";
import { ApplicationError } from "@/core/error/exceptions/ApplicationError";
import { SettingsSchema, StatsSchema } from "./Settings";

const OrganizationSchema = new Schema<IOrganizationDocument>({
  name: { 
    type: String, 
    required: true, 
    trim: true,
    index: true
  },
  type: { 
    type: String, 
    required: true,
    index: true
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
    required: true,
    index: true
  },
  isVerified: { 
    type: Boolean, 
    default: false,
    index: true
  },
  trustLevel: { 
    type: String,
    required: true,
    index: true
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
    default: true,
    index: true
  },
  isArchived: { 
    type: Boolean, 
    default: false,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for performance
OrganizationSchema.index({ name: 1 }, { unique: true });
OrganizationSchema.index({ visibility: 1, isActive: 1 });
OrganizationSchema.index({ type: 1, trustLevel: 1 });
OrganizationSchema.index({ isActive: 1, isArchived: 1 });
OrganizationSchema.index({ owner: 1, isActive: 1 });

// Instance methods
OrganizationSchema.methods.addMember = async function(
  this: IOrganizationDocument,
  userId: Types.ObjectId, 
  roleValue: OrganizationRoleValue, 
  invitedBy: Types.ObjectId
): Promise<IOrganizationDocument> {
  try {
    const roleInfo = await OrganizationRoleInfoModel.findOne({ role: roleValue });
    if (!roleInfo) {
      throw new ApplicationError(`Invalid role: ${roleValue}`, 'VALIDATION_ERROR');
    }

    const existingMember = await OrganizationMemberModel.findOne({
      organization: this._id,
      user: userId
    });

    if (existingMember) {
      if (existingMember.active) {
        throw new ApplicationError('User is already an active member of this organization', 'CONFLICT');
      } else {
        existingMember.role = roleInfo._id;
        existingMember.active = true;
        existingMember.invitedBy = invitedBy;
        await existingMember.save();
        logger.info(`Reactivated member ${userId} in organization ${this._id} with role ${roleValue}`);
      }
    } else {
      await OrganizationMemberModel.create({
        organization: this._id,
        user: userId,
        role: roleInfo._id,
        invitedBy: invitedBy,
        active: true,
        permissions: roleInfo.permissions || []
      });
      logger.info(`Added new member ${userId} to organization ${this._id} with role ${roleValue}`);
    }

    const memberCount = await OrganizationMemberModel.countDocuments({
      organization: this._id,
      active: true
    });
    
    this.stats.memberCount = memberCount;
    this.stats.lastActivityDate = new Date();
    await this.save();

    return this;
  } catch (error) {
    logger.error(`Failed to add member to organization ${this._id}:`, error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
};

OrganizationSchema.methods.removeMember = async function(
  this: IOrganizationDocument,
  userId: Types.ObjectId
): Promise<IOrganizationDocument> {
  try {
    if (this.owner.equals(userId)) {
      throw new ApplicationError('Cannot remove organization owner', 'FORBIDDEN');
    }

    const member = await OrganizationMemberModel.findOne({
      organization: this._id,
      user: userId,
      active: true
    });

    if (!member) {
      throw new ApplicationError('User is not an active member of this organization', 'NOT_FOUND');
    }

    member.active = false;
    await member.save();

    const memberCount = await OrganizationMemberModel.countDocuments({
      organization: this._id,
      active: true
    });
    this.stats.memberCount = memberCount;
    this.stats.lastActivityDate = new Date();

    this.admins = this.admins.filter(adminId => !adminId.equals(userId));
    await this.save();

    logger.info(`Removed member ${userId} from organization ${this._id}`);
    return this;
  } catch (error) {
    logger.error(`Failed to remove member from organization ${this._id}:`, error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
};

OrganizationSchema.methods.updateMemberRole = async function(
  this: IOrganizationDocument,
  userId: Types.ObjectId, 
  newRoleValue: OrganizationRoleValue
): Promise<IOrganizationDocument> {
  try {
    if (this.owner.equals(userId)) {
      throw new ApplicationError('Cannot change organization owner\'s role', 'FORBIDDEN');
    }

    const newRoleInfo = await OrganizationRoleInfoModel.findOne({ role: newRoleValue });
    if (!newRoleInfo) {
      throw new ApplicationError(`Invalid role: ${newRoleValue}`, 'VALIDATION_ERROR');
    }

    const member = await OrganizationMemberModel.findOne({
      organization: this._id,
      user: userId,
      active: true
    });

    if (!member) {
      throw new ApplicationError('User is not an active member of this organization', 'NOT_FOUND');
    }

    member.role = newRoleInfo._id;
    member.permissions = newRoleInfo.permissions || [];
    await member.save();

    const isAdminRole = newRoleInfo.role === 'Admin';
    const isCurrentlyAdmin = this.admins.some(adminId => adminId.equals(userId));

    if (isAdminRole && !isCurrentlyAdmin) {
      this.admins.push(userId);
    } else if (!isAdminRole && isCurrentlyAdmin) {
      this.admins = this.admins.filter(adminId => !adminId.equals(userId));
    }

    this.stats.lastActivityDate = new Date();
    await this.save();

    logger.info(`Updated member ${userId} role to ${newRoleValue} in organization ${this._id}`);
    return this;
  } catch (error) {
    logger.error(`Failed to update member role in organization ${this._id}:`, error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
};

OrganizationSchema.methods.hasMember = async function(
  this: IOrganizationDocument,
  userId: Types.ObjectId
): Promise<boolean> {
  try {
    if (this.owner.equals(userId)) {
      return true;
    }

    const member = await OrganizationMemberModel.findOne({
      organization: this._id,
      user: userId,
      active: true
    }, '_id');

    return !!member;
  } catch (error) {
    logger.error(`Failed to check membership for user ${userId} in organization ${this._id}:`, error instanceof Error ? error : new Error(String(error)));
    return false;
  }
};

OrganizationSchema.methods.canUserAccess = async function (
  this: IOrganizationDocument,
  userId: Types.ObjectId,
  requiredRoleValue: OrganizationRoleValue
): Promise<boolean> {
  try {
    if (this.owner.equals(userId)) return true;

    const member = await OrganizationMemberModel.findOne({
      organization: this._id,
      user: userId,
      active: true
    }).populate('role');

    if (!member || !member.role) return false;

    const requiredRoleInfo = await OrganizationRoleInfoModel.findOne({ 
      role: requiredRoleValue 
    });

    if (!requiredRoleInfo) {
      logger.warn(`Required role not found: ${requiredRoleValue}`);
      return false;
    }

    const memberRoleInfo = member.role as any;
    return memberRoleInfo.level <= requiredRoleInfo.level;
  } catch (error) {
    logger.error(`Failed to check user access for ${userId} in organization ${this._id}:`, error instanceof Error ? error : new Error(String(error)));
    return false;
  }
};

export const OrganizationModel = mongoose.model<IOrganizationDocument>('Organization', OrganizationSchema);