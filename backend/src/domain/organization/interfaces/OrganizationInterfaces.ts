import { Types } from 'mongoose';
import { Organization } from '../entities/Organization';

/**
 * Organization settings configuration
 */
export interface IOrganizationSettings {
  readonly allowPublicSharing: boolean;
  readonly dataRetentionDays: number;
  readonly requireMedicalClearance: boolean;
  readonly defaultPrivacyLevel: 'public' | 'organization' | 'private';
  readonly maxMembersAllowed: number;
  readonly enableGuestAccess: boolean;
  readonly autoApproveMembers: boolean;
  readonly allowTrainerAssignment: boolean;
  readonly enableProgressSharing: boolean;
  readonly workoutReminders: boolean;
}

/**
 * Subscription information for organizations
 */
export interface ISubscriptionInfo {
  readonly plan: 'free' | 'basic' | 'premium' | 'enterprise';
  readonly startDate: Date;
  readonly endDate?: Date;
  readonly features: readonly string[];
  readonly memberLimit: number;
  readonly storageLimit: number; // in bytes
  readonly isActive: boolean;
  readonly autoRenew: boolean;
  readonly billingCycle: 'monthly' | 'yearly';
  readonly customFeatures?: readonly string[];
}

/**
 * Repository interface for Organization operations
 */
export interface IOrganizationRepository {
  /**
   * Find organization by ID
   */
  findById(id: Types.ObjectId): Promise<Organization | null>;

  /**
   * Find organization by name
   */
  findByName(name: string): Promise<Organization | null>;

  /**
   * Find organizations by type
   */
  findByType(type: string): Promise<readonly Organization[]>;

  /**
   * Find active organizations
   */
  findActive(): Promise<readonly Organization[]>;

  /**
   * Create a new organization
   */
  create(organization: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>): Promise<Organization>;

  /**
   * Update organization
   */
  update(id: Types.ObjectId, updates: Partial<Organization>): Promise<Organization | null>;

  /**
   * Delete organization (soft delete to archived)
   */
  archive(id: Types.ObjectId): Promise<boolean>;

  /**
   * Restore archived organization
   */
  restore(id: Types.ObjectId): Promise<boolean>;

  /**
   * Get member count for organization
   */
  getMemberCount(organizationId: Types.ObjectId): Promise<number>;

  /**
   * Check if organization name is available
   */
  isNameAvailable(name: string, excludeId?: Types.ObjectId): Promise<boolean>;

  /**
   * Find organizations with expired subscriptions
   */
  findWithExpiredSubscriptions(): Promise<readonly Organization[]>;
}

