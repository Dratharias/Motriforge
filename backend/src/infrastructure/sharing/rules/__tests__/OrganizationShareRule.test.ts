import { describe, it, expect } from 'vitest';
import { Types } from 'mongoose';
import { OrganizationShareRule } from '../OrganizationShareRule';
import { Role, ResourceType, Action } from '../../../../types/core/enums';
import { IShareRuleContext } from '../interfaces';
import { IUser } from '../../../../types/core/interfaces';

describe('OrganizationShareRule', () => {
  const rule = new OrganizationShareRule();
  const sameOrgId = new Types.ObjectId();
  const differentOrgId = new Types.ObjectId();

  const createUser = (role: Role, orgId: Types.ObjectId): IUser => ({
    id: new Types.ObjectId(),
    email: `user@example.com`,
    role,
    status: 'ACTIVE',
    organization: orgId,
    createdAt: new Date(),
    lastActiveAt: new Date()
  });

  const createContext = (sharerRole: Role, sharerOrg: Types.ObjectId, targetOrg: Types.ObjectId): IShareRuleContext => ({
    sharer: createUser(sharerRole, sharerOrg),
    targetUser: createUser(Role.CLIENT, targetOrg),
    resourceId: new Types.ObjectId(),
    resourceType: ResourceType.WORKOUT,
    requestedActions: [Action.READ],
    shareRequest: {
      resourceId: new Types.ObjectId(),
      resourceType: ResourceType.WORKOUT,
      targetUsers: [new Types.ObjectId()],
      allowedActions: [Action.READ]
    }
  });

  it('should have correct properties', () => {
    expect(rule.name).toBe('OrganizationShareRule');
    expect(rule.priority).toBe(100);
    expect(rule.description).toContain('same organization');
  });

  it('should apply to all contexts', () => {
    const context = createContext(Role.TRAINER, sameOrgId, sameOrgId);
    expect(rule.appliesTo(context)).toBe(true);
  });

  describe('same organization sharing', () => {
    it('should allow sharing within same organization', async () => {
      const context = createContext(Role.TRAINER, sameOrgId, sameOrgId);
      const result = await rule.evaluate(context);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.warnings).toEqual([]);
    });
  });

  describe('cross-organization sharing', () => {
    it('should allow cross-org sharing for admins with warnings', async () => {
      const context = createContext(Role.ADMIN, sameOrgId, differentOrgId);
      const result = await rule.evaluate(context);

      expect(result.allowed).toBe(true);
      expect(result.warnings).toContain('Cross-organization sharing detected');
      expect(result.maxDuration).toBe(30);
    });

    it('should deny cross-org sharing for non-admins', async () => {
      const context = createContext(Role.TRAINER, sameOrgId, differentOrgId);
      const result = await rule.evaluate(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Cannot share resources outside of your organization');
    });
  });
});

