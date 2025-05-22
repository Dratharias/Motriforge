// Organization and membership related types

import { Types, Document } from 'mongoose';
import { IBaseModel, IAddress, IContact, IOrganizationSettings, IOrganizationStats } from './common';
import { InvitationStatus, OrganizationRoleValue, OrganizationTypeValue, OrganizationVisibilityValue, TrustLevelValue } from './enums';

/**
 * Organization member interface
 */
export interface IOrganizationMember extends IBaseModel {
  readonly organization: Types.ObjectId;
  readonly user: Types.ObjectId;
  role: Types.ObjectId;
  permissions: readonly string[];
  readonly joinedAt: Date;
  active: boolean;
  invitedBy: Types.ObjectId;
}

/**
 * Core organization interface
 */
export interface IOrganization extends IBaseModel {
  readonly name: string;
  readonly type: OrganizationTypeValue;
  readonly description: string;
  readonly logoUrl: string;
  readonly owner: Types.ObjectId;
  admins: Types.ObjectId[];
  readonly address: IAddress;
  readonly contact: IContact;
  readonly visibility: OrganizationVisibilityValue;
  readonly isVerified: boolean;
  readonly trustLevel: TrustLevelValue;
  readonly settings: IOrganizationSettings;
  readonly stats: IOrganizationStats;
  readonly isActive: boolean;
  readonly isArchived: boolean;
  readonly members: IOrganizationMember[];
}

/**
 * Organization invitation interface
 */
export interface IInvitation extends IBaseModel {
  readonly organization: Types.ObjectId;
  readonly email: string;
  readonly invitedBy: Types.ObjectId;
  readonly role: string;
  status: InvitationStatus;
  readonly token: string;
  readonly message?: string;
  readonly expiresAt: Date;
  readonly acceptedAt?: Date;
  readonly declinedAt?: Date;
  readonly revokedAt?: Date;
  readonly permissions?: readonly string[];
}

/**
 * Organization type info interface
 */
export interface IOrganizationTypeInfo extends IBaseModel {
  readonly type: OrganizationTypeValue;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly color: string;
  readonly memberRoles: readonly string[];
  readonly features: readonly string[];
  readonly limitations: readonly string[];
}

/**
 * Organization visibility info interface
 */
export interface IOrganizationVisibilityInfo extends IBaseModel {
  readonly visibility: OrganizationVisibilityValue;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly color: string;
  readonly searchable: boolean;
  readonly joinable: boolean;
  readonly viewableContent: boolean;
  readonly requiresApproval: boolean;
}

/**
 * Organization role info interface
 */
export interface IOrganizationRoleInfo extends IBaseModel {
  readonly role: OrganizationRoleValue;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly color: string;
  readonly permissions: readonly string[];
  readonly canInvite: boolean;
  readonly canModify: boolean;
  readonly canDelete: boolean;
  readonly level: number;
}

/**
 * Trust level info interface
 */
export interface ITrustLevelInfo extends IBaseModel {
  readonly level: TrustLevelValue;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly color: string;
  readonly privileges: readonly string[];
  readonly requirements: readonly string[];
  readonly contentVisibility: string;
}

/**
 * Extended organization document interface with Mongoose methods
 */
export interface IOrganizationDocument extends Omit<IOrganization, '_id'>, Document {
  _id: Types.ObjectId;
  addMember(userId: Types.ObjectId, role: OrganizationRoleValue, invitedBy: Types.ObjectId): Promise<IOrganizationDocument>;
  removeMember(userId: Types.ObjectId): Promise<IOrganizationDocument>;
  updateMemberRole(userId: Types.ObjectId, newRole: OrganizationRoleValue): Promise<IOrganizationDocument>;
  hasMember(userId: Types.ObjectId): Promise<boolean>;
  canUserAccess(userId: Types.ObjectId, requiredRole: OrganizationRoleValue): Promise<boolean>;
}

/**
 * Extended invitation document interface with Mongoose methods
 */
export interface IInvitationDocument extends Omit<IInvitation, '_id'>, Document {
  _id: Types.ObjectId;
  accept(): Promise<IInvitationDocument>;
  decline(): Promise<IInvitationDocument>;
  revoke(): Promise<IInvitationDocument>;
  isExpired(): boolean;
  canBeAccepted(): boolean;
}

/**
 * Member creation data for adding new members
 */
export interface IMemberCreationData {
  user: Types.ObjectId;
  role: Types.ObjectId;
  permissions?: string[];
  invitedBy: Types.ObjectId;
  joinedAt?: Date;
  active?: boolean;
}

/**
 * Member update data for modifying existing members
 */
export interface IMemberUpdateData {
  role?: Types.ObjectId;
  permissions?: string[];
  active?: boolean;
}

/**
 * Organization creation data
 */
export interface IOrganizationCreationData {
  name: string;
  type: OrganizationTypeValue;
  description?: string;
  logoUrl?: string;
  owner: Types.ObjectId;
  address?: Partial<IAddress>;
  contact?: Partial<IContact>;
  visibility?: OrganizationVisibilityValue;
  settings?: Partial<IOrganizationSettings>;
}

/**
 * Organization update data
 */
export interface IOrganizationUpdateData {
  name?: string;
  description?: string;
  logoUrl?: string;
  address?: Partial<IAddress>;
  contact?: Partial<IContact>;
  visibility?: OrganizationVisibilityValue;
  settings?: Partial<IOrganizationSettings>;
  admins?: Types.ObjectId[];
  isActive?: boolean;
  isArchived?: boolean;
}

/**
 * Organization search criteria
 */
export interface IOrganizationSearchCriteria {
  name?: string;
  type?: OrganizationTypeValue;
  visibility?: OrganizationVisibilityValue;
  trustLevel?: TrustLevelValue;
  isVerified?: boolean;
  isActive?: boolean;
  ownerId?: Types.ObjectId;
  memberUserId?: Types.ObjectId;
}

/**
 * Member search criteria
 */
export interface IMemberSearchCriteria {
  organizationId: Types.ObjectId;
  role?: Types.ObjectId;
  active?: boolean;
  joinedAfter?: Date;
  joinedBefore?: Date;
  invitedBy?: Types.ObjectId;
}

/**
 * Organization statistics update data
 */
export interface IOrganizationStatsUpdate {
  memberCount?: number;
  exerciseCount?: number;
  workoutCount?: number;
  programCount?: number;
  averageEngagement?: number;
  lastActivityDate?: Date;
}