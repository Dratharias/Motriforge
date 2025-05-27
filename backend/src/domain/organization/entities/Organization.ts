import { Types } from 'mongoose';
import { IEntity, IUser } from '../../../types/core/interfaces';
import { IArchivable } from '../../../types/core/behaviors';
import { Status } from '../../../types/core/enums';
import { IOrganizationSettings, ISubscriptionInfo } from '../interfaces/OrganizationInterfaces';

/**
 * Organization entity representing companies, gyms, or other fitness facilities
 */
export class Organization implements IEntity, IArchivable {
  public readonly id: Types.ObjectId;
  public readonly name: string;
  public readonly type: string;
  public readonly status: Status;
  public settings: IOrganizationSettings;
  public readonly subscription: ISubscriptionInfo;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly createdBy: Types.ObjectId;
  public readonly isActive: boolean;
  public readonly isDraft: boolean = false; // Organizations are not draftable

  constructor(data: {
    id: Types.ObjectId;
    name: string;
    type: string;
    status: Status;
    settings: IOrganizationSettings;
    subscription: ISubscriptionInfo;
    createdAt: Date;
    updatedAt: Date;
    createdBy: Types.ObjectId;
    isActive: boolean;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.type = data.type;
    this.status = data.status;
    this.settings = data.settings;
    this.subscription = data.subscription;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.createdBy = data.createdBy;
    this.isActive = data.isActive;
  }

  /**
   * Add a member to the organization
   */
  addMember(user: IUser): void {
    // This would be handled by the service layer
    // Just validation here
    if (!this.canAddMember()) {
      throw new Error('Cannot add member: member limit reached');
    }
  }

  /**
   * Remove a member from the organization
   */
  removeMember(userId: Types.ObjectId): void {
    // This would be handled by the service layer
    // Validation can be added here
  }

  /**
   * Get member count (would be fetched from repository)
   */
  getMemberCount(): number {
    // This would be async in real implementation, fetched from repository
    // For now, return 0 as placeholder
    return 0;
  }

  /**
   * Check if organization is currently active
   */
  isOrganizationActive(): boolean {
    return this.isActive && 
           this.status === Status.ACTIVE && 
           this.isSubscriptionActive();
  }

  /**
   * Check if subscription is active
   */
  isSubscriptionActive(): boolean {
    if (!this.subscription.isActive) {
      return false;
    }

    if (this.subscription.endDate) {
      return new Date() <= this.subscription.endDate;
    }

    return true;
  }

  /**
   * Check if can add new member
   */
  canAddMember(): boolean {
    const currentMemberCount = this.getMemberCount();
    return currentMemberCount < this.subscription.memberLimit;
  }

  /**
   * Get remaining member slots
   */
  getRemainingMemberSlots(): number {
    const currentMemberCount = this.getMemberCount();
    return Math.max(0, this.subscription.memberLimit - currentMemberCount);
  }

  /**
   * Check if organization has feature
   */
  hasFeature(feature: string): boolean {
    return this.subscription.features.includes(feature) ||
           (this.subscription.customFeatures?.includes(feature) ?? false);
  }

  /**
   * Get subscription days remaining
   */
  getSubscriptionDaysRemaining(): number | null {
    if (!this.subscription.endDate) {
      return null; // Unlimited or no end date
    }

    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const timeDiff = this.subscription.endDate.getTime() - now.getTime();
    
    return Math.ceil(timeDiff / msPerDay);
  }

  /**
   * Check if subscription is expiring soon (within 30 days)
   */
  isSubscriptionExpiringSoon(): boolean {
    const daysRemaining = this.getSubscriptionDaysRemaining();
    return daysRemaining !== null && daysRemaining <= 30 && daysRemaining > 0;
  }

  // IArchivable implementation
  archive(): void {
    // This would be handled by the service layer
    // Just mark as archived status
  }

  restore(): void {
    // This would be handled by the service layer
    // Restore from archived status
  }

  canBeDeleted(): boolean {
    // Organizations can only be deleted if they have no members
    return this.getMemberCount() === 0;
  }

  getAssociationCount(): number {
    // Return total number of associated entities (members, workouts, etc.)
    return this.getMemberCount(); // Simplified for now
  }

  /**
   * Update organization settings
   */
  updateSettings(newSettings: Partial<IOrganizationSettings>): Organization {
    const updatedSettings: IOrganizationSettings = {
      ...this.settings,
      ...newSettings
    };

    return new Organization({
      ...this,
      settings: updatedSettings,
      updatedAt: new Date()
    });
  }

  /**
   * Update subscription information
   */
  updateSubscription(newSubscription: Partial<ISubscriptionInfo>): Organization {
    const updatedSubscription: ISubscriptionInfo = {
      ...this.subscription,
      ...newSubscription
    };

    return new Organization({
      ...this,
      subscription: updatedSubscription,
      updatedAt: new Date()
    });
  }

  /**
   * Create default organization settings
   */
  static createDefaultSettings(): IOrganizationSettings {
    return {
      allowPublicSharing: false,
      dataRetentionDays: 365,
      requireMedicalClearance: false,
      defaultPrivacyLevel: 'organization',
      maxMembersAllowed: 100,
      enableGuestAccess: false,
      autoApproveMembers: true,
      allowTrainerAssignment: true,
      enableProgressSharing: false,
      workoutReminders: true
    };
  }

  /**
   * Create default subscription for free plan
   */
  static createFreeSubscription(): ISubscriptionInfo {
    return {
      plan: 'free',
      startDate: new Date(),
      features: ['basic_workouts', 'basic_progress'],
      memberLimit: 10,
      storageLimit: 1024 * 1024 * 100, // 100MB
      isActive: true,
      autoRenew: false,
      billingCycle: 'monthly'
    };
  }
}

