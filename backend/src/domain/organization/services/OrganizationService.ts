import { Types } from 'mongoose';
import { Organization } from '../entities/Organization.js';
import { IOrganizationRepository, IOrganizationSettings, ISubscriptionInfo } from '../interfaces/OrganizationInterfaces.js';
import { Status } from '../../../types/core/enums.js';
import { ValidationError } from '../../../infrastructure/errors/types/ValidationError.js';

/**
 * Service for managing organization operations
 */
export class OrganizationService {
  constructor(
    private readonly organizationRepository: IOrganizationRepository
  ) {}

  /**
   * Create a new organization
   */
  async createOrganization(data: {
    name: string;
    type: string;
    createdBy: Types.ObjectId;
    settings?: Partial<IOrganizationSettings>;
    subscriptionPlan?: 'free' | 'basic' | 'premium' | 'enterprise';
  }): Promise<Organization> {
    // Validate organization name
    await this.validateOrganizationName(data.name);

    const settings = {
      ...Organization.createDefaultSettings(),
      ...data.settings
    };

    const subscription = this.createSubscriptionForPlan(data.subscriptionPlan ?? 'free');

    const now = new Date();
    const orgId = new Types.ObjectId();

    const organization = new Organization({
      id: orgId,
      name: data.name,
      type: data.type,
      status: Status.ACTIVE,
      settings,
      subscription,
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy,
      isActive: true,
    });

    return await this.organizationRepository.create(organization);
  }

  /**
   * Get organization by ID
   */
  async getOrganizationById(id: Types.ObjectId): Promise<Organization | null> {
    return await this.organizationRepository.findById(id);
  }

  /**
   * Update organization
   */
  async updateOrganization(
    id: Types.ObjectId, 
    updates: {
      name?: string;
      type?: string;
      settings?: Partial<IOrganizationSettings>;
    }
  ): Promise<Organization | null> {
    // Validate name if being updated
    if (updates.name) {
      await this.validateOrganizationName(updates.name, id);
    }
  
    // Start building the final updates object
    const finalUpdates: Partial<Organization> = {
      name: updates.name,
      type: updates.type,
    };
  
    // If settings are being updated, merge them with the existing settings
    if (updates.settings) {
      const existingOrg = await this.organizationRepository.findById(id);
      if (!existingOrg) return null;
  
      finalUpdates.settings = {
        ...existingOrg.settings,
        ...updates.settings,
      };
    }
  
    return await this.organizationRepository.update(id, finalUpdates);
  }
  
  

  /**
   * Archive organization
   */
  async archiveOrganization(id: Types.ObjectId): Promise<boolean> {
    const organization = await this.organizationRepository.findById(id);
    if (!organization) {
      return false;
    }

    if (!organization.canBeDeleted()) {
      throw new ValidationError(
        'organization',
        organization.id,
        'archive_validation',
        'Cannot archive organization with active members'
      );
    }

    return await this.organizationRepository.archive(id);
  }

  /**
   * Restore archived organization
   */
  async restoreOrganization(id: Types.ObjectId): Promise<boolean> {
    return await this.organizationRepository.restore(id);
  }

  /**
   * Get organizations with expired subscriptions
   */
  async getExpiredSubscriptions(): Promise<readonly Organization[]> {
    return await this.organizationRepository.findWithExpiredSubscriptions();
  }

  /**
   * Check if organization can add member
   */
  async canAddMember(organizationId: Types.ObjectId): Promise<boolean> {
    const organization = await this.organizationRepository.findById(organizationId);
    if (!organization) {
      return false;
    }

    return organization.canAddMember();
  }

  /**
   * Get organization statistics
   */
  async getOrganizationStats(organizationId: Types.ObjectId): Promise<{
    memberCount: number;
    remainingSlots: number;
    subscriptionDaysRemaining: number | null;
    isExpiringSoon: boolean;
    activeFeatures: readonly string[];
  } | null> {
    const organization = await this.organizationRepository.findById(organizationId);
    if (!organization) {
      return null;
    }

    const memberCount = await this.organizationRepository.getMemberCount(organizationId);

    return {
      memberCount,
      remainingSlots: organization.getRemainingMemberSlots(),
      subscriptionDaysRemaining: organization.getSubscriptionDaysRemaining(),
      isExpiringSoon: organization.isSubscriptionExpiringSoon(),
      activeFeatures: organization.subscription.features
    };
  }

  /**
   * Validate organization name
   */
  private async validateOrganizationName(name: string, excludeId?: Types.ObjectId): Promise<void> {
    if (!name || name.trim().length === 0) {
      throw new ValidationError(
        'name',
        name,
        'required',
        'Organization name is required'
      );
    }

    if (name.length < 2) {
      throw new ValidationError(
        'name',
        name,
        'min_length',
        'Organization name must be at least 2 characters'
      );
    }

    if (name.length > 100) {
      throw new ValidationError(
        'name',
        name,
        'max_length',
        'Organization name must be less than 100 characters'
      );
    }

    const isAvailable = await this.organizationRepository.isNameAvailable(name, excludeId);
    if (!isAvailable) {
      throw new ValidationError(
        'name',
        name,
        'unique',
        'Organization name is already taken'
      );
    }
  }

  /**
   * Create subscription for plan
   */
  private createSubscriptionForPlan(plan: 'free' | 'basic' | 'premium' | 'enterprise'): ISubscriptionInfo {
    const baseSubscription = {
      startDate: new Date(),
      isActive: true,
      autoRenew: true,
      billingCycle: 'monthly' as const
    };

    switch (plan) {
      case 'free':
        return {
          ...baseSubscription,
          plan: 'free',
          features: ['basic_workouts', 'basic_progress'],
          memberLimit: 10,
          storageLimit: 1024 * 1024 * 100, // 100MB
          autoRenew: false
        };

      case 'basic':
        return {
          ...baseSubscription,
          plan: 'basic',
          features: ['basic_workouts', 'basic_progress', 'sharing', 'reports'],
          memberLimit: 50,
          storageLimit: 1024 * 1024 * 500 // 500MB
        };

      case 'premium':
        return {
          ...baseSubscription,
          plan: 'premium',
          features: ['all_workouts', 'advanced_progress', 'sharing', 'reports', 'analytics', 'api_access'],
          memberLimit: 200,
          storageLimit: 1024 * 1024 * 1024 * 2 // 2GB
        };

      case 'enterprise':
        return {
          ...baseSubscription,
          plan: 'enterprise',
          features: ['all_features', 'white_label', 'custom_integrations', 'priority_support'],
          memberLimit: 1000,
          storageLimit: 1024 * 1024 * 1024 * 10 // 10GB
        };

      default:
        return Organization.createFreeSubscription();
    }
  }
}