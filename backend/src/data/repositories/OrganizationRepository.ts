import { CacheFacade } from "@/core/cache/facade/CacheFacade";
import { EventMediator } from "@/core/events/EventMediator";
import { LoggerFacade } from "@/core/logging";
import { ValidationResult } from "@/types/events";
import { IOrganization, IOrganizationMember, OrganizationVisibilityValue } from "@/types/models";
import { IOrganizationRepository, RepositoryContext } from "@/types/repositories";
import { Model, Types } from "mongoose";
import { BaseRepository } from "./BaseRepository";
import { ValidationHelpers } from "./helpers";


/**
 * Repository for organization operations with enhanced validation and caching
 */
export class OrganizationRepository extends BaseRepository<IOrganization> implements IOrganizationRepository {
  private static readonly CACHE_TTL = 600; // 10 minutes
  private static readonly ORG_CACHE_TTL = 1800; // 30 minutes for organization data
  private static readonly MEMBER_CACHE_TTL = 300; // 5 minutes for member data

  constructor(
    organizationModel: Model<IOrganization>,
    logger: LoggerFacade,
    eventMediator: EventMediator,
    cache?: CacheFacade
  ) {
    super(organizationModel, logger, eventMediator, cache, 'OrganizationRepository');
  }

  /**
   * Find organization by name
   */
  public async findByName(name: string): Promise<IOrganization | null> {
    const cacheKey = this.cacheHelpers.generateCustomKey('name', { name });
    
    const cached = await this.cacheHelpers.getCustom<IOrganization>(cacheKey);
    if (cached) {
      return this.mapToEntity(cached);
    }

    try {
      this.logger.debug('Finding organization by name', { name });
      
      const org = await this.crudOps.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        isArchived: { $ne: true }
      });

