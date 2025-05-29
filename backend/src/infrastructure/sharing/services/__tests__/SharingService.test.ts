import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { SharingService } from '../SharingService';
import { SharedResource } from '../../entities/SharedResource';
import { Role, ResourceType, Action } from '../../../../types/core/enums';
import { IUser } from '../../../../types/core/interfaces';
import { IShareRequest } from '../../entities/interfaces';

describe('SharingService', () => {
  let sharingService: SharingService;
  let mockDependencies: any;

  const orgId = new Types.ObjectId();
  const resourceId = new Types.ObjectId();

  const createUser = (role: Role, id?: Types.ObjectId): IUser => ({
    id: id ?? new Types.ObjectId(),
    email: `${role.toLowerCase()}@example.com`,
    role,
    status: 'ACTIVE',
    organization: orgId,
    createdAt: new Date(),
    lastActiveAt: new Date()
  });

  const mockShare = new SharedResource({
    resourceId,
    resourceType: ResourceType.WORKOUT,
    owner: new Types.ObjectId(),
    sharedWith: [new Types.ObjectId()],
    allowedActions: [Action.READ],
    startDate: new Date(),
    createdBy: new Types.ObjectId()
  });

  beforeEach(() => {
    mockDependencies = {
      shareRepository: {
        findById: vi.fn(),
        findByUserAndResource: vi.fn(),
        findByOwnerId: vi.fn(),
        findBySharedUserId: vi.fn(),
        findByResourceId: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        archive: vi.fn(),
        bulkArchiveExpired: vi.fn()
      },
      shareValidator: {
        validateShareRequest: vi.fn(),
        validateAccess: vi.fn()
      },
      // Remove ruleEngine to use basic validation path - more predictable for tests
      notificationService: {
        notifyResourceShared: vi.fn(),
        notifyResourceRevoked: vi.fn()
      },
      expirationService: {
        scheduleExpiration: vi.fn(),
        cancelExpiration: vi.fn(),
        updateExpiration: vi.fn()
      },
      auditService: {
        logShareCreated: vi.fn(),
        logShareRevoked: vi.fn(),
        logShareError: vi.fn(),
        logAccessAttempt: vi.fn(),
        logShareUpdated: vi.fn()
      }
    };

    sharingService = new SharingService(mockDependencies);
  });

  describe('shareResource', () => {
    const shareRequest: IShareRequest = {
      resourceId,
      resourceType: ResourceType.WORKOUT,
      targetUsers: [new Types.ObjectId()],
      allowedActions: [Action.READ]
    };

    it('should successfully share resource', async () => {
      const sharer = createUser(Role.TRAINER);
      const targetUsers = [createUser(Role.CLIENT)];

      mockDependencies.shareValidator.validateShareRequest.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      });
      mockDependencies.shareRepository.create.mockResolvedValue(mockShare);

      const result = await sharingService.shareResource(shareRequest, sharer, targetUsers);

      expect(result.success).toBe(true);
      expect(result.shareId).toBe(mockShare.id);
      expect(mockDependencies.shareRepository.create).toHaveBeenCalled();
      expect(mockDependencies.notificationService.notifyResourceShared).toHaveBeenCalledWith(
        mockShare,
        targetUsers,
        sharer
      );
      expect(mockDependencies.auditService.logShareCreated).toHaveBeenCalled();
    });

    it('should fail validation and return errors', async () => {
      const sharer = createUser(Role.CLIENT);
      const targetUsers = [createUser(Role.TRAINER)];

      mockDependencies.shareValidator.validateShareRequest.mockResolvedValue({
        isValid: false,
        errors: [{ message: 'Invalid request' }],
        warnings: []
      });

      const result = await sharingService.shareResource(shareRequest, sharer, targetUsers);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid request');
      expect(mockDependencies.shareRepository.create).not.toHaveBeenCalled();
    });

    it('should schedule expiration for shares with end date', async () => {
      const sharer = createUser(Role.TRAINER);
      const targetUsers = [createUser(Role.CLIENT)];
      const shareWithEndDate = new SharedResource({
        ...mockShare,
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      mockDependencies.shareValidator.validateShareRequest.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      });
      mockDependencies.shareRepository.create.mockResolvedValue(shareWithEndDate);

      await sharingService.shareResource(shareRequest, sharer, targetUsers);

      expect(mockDependencies.expirationService.scheduleExpiration).toHaveBeenCalledWith(shareWithEndDate);
    });

    it('should handle errors during share creation', async () => {
      const sharer = createUser(Role.TRAINER);
      const targetUsers = [createUser(Role.CLIENT)];

      mockDependencies.shareValidator.validateShareRequest.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      });
      mockDependencies.shareRepository.create.mockRejectedValue(new Error('Database error'));

      const result = await sharingService.shareResource(shareRequest, sharer, targetUsers);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Database error');
      expect(mockDependencies.auditService.logShareError).toHaveBeenCalled();
    });
  });

  describe('revokeShare', () => {
    const shareId = new Types.ObjectId();

    it('should successfully revoke share by owner', async () => {
      const owner = createUser(Role.TRAINER, mockShare.owner);

      mockDependencies.shareRepository.findById.mockResolvedValue(mockShare);
      mockDependencies.shareRepository.archive.mockResolvedValue(true);

      const result = await sharingService.revokeShare(shareId, owner);

      expect(result.success).toBe(true);
      expect(mockDependencies.shareRepository.archive).toHaveBeenCalledWith(shareId);
      expect(mockDependencies.expirationService.cancelExpiration).toHaveBeenCalledWith(shareId);
      expect(mockDependencies.auditService.logShareRevoked).toHaveBeenCalled();
    });

    it('should allow admin to revoke any share', async () => {
      const admin = createUser(Role.ADMIN);

      mockDependencies.shareRepository.findById.mockResolvedValue(mockShare);
      mockDependencies.shareRepository.archive.mockResolvedValue(true);

      const result = await sharingService.revokeShare(shareId, admin);

      expect(result.success).toBe(true);
    });

    it('should deny revocation by non-owner non-admin', async () => {
      const otherUser = createUser(Role.TRAINER);

      mockDependencies.shareRepository.findById.mockResolvedValue(mockShare);

      const result = await sharingService.revokeShare(shareId, otherUser);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Not authorized to revoke this share');
      expect(mockDependencies.auditService.logShareError).toHaveBeenCalled();
    });

    it('should handle non-existent share', async () => {
      const owner = createUser(Role.TRAINER);

      mockDependencies.shareRepository.findById.mockResolvedValue(null);

      const result = await sharingService.revokeShare(shareId, owner);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Shared resource not found');
    });
  });

  describe('checkAccess', () => {
    const userId = new Types.ObjectId();
    const user = createUser(Role.CLIENT, userId);

    it('should allow access for valid share', async () => {
      mockDependencies.shareRepository.findByUserAndResource.mockResolvedValue(mockShare);
      mockDependencies.shareValidator.validateAccess.mockReturnValue({
        isValid: true,
        errors: []
      });

      const result = await sharingService.checkAccess(resourceId, user, Action.READ);

      expect(result.allowed).toBe(true);
      expect(result.sharedResource).toBe(mockShare);
      expect(mockDependencies.auditService.logAccessAttempt).toHaveBeenCalledWith(
        mockShare,
        user,
        Action.READ,
        true
      );
    });

    it('should deny access when resource not shared', async () => {
      mockDependencies.shareRepository.findByUserAndResource.mockResolvedValue(null);

      const result = await sharingService.checkAccess(resourceId, user, Action.READ);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Resource not shared with user');
    });

    it('should deny access when validation fails', async () => {
      mockDependencies.shareRepository.findByUserAndResource.mockResolvedValue(mockShare);
      mockDependencies.shareValidator.validateAccess.mockReturnValue({
        isValid: false,
        errors: [{ message: 'Access denied' }]
      });

      const result = await sharingService.checkAccess(resourceId, user, Action.UPDATE);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Access denied');
      expect(mockDependencies.auditService.logAccessAttempt).toHaveBeenCalledWith(
        mockShare,
        user,
        Action.UPDATE,
        false,
        'Access denied'
      );
    });
  });

  describe('extendShare', () => {
    const shareId = new Types.ObjectId();
    const newEndDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    it('should successfully extend share', async () => {
      const owner = createUser(Role.TRAINER, mockShare.owner);
      const extendedShare = mockShare.extend(newEndDate);

      mockDependencies.shareRepository.findById.mockResolvedValue(mockShare);
      mockDependencies.shareRepository.update.mockResolvedValue(extendedShare);

      const result = await sharingService.extendShare(shareId, newEndDate, owner);

      expect(result.success).toBe(true);
      
      // Check the call was made - the actual object passed will have a similar structure
      expect(mockDependencies.shareRepository.update).toHaveBeenCalledWith(
        shareId, 
        expect.any(Object)  // Just verify an object was passed
      );
      
      // Verify the object passed has the right end date
      const [, passedShare] = mockDependencies.shareRepository.update.mock.calls[0];
      expect(passedShare.endDate).toEqual(newEndDate);
      expect(passedShare.id).toEqual(mockShare.id);
      expect(passedShare.resourceId).toEqual(mockShare.resourceId);
      
      expect(mockDependencies.expirationService.updateExpiration).toHaveBeenCalledWith(extendedShare);
      expect(mockDependencies.auditService.logShareUpdated).toHaveBeenCalled();
    });

    it('should deny extension by non-owner', async () => {
      const otherUser = createUser(Role.TRAINER);

      mockDependencies.shareRepository.findById.mockResolvedValue(mockShare);

      const result = await sharingService.extendShare(shareId, newEndDate, otherUser);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Not authorized to extend this share');
    });

    it('should reject past end dates', async () => {
      const owner = createUser(Role.TRAINER, mockShare.owner);
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

      mockDependencies.shareRepository.findById.mockResolvedValue(mockShare);

      const result = await sharingService.extendShare(shareId, pastDate, owner);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('End date must be in the future');
    });
  });

  describe('getUserShares', () => {
    it('should return owned and shared resources', async () => {
      const userId = new Types.ObjectId();
      const ownedShares = [mockShare];
      const sharedWithUserShares = [mockShare];

      mockDependencies.shareRepository.findByOwnerId.mockResolvedValue(ownedShares);
      mockDependencies.shareRepository.findBySharedUserId.mockResolvedValue(sharedWithUserShares);

      const result = await sharingService.getUserShares(userId);

      expect(result.owned).toEqual(ownedShares);
      expect(result.sharedWithUser).toEqual(sharedWithUserShares);
    });
  });

  describe('processExpiredShares', () => {
    it('should bulk archive expired shares', async () => {
      mockDependencies.shareRepository.bulkArchiveExpired.mockResolvedValue(5);

      const result = await sharingService.processExpiredShares();

      expect(result).toBe(5);
      expect(mockDependencies.shareRepository.bulkArchiveExpired).toHaveBeenCalled();
    });
  });

  describe('rule engine integration', () => {
    beforeEach(() => {
      // Add rule engine for these specific tests
      mockDependencies.ruleEngine = {
        evaluateRules: vi.fn()
      };
      sharingService = new SharingService(mockDependencies);
    });

    it('should use enhanced validation when rule engine is available', async () => {
      const sharer = createUser(Role.TRAINER);
      const targetUsers = [createUser(Role.CLIENT)];
      const shareRequest: IShareRequest = {
        resourceId,
        resourceType: ResourceType.WORKOUT,
        targetUsers: [targetUsers[0].id],
        allowedActions: [Action.READ]
      };

      // Mock basic validation success
      mockDependencies.shareValidator.validateShareRequest.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      // Mock rule engine success
      mockDependencies.ruleEngine.evaluateRules.mockResolvedValue({
        allowed: true,
        appliedRules: ['RoleBasedShareRule'],
        failedRules: [],
        warnings: [],
        suggestedActions: [],
        maxDuration: undefined
      });

      mockDependencies.shareRepository.create.mockResolvedValue(mockShare);

      const result = await sharingService.shareResource(shareRequest, sharer, targetUsers);

      expect(result.success).toBe(true);
      expect(mockDependencies.ruleEngine.evaluateRules).toHaveBeenCalled();
    });

    it('should handle rule engine restrictions with suggested actions', async () => {
      const sharer = createUser(Role.TRAINER);
      const targetUsers = [createUser(Role.CLIENT)];
      const shareRequest: IShareRequest = {
        resourceId,
        resourceType: ResourceType.EXERCISE,
        targetUsers: [targetUsers[0].id],
        allowedActions: [Action.READ, Action.DELETE]
      };

      // Mock basic validation success
      mockDependencies.shareValidator.validateShareRequest.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      // Mock rule engine with restrictions
      mockDependencies.ruleEngine.evaluateRules.mockResolvedValue({
        allowed: true,
        appliedRules: ['RoleBasedShareRule'],
        failedRules: [],
        warnings: ['Some requested actions were restricted'],
        suggestedActions: [Action.READ], // DELETE restricted
        maxDuration: 90
      });

      mockDependencies.shareRepository.create.mockResolvedValue(mockShare);

      const result = await sharingService.shareResource(shareRequest, sharer, targetUsers);

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Some requested actions were restricted');
      expect(mockDependencies.ruleEngine.evaluateRules).toHaveBeenCalled();
    });
  });
});