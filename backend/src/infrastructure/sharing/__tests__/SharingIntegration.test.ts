import { describe, it, expect, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { SharingService } from '../services/SharingService';
import { ShareValidator } from '../engine/ShareValidator';
import { ShareConditionEngine } from '../engine/ShareConditionEngine';
import { ShareNotificationService } from '../engine/ShareNotificationService';
import { ShareExpirationService } from '../engine/ShareExpirationService';
import { ShareAuditService } from '../services/ShareAuditService';
import { ShareRuleEngine } from '../rules/ShareRuleEngine';
import { OrganizationShareRule } from '../rules/OrganizationShareRule';
import { RoleBasedShareRule } from '../rules/RoleBasedShareRule';
import { TimeBasedShareRule } from '../rules/TimeBasedShareRule';
import { Role, ResourceType, Action } from '../../../types/core/enums';
import { IUser } from '../../../types/core/interfaces';
import { IShareRequest } from '../entities/interfaces';

class MockShareRepository {
  private shares = new Map();

  async create(share: any) {
    this.shares.set(share.id.toString(), share);
    return share;
  }

  async findById(id: Types.ObjectId) {
    return this.shares.get(id.toString()) || null;
  }

  async findByUserAndResource(userId: Types.ObjectId, resourceId: Types.ObjectId) {
    for (const share of this.shares.values()) {
      if (share.sharedWith.some((id: Types.ObjectId) => id.equals(userId)) &&
          share.resourceId.equals(resourceId)) {
        return share;
      }
    }
    return null;
  }

  async findByOwnerId(ownerId: Types.ObjectId) {
    return Array.from(this.shares.values()).filter(
      (share: any) => share.owner.equals(ownerId)
    );
  }

  async findBySharedUserId(userId: Types.ObjectId) {
    return Array.from(this.shares.values()).filter(
      (share: any) => share.sharedWith.some((id: Types.ObjectId) => id.equals(userId))
    );
  }

  async findByResourceId(resourceId: Types.ObjectId) {
    return Array.from(this.shares.values()).filter(
      (share: any) => share.resourceId.equals(resourceId)
    );
  }

  async update(id: Types.ObjectId, updatedShare: any) {
    this.shares.set(id.toString(), updatedShare);
    return updatedShare;
  }

  async archive(id: Types.ObjectId) {
    const share = this.shares.get(id.toString());
    if (share) {
      this.shares.set(id.toString(), { ...share, archived: true });
      return true;
    }
    return false;
  }

  async bulkArchiveExpired() {
    return 0;
  }
}

class MockAuditRepository {
  private entries: any[] = [];

  async create(entry: any) {
    const fullEntry = {
      id: new Types.ObjectId(),
      timestamp: new Date(),
      ...entry
    };
    this.entries.push(fullEntry);
    return fullEntry;
  }

  async findByShareId(shareId: Types.ObjectId) {
    return this.entries.filter(entry => entry.shareId.equals(shareId));
  }

  async findByUserId(userId: Types.ObjectId) {
    return this.entries.filter(entry => entry.performedBy.equals(userId));
  }

  async findByDateRange(startDate: Date, endDate: Date) {
    return this.entries.filter(entry => 
      entry.timestamp >= startDate && entry.timestamp <= endDate
    );
  }

  async deleteOlderThan(cutoffDate: Date) {
    const beforeCount = this.entries.length;
    this.entries = this.entries.filter(entry => entry.timestamp >= cutoffDate);
    return beforeCount - this.entries.length;
  }
}

describe('Sharing System Integration', () => {
  let sharingService: SharingService;
  let shareRepository: MockShareRepository;
  let auditRepository: MockAuditRepository;
  let ruleEngine: ShareRuleEngine;

  const orgId = new Types.ObjectId();
  const resourceId = new Types.ObjectId();

  const createUser = (role: Role, orgId: Types.ObjectId): IUser => ({
    id: new Types.ObjectId(),
    email: `${role.toLowerCase()}@example.com`,
    role,
    status: 'ACTIVE',
    organization: orgId,
    createdAt: new Date(),
    lastActiveAt: new Date()
  });

  beforeEach(() => {
    shareRepository = new MockShareRepository();
    auditRepository = new MockAuditRepository();
    
    // Setup rule engine with all rules
    ruleEngine = new ShareRuleEngine();
    ruleEngine.addRule(new OrganizationShareRule());
    ruleEngine.addRule(new RoleBasedShareRule());
    ruleEngine.addRule(new TimeBasedShareRule());

    // Setup other dependencies
    const conditionEngine = new ShareConditionEngine();
    const shareValidator = new ShareValidator(conditionEngine);
    const notificationService = new ShareNotificationService();
    const expirationService = new ShareExpirationService(notificationService);
    const auditService = new ShareAuditService(auditRepository as any);

    // Create enhanced sharing service with rule engine integration
    sharingService = new SharingService({
      shareRepository: shareRepository as any,
      shareValidator,
      ruleEngine,
      notificationService,
      expirationService,
      auditService
    });
  });

  describe('End-to-End Share Workflow', () => {
    it('should complete successful share workflow', async () => {
      const trainer = createUser(Role.TRAINER, orgId);
      const client = createUser(Role.CLIENT, orgId);

      const shareRequest: IShareRequest = {
        resourceId,
        resourceType: ResourceType.WORKOUT,
        targetUsers: [client.id],
        allowedActions: [Action.READ, Action.UPDATE]
      };

      const shareResult = await sharingService.shareResource(shareRequest, trainer, [client]);

      expect(shareResult.success).toBe(true);
      expect(shareResult.shareId).toBeDefined();

      // Test access check
      const accessResult = await sharingService.checkAccess(resourceId, client, Action.READ);
      expect(accessResult.allowed).toBe(true);
      expect(accessResult.sharedResource).toBeDefined();

      // Test unauthorized action
      const unauthorizedResult = await sharingService.checkAccess(resourceId, client, Action.DELETE);
      expect(unauthorizedResult.allowed).toBe(false);
    });

    it('should enforce organization boundaries', async () => {
      const trainer = createUser(Role.TRAINER, orgId);
      const clientFromDifferentOrg = createUser(Role.CLIENT, new Types.ObjectId());

      const shareRequest: IShareRequest = {
        resourceId,
        resourceType: ResourceType.WORKOUT,
        targetUsers: [clientFromDifferentOrg.id],
        allowedActions: [Action.READ]
      };

      const result = await sharingService.shareResource(shareRequest, trainer, [clientFromDifferentOrg]);

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.includes('OrganizationShareRule'))).toBe(true);
    });

    it('should enforce role-based restrictions', async () => {
      const client = createUser(Role.CLIENT, orgId);
      const trainer = createUser(Role.TRAINER, orgId);

      const shareRequest: IShareRequest = {
        resourceId,
        resourceType: ResourceType.EXERCISE,
        targetUsers: [trainer.id],
        allowedActions: [Action.READ]
      };

      const result = await sharingService.shareResource(shareRequest, client, [trainer]);

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.includes('RoleBasedShareRule'))).toBe(true);
    });

    it('should handle share revocation workflow', async () => {
      const trainer = createUser(Role.TRAINER, orgId);
      const client = createUser(Role.CLIENT, orgId);

      const shareRequest: IShareRequest = {
        resourceId,
        resourceType: ResourceType.WORKOUT,
        targetUsers: [client.id],
        allowedActions: [Action.READ]
      };

      // Create share
      const shareResult = await sharingService.shareResource(shareRequest, trainer, [client]);
      expect(shareResult.success).toBe(true);

      // Verify access
      let accessResult = await sharingService.checkAccess(resourceId, client, Action.READ);
      expect(accessResult.allowed).toBe(true);

      // Revoke share
      const revokeResult = await sharingService.revokeShare(shareResult.shareId!, trainer);
      expect(revokeResult.success).toBe(true);

      // Verify access is denied after revocation
      accessResult = await sharingService.checkAccess(resourceId, client, Action.READ);
      expect(accessResult.allowed).toBe(false);
    });

    it('should handle complex validation scenarios', async () => {
      const trainer = createUser(Role.TRAINER, orgId);
      const client = createUser(Role.CLIENT, orgId);

      // Request with restricted actions (DELETE not allowed for trainers)
      const shareRequest: IShareRequest = {
        resourceId,
        resourceType: ResourceType.EXERCISE,
        targetUsers: [client.id],
        allowedActions: [Action.READ, Action.DELETE]
      };

      const result = await sharingService.shareResource(shareRequest, trainer, [client]);

      // Should succeed with warnings about restricted actions
      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Rule Engine Integration', () => {
    it('should apply multiple rules correctly', async () => {
      const trainer = createUser(Role.TRAINER, orgId);
      const clientFromDifferentOrg = createUser(Role.CLIENT, new Types.ObjectId());

      const context = {
        sharer: trainer,
        targetUser: clientFromDifferentOrg,
        resourceId,
        resourceType: ResourceType.WORKOUT,
        requestedActions: [Action.READ],
        shareRequest: {
          resourceId,
          resourceType: ResourceType.WORKOUT,
          targetUsers: [clientFromDifferentOrg.id],
          allowedActions: [Action.READ]
        }
      };

      const ruleResult = await ruleEngine.evaluateRules(context);

      expect(ruleResult.allowed).toBe(false);
      expect(ruleResult.failedRules).toContain('OrganizationShareRule');
      expect(ruleResult.appliedRules.length).toBeGreaterThan(0);
    });

    it('should collect warnings from multiple rules', async () => {
      const admin = createUser(Role.ADMIN, orgId);
      const clientFromDifferentOrg = createUser(Role.CLIENT, new Types.ObjectId());

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 200);

      const context = {
        sharer: admin,
        targetUser: clientFromDifferentOrg,
        resourceId,
        resourceType: ResourceType.WORKOUT,
        requestedActions: [Action.READ],
        shareRequest: {
          resourceId,
          resourceType: ResourceType.WORKOUT,
          targetUsers: [clientFromDifferentOrg.id],
          allowedActions: [Action.READ],
          endDate: futureDate
        }
      };

      const ruleResult = await ruleEngine.evaluateRules(context);

      expect(ruleResult.allowed).toBe(true);
      expect(ruleResult.warnings.length).toBeGreaterThan(0);
      expect(ruleResult.warnings.some(w => w.includes('Cross-organization'))).toBe(true);
    });
  });

  describe('Audit Trail', () => {
    it('should create comprehensive audit trail', async () => {
      const trainer = createUser(Role.TRAINER, orgId);
      const client = createUser(Role.CLIENT, orgId);

      const shareRequest: IShareRequest = {
        resourceId,
        resourceType: ResourceType.WORKOUT,
        targetUsers: [client.id],
        allowedActions: [Action.READ]
      };

      // Create share
      const shareResult = await sharingService.shareResource(shareRequest, trainer, [client]);
      expect(shareResult.success).toBe(true);

      // Access resource
      await sharingService.checkAccess(resourceId, client, Action.READ);

      // Revoke share
      await sharingService.revokeShare(shareResult.shareId!, trainer);

      // Verify audit entries
      expect(auditRepository['entries'].length).toBeGreaterThan(0);

      const shareCreatedEntry = auditRepository['entries'].find(e => e.action === 'CREATED');
      expect(shareCreatedEntry).toBeDefined();
      expect(shareCreatedEntry.performedBy.equals(trainer.id)).toBe(true);

      const accessEntry = auditRepository['entries'].find(e => e.action === 'ACCESSED');
      expect(accessEntry).toBeDefined();
      expect(accessEntry.performedBy.equals(client.id)).toBe(true);

      const revokeEntry = auditRepository['entries'].find(e => e.action === 'REVOKED');
      expect(revokeEntry).toBeDefined();
      expect(revokeEntry.performedBy.equals(trainer.id)).toBe(true);
    });
  });
});