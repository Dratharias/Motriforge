import { BaseRepository } from './BaseRepository';
import { Database } from '../database/Database';
import { LoggerFacade } from '../../core/logging/LoggerFacade';
import { EventMediator } from '../../core/events/EventMediator';
import { ValidationError } from '../../core/error/exceptions/ValidationError';
import { DatabaseError, EntityNotFoundError } from '../../core/error/exceptions/DatabaseError';
import { Filter, ObjectId, OptionalUnlessRequiredId } from 'mongodb';

/**
 * Organization model interface
 */
export interface Organization {
  _id?: ObjectId;
  name: string;
  type: string;
  description: string;
  logoUrl?: string;
  owner: ObjectId;
  admins: ObjectId[];
  address?: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  contact?: {
    email?: string;
    phone?: string;
    website?: string;
  };
  visibility: 'public' | 'private' | 'secret';
  isVerified: boolean;
  trustLevel: 'unverified' | 'verified' | 'certified' | 'partner' | 'official';
  settings: {
    allowMemberInvite: boolean;
    allowPublicJoin: boolean;
    defaultRole: string;
    contentModeration: string;
    dataSharing: string;
  };
  stats: {
    memberCount: number;
    contentCount: number;
    activityLevel: number;
    creationDate: Date;
    lastActivity: Date;
  };
  isActive: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Organization member interface
 */
export interface OrganizationMember {
  _id?: ObjectId;
  organizationId: ObjectId;
  userId: ObjectId;
  role: string;
  permissions?: string[];
  joinedAt: Date;
  active: boolean;
  invitedBy?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data required to create a new organization
 */
export interface OrganizationCreationData {
  name: string;
  type: string;
  description: string;
  logoUrl?: string;
  owner: string | ObjectId;
  visibility?: 'public' | 'private' | 'secret';
  address?: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  contact?: {
    email?: string;
    phone?: string;
    website?: string;
  };
  settings?: {
    allowMemberInvite?: boolean;
    allowPublicJoin?: boolean;
    defaultRole?: string;
    contentModeration?: string;
    dataSharing?: string;
  };
}

/**
 * Data required to add a member to an organization
 */
export interface MemberData {
  userId: string | ObjectId;
  role: string;
  permissions?: string[];
  invitedBy?: string | ObjectId;
}

/**
 * Data for updating an organization member
 */
export interface MemberUpdateData {
  role?: string;
  permissions?: string[];
  active?: boolean;
}

/**
 * Repository for organization data access
 */
export class OrganizationRepository extends BaseRepository<Organization> {
  private readonly membersCollectionName: string = 'organization_members';
  
  constructor(
    db: Database,
    logger: LoggerFacade,
    eventMediator?: EventMediator
  ) {
    super('organizations', db, logger, eventMediator);
  }

  public async findByName(name: string): Promise<Organization | null> {
    return this.findOne({ name });
  }

  public async findByOwnerId(ownerId: string | ObjectId): Promise<Organization[]> {
    const ownerObjectId = this.convertToObjectId(ownerId);
    return this.find({ owner: ownerObjectId });
  }

  public async findForUser(userId: string | ObjectId, includeInactive: boolean = false): Promise<Organization[]> {
    const userObjectId = this.convertToObjectId(userId);
    
    const memberships = await this.getUserMemberships(userObjectId, includeInactive);
    if (memberships.length === 0) {
      return [];
    }
    
    const organizationIds = memberships.map(m => m.organizationId);
    return this.find({ 
      _id: { $in: organizationIds },
      isArchived: false,
      isActive: true
    });
  }

  public async create(data: OrganizationCreationData): Promise<Organization> {
    await this.validateOrganizationNameUniqueness(data.name);
    
    const ownerObjectId = this.convertToObjectId(data.owner);
    const organizationData = this.buildOrganizationData(data, ownerObjectId);
    
    return this.withTransaction(async (transaction) => {
      const org = await transaction.insertOne(this.collectionName, organizationData);
      await this.createOwnerMembership(transaction, org._id, ownerObjectId);
      return org as Organization;
    });
  }

  public async addMember(organizationId: string | ObjectId, member: MemberData): Promise<OrganizationMember> {
    const orgObjectId = this.convertToObjectId(organizationId);
    const userObjectId = this.convertToObjectId(member.userId);
    
    await this.findById(orgObjectId); // Validate organization exists
    
    const existingMember = await this.findExistingMember(orgObjectId, userObjectId);
    
    if (existingMember?.active) {
      throw new ValidationError(
        'User is already a member of this organization',
        [{ field: 'userId', message: 'User is already a member of this organization' }],
        'ALREADY_MEMBER'
      );
    }
    
    if (existingMember && !existingMember.active) {
      return this.reactivateMember(existingMember, member, orgObjectId, userObjectId);
    }
    
    return this.createNewMember(orgObjectId, userObjectId, member);
  }