      if (org && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, org, OrganizationRepository.ORG_CACHE_TTL);
        const orgId = this.extractId(org);
        if (orgId) {
          await this.cacheHelpers.cacheById(orgId, org, OrganizationRepository.ORG_CACHE_TTL);
        }
      }

      return org ? this.mapToEntity(org) : null;
    } catch (error) {
      this.logger.error('Error finding organization by name', error as Error, { name });
      throw error;
    }
  }

  /**
   * Find organizations by owner ID
   */
  public async findByOwnerId(ownerId: string | Types.ObjectId): Promise<IOrganization[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('owner', { 
      ownerId: ownerId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<IOrganization[]>(cacheKey);
    if (cached) {
      return cached.map(org => this.mapToEntity(org));
    }

    try {
      this.logger.debug('Finding organizations by owner', { ownerId: ownerId.toString() });
      
      const orgs = await this.crudOps.find({
        owner: new Types.ObjectId(ownerId.toString()),
        isArchived: { $ne: true }
      }, {
        sort: [{ field: 'createdAt', direction: 'desc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, orgs, OrganizationRepository.CACHE_TTL);
      }

      return orgs.map(org => this.mapToEntity(org));
    } catch (error) {
      this.logger.error('Error finding organizations by owner', error as Error, { 
        ownerId: ownerId.toString() 
      });
      throw error;
    }
  }

  /**
   * Find organizations for user (including memberships)
   */
  public async findForUser(userId: string | Types.ObjectId): Promise<IOrganization[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('user', { 
      userId: userId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<IOrganization[]>(cacheKey);
    if (cached) {
      return cached.map(org => this.mapToEntity(org));
    }

    try {
      this.logger.debug('Finding organizations for user', { userId: userId.toString() });
      
      // Use aggregation to find organizations where user is owner or member
      const orgs = await this.crudOps.aggregate<IOrganization>([
        {
          $match: {
            $or: [
              { owner: new Types.ObjectId(userId.toString()) },
              { 'members.user': new Types.ObjectId(userId.toString()) }
            ],
            isArchived: { $ne: true }
          }
        },
        {
          $sort: { createdAt: -1 }
        }
      ]);

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, orgs, OrganizationRepository.CACHE_TTL);
      }

      return orgs.map(org => this.mapToEntity(org));
    } catch (error) {
      this.logger.error('Error finding organizations for user', error as Error, { 
        userId: userId.toString() 
      });
      throw error;
    }
  }

  /**
   * Add member to organization
   */
  public async addMember(
    organizationId: string | Types.ObjectId, 
    member: Partial<IOrganizationMember>
  ): Promise<IOrganizationMember> {
    try {
      this.logger.debug('Adding member to organization', { 
        organizationId: organizationId.toString(),
        userId: member.user?.toString() 
      });

      // Check if member already exists
      const org = await this.findById(organizationId);
      if (!org) {
        throw new Error('Organization not found');
      }

      // Validate required fields
      if (!member.user || !member.role || !member.invitedBy) {
        throw new Error('User, role, and invitedBy are required fields');
      }

      // Check if user is already a member
      const existingMember = org.members?.find(
        m => m.user.toString() === member.user!.toString()
      );
      if (existingMember) {
        throw new Error('User is already a member of this organization');
      }

      // Create the member object with proper typing
      const newMember: IOrganizationMember = {
        _id: new Types.ObjectId(),
        organization: new Types.ObjectId(organizationId.toString()),
        user: new Types.ObjectId(member.user.toString()),
        role: new Types.ObjectId(member.role.toString()),
        permissions: member.permissions || [],
        joinedAt: member.joinedAt || new Date(),
        active: member.active ?? true,
        invitedBy: new Types.ObjectId(member.invitedBy.toString()),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add member to organization using proper MongoDB update syntax
      const updateResult = await this.crudOps.update(organizationId, {
        $push: { members: newMember }
      });

      if (!updateResult) {
        throw new Error('Failed to add member to organization');
      }

      // Invalidate relevant caches
      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateAfterUpdate(organizationId);
        await this.cacheHelpers.invalidateByPattern('user:*');
        await this.cacheHelpers.invalidateByPattern('members:*');
      }

      // Publish event
      await this.publishEvent('organization.member.added', {
        organizationId: organizationId.toString(),
        userId: member.user.toString(),
        addedBy: member.invitedBy.toString(),
        timestamp: new Date()
      });

      return newMember;
    } catch (error) {
      this.logger.error('Error adding member to organization', error as Error, { 
        organizationId: organizationId.toString(),
        userId: member.user?.toString()
      });
      throw error;
    }
  }

  /**
   * Remove member from organization
   */
  public async removeMember(
    organizationId: string | Types.ObjectId, 
    userId: string | Types.ObjectId
  ): Promise<boolean> {
    try {
      this.logger.debug('Removing member from organization', { 
        organizationId: organizationId.toString(),
        userId: userId.toString() 
      });

      const result = await this.crudOps.update(organizationId, {
        $pull: { members: { user: new Types.ObjectId(userId.toString()) } }
      });

      if (result && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateAfterUpdate(organizationId);
        await this.cacheHelpers.invalidateByPattern('user:*');
        await this.cacheHelpers.invalidateByPattern('members:*');
      }

      if (result) {
        await this.publishEvent('organization.member.removed', {
          organizationId: organizationId.toString(),
          userId: userId.toString(),
          timestamp: new Date()
        });
      }

      return !!result;
    } catch (error) {
      this.logger.error('Error removing member from organization', error as Error, { 
        organizationId: organizationId.toString(),
        userId: userId.toString()
      });
      throw error;
    }
  }

  /**
   * Update organization member
   */
  public async updateMember(
    organizationId: string | Types.ObjectId, 
    userId: string | Types.ObjectId, 
    updates: Partial<IOrganizationMember>
  ): Promise<IOrganizationMember | null> {
    try {
      this.logger.debug('Updating organization member', { 
        organizationId: organizationId.toString(),
        userId: userId.toString() 
      });

      // Build update fields with proper typing
      const updateFields: Record<string, any> = {};
      const allowedFields = ['role', 'permissions', 'active'] as const;
      
      allowedFields.forEach(field => {
        if (field in updates && updates[field] !== undefined) {
          if (field === 'role') {
            updateFields[`members.$.${field}`] = new Types.ObjectId(updates[field]!.toString());
          } else {
            updateFields[`members.$.${field}`] = updates[field];
          }
        }
      });
      
      updateFields['members.$.updatedAt'] = new Date();

      const result = await this.crudOps.findOneAndUpdate(
        { 
          _id: new Types.ObjectId(organizationId.toString()), 
          'members.user': new Types.ObjectId(userId.toString())
        },
        { $set: updateFields },
        { returnNew: true }
      );

      if (result && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateAfterUpdate(organizationId);
        await this.cacheHelpers.invalidateByPattern('members:*');
      }

      if (result) {
        await this.publishEvent('organization.member.updated', {
          organizationId: organizationId.toString(),
          userId: userId.toString(),
          updates: Object.keys(updates),
          timestamp: new Date()
        });

        // Find and return the updated member
        const org = this.mapToEntity(result);
        const updatedMember = org.members?.find(
          m => m.user.toString() === userId.toString()
        );
        return updatedMember || null;
      }

      return null;
    } catch (error) {
      this.logger.error('Error updating organization member', error as Error, { 
        organizationId: organizationId.toString(),
        userId: userId.toString()
      });
      throw error;
    }
  }

  /**
   * Get organization members
   */
  public async getMembers(organizationId: string | Types.ObjectId): Promise<IOrganizationMember[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('members', { 
      organizationId: organizationId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<IOrganizationMember[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      this.logger.debug('Getting organization members', { 
        organizationId: organizationId.toString() 
      });

      const org = await this.findById(organizationId);
      const members = org?.members || [];

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(
          cacheKey, 
          members, 
          OrganizationRepository.MEMBER_CACHE_TTL
        );
      }

      return members;
    } catch (error) {
      this.logger.error('Error getting organization members', error as Error, { 
        organizationId: organizationId.toString() 
      });
      throw error;
    }
  }

  /**
   * Get specific organization member
   */
  public async getMember(
    organizationId: string | Types.ObjectId, 
    userId: string | Types.ObjectId
  ): Promise<IOrganizationMember | null> {
    try {
      this.logger.debug('Getting organization member', { 
        organizationId: organizationId.toString(),
        userId: userId.toString() 
      });

      const members = await this.getMembers(organizationId);
      const member = members.find(m => m.user.toString() === userId.toString());

      return member || null;
    } catch (error) {
      this.logger.error('Error getting organization member', error as Error, { 
        organizationId: organizationId.toString(),
        userId: userId.toString()
      });
      throw error;
    }
  }

  /**
   * Find organizations by visibility
   */
  public async findByVisibility(visibility: string): Promise<IOrganization[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('visibility', { visibility });
    
    const cached = await this.cacheHelpers.getCustom<IOrganization[]>(cacheKey);
    if (cached) {
      return cached.map(org => this.mapToEntity(org));
    }

    try {
      this.logger.debug('Finding organizations by visibility', { visibility });
      
      const orgs = await this.crudOps.find({
        visibility: visibility as OrganizationVisibilityValue,
        isArchived: { $ne: true }
      }, {
        sort: [{ field: 'createdAt', direction: 'desc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, orgs, OrganizationRepository.CACHE_TTL);
      }

      return orgs.map(org => this.mapToEntity(org));
    } catch (error) {
      this.logger.error('Error finding organizations by visibility', error as Error, { 
        visibility 
      });
      throw error;
    }
  }

  /**
   * Search organizations by name
   */
  public async searchByName(query: string, limit: number = 10): Promise<IOrganization[]> {
    try {
      this.logger.debug('Searching organizations by name', { query, limit });
      
      const orgs = await this.crudOps.find({
        name: { $regex: query, $options: 'i' },
        isArchived: { $ne: true }
      }, {
        sort: [{ field: 'name', direction: 'asc' }],
        pagination: { limit, offset: 0, page: 1, pageSize: limit }
      });

      return orgs.map(org => this.mapToEntity(org));
    } catch (error) {
      this.logger.error('Error searching organizations by name', error as Error, { 
        query, 
        limit 
      });
      throw error;
    }
  }

  /**
   * Override create to handle organization-specific logic
   */
  public async create(data: Partial<IOrganization>, context?: RepositoryContext): Promise<IOrganization> {
    // Validate unique name before creation
    if (data.name) {
      const existingOrg = await this.findByName(data.name);
      if (existingOrg) {
        throw new Error('Organization with this name already exists');
      }
    }

    // Set default values with proper typing
    const organizationData: Partial<IOrganization> = {
      ...data,
      isActive: data.isActive ?? true,
      isArchived: data.isArchived ?? false,
      members: data.members || []
    };

    const org = await super.create(organizationData, context);

    // Publish organization creation event
    await this.publishEvent('organization.created', {
      organizationId: org._id.toString(),
      name: org.name,
      ownerId: org.owner.toString(),
      type: org.type,
      timestamp: new Date()
    });

    return org;
  }

  /**
   * Validate organization data
   */
  protected validateData(data: Partial<IOrganization>): ValidationResult {
    const errors: string[] = [];

    // Name validation
    if (data.name !== undefined) {
      const nameValidation = ValidationHelpers.validateFieldLength(
        data.name, 
        'name', 
        2, 
        100
      );
      if (!nameValidation.valid) {
        errors.push(...nameValidation.errors);
      }
    }

    // Description validation
    if (data.description !== undefined && data.description.length > 500) {
      errors.push('Description must be less than 500 characters');
    }

    // Email validation in contact info
    if (data.contact?.email && !ValidationHelpers.validateEmail(data.contact.email)) {
      errors.push('Invalid contact email format');
    }

    // Phone validation in contact info
    if (data.contact?.phone && !ValidationHelpers.validatePhoneNumber(data.contact.phone)) {
      errors.push('Invalid contact phone number format');
    }

    // Website URL validation
    if (data.contact?.website && !ValidationHelpers.validateUrl(data.contact.website)) {
      errors.push('Invalid website URL format');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Map database document to domain entity
   */
  protected mapToEntity(data: any): IOrganization {
    return {
      _id: data._id,
      name: data.name,
      type: data.type,
      description: data.description || '',
      logoUrl: data.logoUrl || '',
      owner: data.owner,
      admins: data.admins || [],
      address: data.address || {},
      contact: data.contact || {},
      visibility: data.visibility,
      isVerified: data.isVerified ?? false,
      trustLevel: data.trustLevel,
      settings: data.settings || {},
      stats: data.stats || {
        memberCount: 0,
        exerciseCount: 0,
        workoutCount: 0,
        programCount: 0,
        averageEngagement: 0,
        lastActivityDate: new Date()
      },
      isActive: data.isActive ?? true,
      isArchived: data.isArchived ?? false,
      members: data.members || [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    } as IOrganization;
  }

  /**
   * Map domain entity to database document
   */
  protected mapFromEntity(entity: IOrganization): any {
    const doc = { ...entity };
    
    // Remove any computed fields
    delete (doc as any).__v;
    
    return doc;
  }
}