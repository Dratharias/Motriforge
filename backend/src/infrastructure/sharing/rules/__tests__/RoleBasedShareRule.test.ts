import { describe, it, expect } from 'vitest';
import { Types } from 'mongoose';
import { RoleBasedShareRule } from '../RoleBasedShareRule';
import { Role, ResourceType, Action } from '../../../../types/core/enums';
import { IShareRuleContext } from '../interfaces';
import { IUser } from '../../../../types/core/interfaces';

describe('RoleBasedShareRule', () => {
  const rule = new RoleBasedShareRule();
  const orgId = new Types.ObjectId();

  const createUser = (role: Role): IUser => ({
    id: new Types.ObjectId(),
    email: `${role.toLowerCase()}@example.com`,
    role,
    status: 'ACTIVE',
    organization: orgId,
    createdAt: new Date(),
    lastActiveAt: new Date()
  });

  const createContext = (
    sharerRole: Role,
    targetRole: Role,
    resourceType: ResourceType,
    actions: Action[]
  ): IShareRuleContext => ({
    sharer: createUser(sharerRole),
    targetUser: createUser(targetRole),
    resourceId: new Types.ObjectId(),
    resourceType,
    requestedActions: actions,
    shareRequest: {
      resourceId: new Types.ObjectId(),
      resourceType,
      targetUsers: [new Types.ObjectId()],
      allowedActions: actions
    }
  });

  it('should have correct properties', () => {
    expect(rule.name).toBe('RoleBasedShareRule');
    expect(rule.priority).toBe(90);
    expect(rule.description).toContain('role-based');
  });

  describe('admin permissions', () => {
    it('should allow admin to share any resource type', async () => {
      const context = createContext(Role.ADMIN, Role.TRAINER, ResourceType.PROGRAM, [Action.READ]);
      const result = await rule.evaluate(context);

      expect(result.allowed).toBe(true);
      expect(result.maxDuration).toBe(365);
    });

    it('should allow admin to share with any role', async () => {
      const context = createContext(Role.ADMIN, Role.GUEST, ResourceType.EXERCISE, [Action.READ]);
      const result = await rule.evaluate(context);

      expect(result.allowed).toBe(true);
    });
  });

  describe('trainer permissions', () => {
    it('should allow trainer to share exercises with clients', async () => {
      const context = createContext(Role.TRAINER, Role.CLIENT, ResourceType.EXERCISE, [Action.READ]);
      const result = await rule.evaluate(context);

      expect(result.allowed).toBe(true);
    });

    it('should deny trainer sharing profiles', async () => {
      const context = createContext(Role.TRAINER, Role.CLIENT, ResourceType.PROFILE, [Action.READ]);
      const result = await rule.evaluate(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('cannot share PROFILE');
    });

    it('should restrict trainer from delete actions', async () => {
      const context = createContext(Role.TRAINER, Role.CLIENT, ResourceType.EXERCISE, [Action.READ, Action.DELETE]);
      const result = await rule.evaluate(context);

      expect(result.allowed).toBe(true); // Allowed but with restrictions
      expect(result.suggestedActions).toEqual([Action.READ]);
      expect(result.warnings).toContain('Some requested actions were restricted');
    });

    it('should deny trainer sharing with managers', async () => {
      const context = createContext(Role.TRAINER, Role.MANAGER, ResourceType.EXERCISE, [Action.READ]);
      const result = await rule.evaluate(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('cannot share with MANAGER');
    });
  });

  describe('client permissions', () => {
    it('should allow client to share progress with trainer', async () => {
      const context = createContext(Role.CLIENT, Role.TRAINER, ResourceType.PROGRESS, [Action.READ]);
      const result = await rule.evaluate(context);

      expect(result.allowed).toBe(true);
      expect(result.maxDuration).toBe(30);
    });

    it('should deny client sharing exercises', async () => {
      const context = createContext(Role.CLIENT, Role.TRAINER, ResourceType.EXERCISE, [Action.READ]);
      const result = await rule.evaluate(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('cannot share EXERCISE');
    });

    it('should restrict client actions', async () => {
      const context = createContext(Role.CLIENT, Role.TRAINER, ResourceType.PROGRESS, [Action.READ, Action.UPDATE]);
      const result = await rule.evaluate(context);

      expect(result.allowed).toBe(true);
      expect(result.suggestedActions).toEqual([Action.READ]);
    });
  });

  describe('guest permissions', () => {
    it('should deny all sharing for guests', async () => {
      const context = createContext(Role.GUEST, Role.CLIENT, ResourceType.DASHBOARD, [Action.READ]);
      const result = await rule.evaluate(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('cannot share');
    });
  });
});