  public async removeMember(organizationId: string | ObjectId, userId: string | ObjectId): Promise<boolean> {
    const orgObjectId = this.convertToObjectId(organizationId);
    const userObjectId = this.convertToObjectId(userId);
    
    const organization = await this.findById(orgObjectId);
    this.validateCanRemoveMember(organization, userObjectId);
    
    const member = await this.findActiveMember(orgObjectId, userObjectId);
    if (!member) {
      return false;
    }
    
    await this.deactivateMember(member);
    await this.updateOrganizationStats(orgObjectId, -1);
    await this.removeFromAdminsIfNeeded(organization, userObjectId);
    
    return true;
  }

  public async updateMember(
    organizationId: string | ObjectId,
    userId: string | ObjectId,
    updates: MemberUpdateData
  ): Promise<OrganizationMember> {
    const orgObjectId = this.convertToObjectId(organizationId);
    const userObjectId = this.convertToObjectId(userId);
    
    const organization = await this.findById(orgObjectId);
    const existingMember = await this.getMember(orgObjectId, userObjectId);
    
    this.validateMemberUpdate(organization, userObjectId, updates);
    
    const updateData = this.buildMemberUpdateData(updates);
    await this.updateMemberRecord(existingMember, updateData);
    
    await this.handleMemberCountChange(orgObjectId, existingMember, updates);
    await this.handleRoleChange(orgObjectId, userObjectId, existingMember, updates);
    
    return this.getMember(orgObjectId, userObjectId);
  }

  public async getMembers(
    organizationId: string | ObjectId,
    includeInactive: boolean = false
  ): Promise<OrganizationMember[]> {
    const orgObjectId = this.convertToObjectId(organizationId);
    await this.findById(orgObjectId); // Validate organization exists
    
    return this.getUserMemberships(orgObjectId, includeInactive);
  }

  public async getMember(
    organizationId: string | ObjectId,
    userId: string | ObjectId
  ): Promise<OrganizationMember> {
    const orgObjectId = this.convertToObjectId(organizationId);
    const userObjectId = this.convertToObjectId(userId);
    
    await this.findById(orgObjectId); // Validate organization exists
    
    const member = await this.findExistingMember(orgObjectId, userObjectId);
    if (!member) {
      throw new EntityNotFoundError(
        'OrganizationMember',
        `${orgObjectId.toString()}_${userObjectId.toString()}`
      );
    }
    
    return member;
  }

  public async archive(id: string | ObjectId): Promise<boolean> {
    return this.updateArchiveStatus(id, true);
  }

  public async restore(id: string | ObjectId): Promise<boolean> {
    return this.updateArchiveStatus(id, false);
  }

  // Private helper methods

  private convertToObjectId(id: string | ObjectId): ObjectId {
    return typeof id === 'string' ? new ObjectId(id) : id;
  }

  private async validateOrganizationNameUniqueness(name: string): Promise<void> {
    const existingOrg = await this.findByName(name);
    if (existingOrg) {
      throw new ValidationError(
        'Organization name already exists',
        [{ field: 'name', message: 'Organization name already exists' }],
        'NAME_ALREADY_EXISTS'
      );
    }
  }

  private buildOrganizationData(data: OrganizationCreationData, ownerObjectId: ObjectId): OptionalUnlessRequiredId<Organization> {
    const now = new Date();
    
    return {
      name: data.name,
      type: data.type,
      description: data.description,
      logoUrl: data.logoUrl,
      owner: ownerObjectId,
      admins: [ownerObjectId],
      visibility: data.visibility ?? 'private',
      address: data.address,
      contact: data.contact,
      isVerified: false,
      trustLevel: 'unverified',
      settings: this.buildOrganizationSettings(data.settings),
      stats: this.buildInitialStats(now),
      isActive: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now
    };
  }

  private buildOrganizationSettings(settings?: OrganizationCreationData['settings']) {
    return {
      allowMemberInvite: settings?.allowMemberInvite ?? false,
      allowPublicJoin: settings?.allowPublicJoin ?? false,
      defaultRole: settings?.defaultRole ?? 'member',
      contentModeration: settings?.contentModeration ?? 'standard',
      dataSharing: settings?.dataSharing ?? 'private'
    };
  }

  private buildInitialStats(now: Date) {
    return {
      memberCount: 1, // Owner is the first member
      contentCount: 0,
      activityLevel: 0,
      creationDate: now,
      lastActivity: now
    };
  }

