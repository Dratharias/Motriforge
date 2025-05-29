import { describe, it, expect, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { SharedResource } from '../SharedResource';
import { ShareScope } from '../interfaces';
import { ResourceType, Action, Role } from '../../../../types/core/enums';
import { IUser } from '../../../../types/core/interfaces';

describe('SharedResource', () => {
  let mockOwner: Types.ObjectId;
  let mockUser1: Types.ObjectId;
  let mockUser2: Types.ObjectId;
  let mockResourceId: Types.ObjectId;
  let baseStartDate: Date;

  beforeEach(() => {
    mockOwner = new Types.ObjectId();
    mockUser1 = new Types.ObjectId();
    mockUser2 = new Types.ObjectId();
    mockResourceId = new Types.ObjectId();
    baseStartDate = new Date();
  });

  const createSharedResource = (overrides = {} as any) => {
    // Always use the baseStartDate for consistency
    const startDate = overrides.startDate ?? baseStartDate;
    
    return new SharedResource({
      resourceId: mockResourceId,
      resourceType: ResourceType.WORKOUT,
      owner: mockOwner,
      sharedWith: [mockUser1, mockUser2],
      allowedActions: [Action.READ, Action.UPDATE],
      startDate,
      createdBy: mockOwner,
      ...overrides
    });
  };

  const createMockUser = (id: Types.ObjectId, role: Role = Role.CLIENT): IUser => ({
    id,
    email: `user${id}@example.com`,
    role,
    status: 'ACTIVE',
    organization: new Types.ObjectId(),
    createdAt: new Date(),
    lastActiveAt: new Date()
  });

  describe('constructor', () => {
    it('should create shared resource with required fields', () => {
      const sharedResource = createSharedResource();

      expect(sharedResource.resourceId).toBe(mockResourceId);
      expect(sharedResource.resourceType).toBe(ResourceType.WORKOUT);
      expect(sharedResource.owner).toBe(mockOwner);
      expect(sharedResource.sharedWith).toEqual([mockUser1, mockUser2]);
      expect(sharedResource.allowedActions).toEqual([Action.READ, Action.UPDATE]);
      expect(sharedResource.isActive).toBe(true);
      expect(sharedResource.archived).toBe(false);
      expect(sharedResource.scope).toBe(ShareScope.DIRECT);
    });

    it('should throw error for invalid data', () => {
      expect(() => {
        createSharedResource({ resourceId: null });
      }).toThrow('Resource ID is required');

      expect(() => {
        createSharedResource({ allowedActions: [] });
      }).toThrow('At least one action must be allowed');

      expect(() => {
        const pastDate = new Date(baseStartDate.getTime() - 24 * 60 * 60 * 1000);
        createSharedResource({
          endDate: pastDate,
          startDate: baseStartDate
        });
      }).toThrow('End date must be after start date');
    });

    it('should not allow sharing with owner', () => {
      expect(() => {
        createSharedResource({ sharedWith: [mockOwner, mockUser1] });
      }).toThrow('Cannot share resource with owner');
    });
  });

  describe('isValid', () => {
    it('should return true for valid, active, non-expired resource', () => {
      const sharedResource = createSharedResource();
      expect(sharedResource.isValid()).toBe(true);
    });

    it('should return false for archived resource', () => {
      const sharedResource = createSharedResource({ archived: true });
      expect(sharedResource.isValid()).toBe(false);
    });

    it('should return false for inactive resource', () => {
      const sharedResource = createSharedResource({ isActive: false });
      expect(sharedResource.isValid()).toBe(false);
    });

    it('should return false for expired resource', () => {
      const pastStartDate = new Date(baseStartDate.getTime() - 48 * 60 * 60 * 1000); // 2 days ago
      const pastEndDate = new Date(baseStartDate.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
      
      const sharedResource = createSharedResource({ 
        startDate: pastStartDate,
        endDate: pastEndDate 
      });
      expect(sharedResource.isValid()).toBe(false);
    });
  });

  describe('hasExpired', () => {
    it('should return false when no end date is set', () => {
      const sharedResource = createSharedResource();
      expect(sharedResource.hasExpired()).toBe(false);
    });

    it('should return false when end date is in the future', () => {
      const futureDate = new Date(baseStartDate.getTime() + 24 * 60 * 60 * 1000);
      const sharedResource = createSharedResource({ endDate: futureDate });
      expect(sharedResource.hasExpired()).toBe(false);
    });

    it('should return true when end date has passed', () => {
      const pastStartDate = new Date(baseStartDate.getTime() - 48 * 60 * 60 * 1000);
      const pastEndDate = new Date(baseStartDate.getTime() - 24 * 60 * 60 * 1000);
      
      const sharedResource = createSharedResource({ 
        startDate: pastStartDate,
        endDate: pastEndDate 
      });
      expect(sharedResource.hasExpired()).toBe(true);
    });
  });

  describe('canUserAccess', () => {
    let sharedResource: SharedResource;
    let owner: IUser;
    let sharedUser: IUser;
    let otherUser: IUser;

    beforeEach(() => {
      sharedResource = createSharedResource();
      owner = createMockUser(mockOwner);
      sharedUser = createMockUser(mockUser1);
      otherUser = createMockUser(new Types.ObjectId());
    });

    it('should allow owner full access', () => {
      expect(sharedResource.canUserAccess(owner, Action.READ)).toBe(true);
      expect(sharedResource.canUserAccess(owner, Action.UPDATE)).toBe(true);
      expect(sharedResource.canUserAccess(owner, Action.DELETE)).toBe(true);
    });

    it('should allow shared user permitted actions', () => {
      expect(sharedResource.canUserAccess(sharedUser, Action.READ)).toBe(true);
      expect(sharedResource.canUserAccess(sharedUser, Action.UPDATE)).toBe(true);
    });

    it('should deny shared user non-permitted actions', () => {
      expect(sharedResource.canUserAccess(sharedUser, Action.DELETE)).toBe(false);
    });

    it('should deny access to non-shared user', () => {
      expect(sharedResource.canUserAccess(otherUser, Action.READ)).toBe(false);
    });

    it('should deny access when resource is archived', () => {
      const archivedResource = createSharedResource({ archived: true });
      expect(archivedResource.canUserAccess(sharedUser, Action.READ)).toBe(false);
    });

    it('should deny access when resource is expired', () => {
      const pastStartDate = new Date(baseStartDate.getTime() - 48 * 60 * 60 * 1000);
      const pastEndDate = new Date(baseStartDate.getTime() - 24 * 60 * 60 * 1000);
      
      const expiredResource = createSharedResource({ 
        startDate: pastStartDate,
        endDate: pastEndDate 
      });
      expect(expiredResource.canUserAccess(sharedUser, Action.READ)).toBe(false);
    });
  });

  describe('addSharedUser', () => {
    it('should add new user to shared list', () => {
      const sharedResource = createSharedResource();
      const newUserId = new Types.ObjectId();

      const updated = sharedResource.addSharedUser(newUserId);

      expect(updated.sharedWith).toContain(newUserId);
      expect(updated.sharedWith.length).toBe(3);
      expect(updated.updatedAt).not.toBe(sharedResource.updatedAt);
    });

    it('should not add duplicate user', () => {
      const sharedResource = createSharedResource();
      const updated = sharedResource.addSharedUser(mockUser1);

      expect(updated.sharedWith.length).toBe(2);
      expect(updated).toBe(sharedResource);
    });
  });

  describe('removeSharedUser', () => {
    it('should remove user from shared list', () => {
      const sharedResource = createSharedResource();
      const updated = sharedResource.removeSharedUser(mockUser1);

      expect(updated.sharedWith).not.toContain(mockUser1);
      expect(updated.sharedWith.length).toBe(1);
      expect(updated.sharedWith).toContain(mockUser2);
    });

    it('should handle removing non-existent user gracefully', () => {
      const sharedResource = createSharedResource();
      const nonExistentUser = new Types.ObjectId();
      const updated = sharedResource.removeSharedUser(nonExistentUser);

      expect(updated.sharedWith.length).toBe(2);
    });
  });

  describe('updateActions', () => {
    it('should update allowed actions', () => {
      const sharedResource = createSharedResource();
      const newActions = [Action.READ];

      const updated = sharedResource.updateActions(newActions);

      expect(updated.allowedActions).toEqual(newActions);
      expect(updated.updatedAt).not.toBe(sharedResource.updatedAt);
    });
  });

  describe('extend', () => {
    it('should update end date', () => {
      const sharedResource = createSharedResource();
      const newEndDate = new Date(baseStartDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      const updated = sharedResource.extend(newEndDate);

      expect(updated.endDate).toBe(newEndDate);
      expect(updated.updatedAt).not.toBe(sharedResource.updatedAt);
    });
  });

  describe('getDaysRemaining', () => {
    it('should return Infinity when no end date', () => {
      const sharedResource = createSharedResource();
      expect(sharedResource.getDaysRemaining()).toBe(Infinity);
    });

    it('should return correct days remaining', () => {
      const futureDate = new Date(baseStartDate.getTime() + 5 * 24 * 60 * 60 * 1000);
      const sharedResource = createSharedResource({ endDate: futureDate });
      
      expect(sharedResource.getDaysRemaining()).toBe(5);
    });

    it('should return 0 for past dates', () => {
      const pastStartDate = new Date(baseStartDate.getTime() - 48 * 60 * 60 * 1000);
      const pastEndDate = new Date(baseStartDate.getTime() - 24 * 60 * 60 * 1000);
      
      const sharedResource = createSharedResource({ 
        startDate: pastStartDate,
        endDate: pastEndDate 
      });
      expect(sharedResource.getDaysRemaining()).toBe(0);
    });
  });

  describe('canBeDeleted', () => {
    it('should allow deletion of archived resource', () => {
      const sharedResource = createSharedResource({ archived: true });
      expect(sharedResource.canBeDeleted()).toBe(true);
    });

    it('should allow deletion of expired resource', () => {
      const pastStartDate = new Date(baseStartDate.getTime() - 48 * 60 * 60 * 1000);
      const pastEndDate = new Date(baseStartDate.getTime() - 24 * 60 * 60 * 1000);
      
      const sharedResource = createSharedResource({ 
        startDate: pastStartDate,
        endDate: pastEndDate 
      });
      expect(sharedResource.canBeDeleted()).toBe(true);
    });

    it('should not allow deletion of active resource', () => {
      const sharedResource = createSharedResource();
      expect(sharedResource.canBeDeleted()).toBe(false);
    });
  });
});