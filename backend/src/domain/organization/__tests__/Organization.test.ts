import { describe, it, expect, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { Organization } from '../entities/Organization';
import { Status } from '../../../types/core/enums';

describe('Organization Entity', () => {
  let orgData: any;
  let organization: Organization;

  beforeEach(() => {
    orgData = {
      id: new Types.ObjectId(),
      name: 'Test Gym',
      type: 'fitness_center',
      status: Status.ACTIVE,
      settings: Organization.createDefaultSettings(),
      subscription: Organization.createFreeSubscription(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: new Types.ObjectId(),
      isActive: true
    };
    organization = new Organization(orgData);
  });

  it('should create organization with all properties', () => {
    expect(organization.id).toBe(orgData.id);
    expect(organization.name).toBe(orgData.name);
    expect(organization.type).toBe(orgData.type);
    expect(organization.status).toBe(orgData.status);
    expect(organization.isActive).toBe(true);
  });

  it('should check if organization is active', () => {
    expect(organization.isOrganizationActive()).toBe(true);
    
    const inactiveOrg = new Organization({ ...orgData, isActive: false });
    expect(inactiveOrg.isOrganizationActive()).toBe(false);
  });

  it('should check subscription status correctly', () => {
    expect(organization.isSubscriptionActive()).toBe(true);
    
    // Test with end date in future
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const subscriptionWithEndDate = {
      ...organization.subscription,
      endDate: futureDate
    };
    const orgWithEndDate = new Organization({
      ...orgData,
      subscription: subscriptionWithEndDate
    });
    expect(orgWithEndDate.isSubscriptionActive()).toBe(true);
    
    // Test with end date in past
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);
    const expiredSubscription = {
      ...organization.subscription,
      endDate: pastDate
    };
    const expiredOrg = new Organization({
      ...orgData,
      subscription: expiredSubscription
    });
    expect(expiredOrg.isSubscriptionActive()).toBe(false);
  });

  it('should check if has feature correctly', () => {
    expect(organization.hasFeature('basic_workouts')).toBe(true);
    expect(organization.hasFeature('advanced_analytics')).toBe(false);
  });

  it('should calculate remaining member slots', () => {
    const remaining = organization.getRemainingMemberSlots();
    expect(remaining).toBe(organization.subscription.memberLimit); // No members yet
  });

  it('should update settings correctly', () => {
    const newSettings = { allowPublicSharing: true };
    const updatedOrg = organization.updateSettings(newSettings);
    
    expect(updatedOrg.settings.allowPublicSharing).toBe(true);
    expect(updatedOrg.settings.dataRetentionDays).toBe(organization.settings.dataRetentionDays);
    expect(updatedOrg.updatedAt).not.toBe(organization.updatedAt);
  });

  it('should create default settings correctly', () => {
    const settings = Organization.createDefaultSettings();
    
    expect(settings.allowPublicSharing).toBe(false);
    expect(settings.dataRetentionDays).toBe(365);
    expect(settings.requireMedicalClearance).toBe(false);
    expect(settings.maxMembersAllowed).toBe(100);
  });

  it('should create free subscription correctly', () => {
    const subscription = Organization.createFreeSubscription();
    
    expect(subscription.plan).toBe('free');
    expect(subscription.memberLimit).toBe(10);
    expect(subscription.features).toContain('basic_workouts');
    expect(subscription.isActive).toBe(true);
  });
});