  private async createOwnerMembership(transaction: any, orgId: ObjectId, ownerId: ObjectId): Promise<void> {
    const now = new Date();
    await transaction.insertOne(this.membersCollectionName, {
      organizationId: orgId,
      userId: ownerId,
      role: 'owner',
      permissions: ['*'],
      joinedAt: now,
      active: true,
      createdAt: now,
      updatedAt: now
    } as OptionalUnlessRequiredId<OrganizationMember>);
  }

  private async getUserMemberships(
    entityId: ObjectId,
    includeInactive: boolean,
    isUserId: boolean = true
  ): Promise<OrganizationMember[]> {
    const membersCollection = this.db.getCollection<OrganizationMember>(this.membersCollectionName);
    const query: Filter<OrganizationMember> = isUserId 
      ? { userId: entityId }
      : { organizationId: entityId };
    
    if (!includeInactive) {
      query.active = true;
    }
    
    return membersCollection.find(query);
  }

  private async findExistingMember(orgId: ObjectId, userId: ObjectId): Promise<OrganizationMember | null> {
    const membersCollection = this.db.getCollection<OrganizationMember>(this.membersCollectionName);
    return membersCollection.findOne({
      organizationId: orgId,
      userId: userId
    });
  }

  private async findActiveMember(orgId: ObjectId, userId: ObjectId): Promise<OrganizationMember | null> {
    const membersCollection = this.db.getCollection<OrganizationMember>(this.membersCollectionName);
    return membersCollection.findOne({
      organizationId: orgId,
      userId: userId,
      active: true
    });
  }

  private async reactivateMember(
    existingMember: OrganizationMember,
    member: MemberData,
    orgId: ObjectId,
    userId: ObjectId
  ): Promise<OrganizationMember> {
    const now = new Date();
    const invitedByObjectId = member.invitedBy 
      ? this.convertToObjectId(member.invitedBy)
      : undefined;
    
    const membersCollection = this.db.getCollection<OrganizationMember>(this.membersCollectionName);
    await membersCollection.updateOne(
      { _id: existingMember._id },
      { 
        $set: { 
          active: true,
          role: member.role,
          permissions: member.permissions,
          invitedBy: invitedByObjectId,
          updatedAt: now
        } 
      }
    );
    
    await this.updateOrganizationStats(orgId, 1);
    return this.getMember(orgId, userId);
  }

  private async createNewMember(orgId: ObjectId, userId: ObjectId, member: MemberData): Promise<OrganizationMember> {
    const now = new Date();
    const invitedByObjectId = member.invitedBy 
      ? this.convertToObjectId(member.invitedBy)
      : undefined;
    
    const memberData: OptionalUnlessRequiredId<OrganizationMember> = {
      organizationId: orgId,
      userId: userId,
      role: member.role,
      permissions: member.permissions,
      joinedAt: now,
      active: true,
      invitedBy: invitedByObjectId,
      createdAt: now,
      updatedAt: now
    };
    
    return this.withTransaction(async (transaction) => {
      const result = await transaction.insertOne(this.membersCollectionName, memberData);
      await this.updateOrganizationStatsInTransaction(transaction, orgId, 1);
      return result as OrganizationMember;
    });
  }

  private validateCanRemoveMember(organization: Organization, userId: ObjectId): void {
    if (organization.owner.toString() === userId.toString()) {
      throw new ValidationError(
        'Cannot remove the organization owner',
        [{ field: 'userId', message: 'Cannot remove the organization owner' }],
        'CANNOT_REMOVE_OWNER'
      );
    }
  }

  private async deactivateMember(member: OrganizationMember): Promise<void> {
    const membersCollection = this.db.getCollection<OrganizationMember>(this.membersCollectionName);
    const now = new Date();
    
    await membersCollection.updateOne(
      { _id: member._id },
      { $set: { active: false, updatedAt: now } }
    );
  }

  private async removeFromAdminsIfNeeded(organization: Organization, userId: ObjectId): Promise<void> {
    const isAdmin = organization.admins.some(adminId => adminId.toString() === userId.toString());
    if (!isAdmin) {
      return;
    }
    
    const now = new Date();
    await this.collection.updateOne(
      { _id: organization._id } as Filter<Organization>,
      { 
        $pull: { admins: userId },
        $set: { updatedAt: now }
      }
    );
  }

  private validateMemberUpdate(organization: Organization, userId: ObjectId, updates: MemberUpdateData): void {
    const isOwner = organization.owner.toString() === userId.toString();
    const isChangingOwnerRole = isOwner && updates.role && updates.role !== 'owner';
    
    if (isChangingOwnerRole) {
      throw new ValidationError(
        'Cannot change the organization owner\'s role',
        [{ field: 'role', message: 'Cannot change the organization owner\'s role' }],
        'CANNOT_CHANGE_OWNER_ROLE'
      );
    }
  }

  private buildMemberUpdateData(updates: MemberUpdateData): any {
    const updateData: any = { updatedAt: new Date() };
    
    if (updates.role !== undefined) {
      updateData.role = updates.role;
    }
    
    if (updates.permissions !== undefined) {
      updateData.permissions = updates.permissions;
    }
    
    if (updates.active !== undefined) {
      updateData.active = updates.active;
    }
    
    return updateData;
  }

  private async updateMemberRecord(existingMember: OrganizationMember, updateData: any): Promise<void> {
    const membersCollection = this.db.getCollection<OrganizationMember>(this.membersCollectionName);
    const result = await membersCollection.updateOne(
      { _id: existingMember._id },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      throw new DatabaseError(
        'Failed to update member',
        'updateOne',
        'UPDATE_FAILURE',
        undefined,
        this.membersCollectionName
      );
    }
  }

  private async handleMemberCountChange(
    orgId: ObjectId, 
    existingMember: OrganizationMember, 
    updates: MemberUpdateData
  ): Promise<void> {
    if (updates.active === undefined || updates.active === existingMember.active) {
      return;
    }
    
    const memberCountDelta = updates.active ? 1 : -1;
    await this.updateOrganizationStats(orgId, memberCountDelta);
  }

  private async handleRoleChange(
    orgId: ObjectId,
    userId: ObjectId, 
    existingMember: OrganizationMember,
    updates: MemberUpdateData
  ): Promise<void> {
    if (!updates.role || updates.role === existingMember.role) {
      return;
    }
    
    if (updates.role === 'admin') {
      await this.addToAdmins(orgId, userId);
    } else if (existingMember.role === 'admin') {
      await this.removeFromAdmins(orgId, userId);
    }
  }

  private async addToAdmins(orgId: ObjectId, userId: ObjectId): Promise<void> {
    const now = new Date();
    await this.collection.updateOne(
      { 
        _id: orgId,
        admins: { $ne: userId }
      } as Filter<Organization>,
      { 
        $addToSet: { admins: userId },
        $set: { updatedAt: now }
      }
    );
  }

  private async removeFromAdmins(orgId: ObjectId, userId: ObjectId): Promise<void> {
    const now = new Date();
    await this.collection.updateOne(
      { _id: orgId } as Filter<Organization>,
      { 
        $pull: { admins: userId },
        $set: { updatedAt: now }
      }
    );
  }

  private async updateOrganizationStats(orgId: ObjectId, memberCountDelta: number): Promise<void> {
    const now = new Date();
    await this.collection.updateOne(
      { _id: orgId } as Filter<Organization>,
      { 
        $inc: { 'stats.memberCount': memberCountDelta },
        $set: { 
          'stats.lastActivity': now,
          updatedAt: now
        }
      }
    );
  }

  private async updateOrganizationStatsInTransaction(
    transaction: any, 
    orgId: ObjectId, 
    memberCountDelta: number
  ): Promise<void> {
    const now = new Date();
    await transaction.updateOne(
      this.collectionName,
      { _id: orgId } as Filter<Organization>,
      { 
        $inc: { 'stats.memberCount': memberCountDelta },
        $set: { 
          'stats.lastActivity': now,
          updatedAt: now
        }
      }
    );
  }

  private async updateArchiveStatus(id: string | ObjectId, isArchived: boolean): Promise<boolean> {
    const objectId = this.convertToObjectId(id);
    const now = new Date();
    
    const result = await this.collection.updateOne(
      { _id: objectId } as Filter<Organization>,
      { $set: { isArchived, updatedAt: now } }
    );
    
    return result.matchedCount > 0;
  }

  protected validateData(data: any, isUpdate: boolean = false): void {
    const errors: Array<{ field: string; message: string }> = [];
    
    if (isUpdate && Object.keys(data).length === 0) {
      return;
    }
    
    if (!isUpdate && !data.name) {
      errors.push({ field: 'name', message: 'Name is required' });
    } else if (data.name && typeof data.name === 'string' && data.name.length < 2) {
      errors.push({ field: 'name', message: 'Name must be at least 2 characters long' });
    }
    
    if (!isUpdate && !data.type) {
      errors.push({ field: 'type', message: 'Type is required' });
    }
    
    if (!isUpdate && !data.description) {
      errors.push({ field: 'description', message: 'Description is required' });
    }
    
    if (!isUpdate && !data.owner) {
      errors.push({ field: 'owner', message: 'Owner is required' });
    }
    
    if (errors.length > 0) {
      throw new ValidationError(
        'Validation failed',
        errors,
        'VALIDATION_ERROR'
      );
    }
  }
}