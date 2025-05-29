import { describe, it, expect, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { IAMService } from '../services/IAMService';
import { PermissionSet } from '../permissions/core/PermissionSet';
import { IPermissionSet } from '../permissions/core/interfaces';
import { AccessValidationService } from '../validation/AccessValidationService';
import { Role, ResourceType, Action } from '../../../types/core/enums';
import { IUser } from '../../../types/core/interfaces';

// Mock repository for testing
class MockPermissionRepository {
  private permissions = new Map<Role, IPermissionSet>();

  async findByRole(role: Role): Promise<IPermissionSet | null> {
    return this.permissions.get(role) ?? null;
  }

  async findById(id: Types.ObjectId): Promise<IPermissionSet | null> {
    for (const permissionSet of this.permissions.values()) {
      if (permissionSet.id.equals(id)) {
        return permissionSet;
      }
    }
    return null;
  }

  async create(permissionSet: IPermissionSet): Promise<IPermissionSet> {
    this.permissions.set(permissionSet.role, permissionSet);
    return permissionSet;
  }

  async update(id: Types.ObjectId, updates: Partial<IPermissionSet>): Promise<IPermissionSet | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated = existing.update(updates as any);
    this.permissions.set(updated.role, updated);
    return updated;
  }

  async delete(id: Types.ObjectId): Promise<boolean> {
    for (const [role, permissionSet] of this.permissions.entries()) {
      if (permissionSet.id.equals(id)) {
        this.permissions.delete(role);
        return true;
      }
    }
    return false;
  }

  async findAll(): Promise<readonly IPermissionSet[]> {
    return Array.from(this.permissions.values());
  }

  async findActive(): Promise<readonly IPermissionSet[]> {
    return Array.from(this.permissions.values()).filter(p => p.isActive);
  }

  async isRolePermissionExists(role: Role): Promise<boolean> {
    return this.permissions.has(role);
  }
}

describe('IAM Integration Tests', () => {
  let iamService: IAMService;
  let validationService: AccessValidationService;
  let mockRepository: MockPermissionRepository;

  const organizationId = new Types.ObjectId();

  const adminUser: IUser = {
    id: new Types.ObjectId(),
    email: 'admin@example.com',
    role: Role.ADMIN,
    status: 'ACTIVE',
    organization: organizationId,
    createdAt: new Date(),
    lastActiveAt: new Date()
  };

  const trainerUser: IUser = {
    id: new Types.ObjectId(),
    email: 'trainer@example.com',
    role: Role.TRAINER,
    status: 'ACTIVE',
    organization: organizationId,
    createdAt: new Date(),
    lastActiveAt: new Date()
  };

  const clientUser: IUser = {
    id: new Types.ObjectId(),
    email: 'client@example.com',
    role: Role.CLIENT,
    status: 'ACTIVE',
    organization: organizationId,
    createdAt: new Date(),
    lastActiveAt: new Date()
  };

  beforeEach(async () => {
    mockRepository = new MockPermissionRepository();
    iamService = new IAMService(mockRepository);
    validationService = new AccessValidationService();

    // Set up role permissions
    await setupRolePermissions();
  });

  async function setupRolePermissions(): Promise<void> {
    // Admin permissions - full access
    const adminPermissionSet = new PermissionSet({
      role: Role.ADMIN,
      permissions: [
        { resource: ResourceType.EXERCISE, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.SHARE] },
        { resource: ResourceType.WORKOUT, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.SHARE] },
        { resource: ResourceType.PROGRAM, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.SHARE] },
        { resource: ResourceType.PROFILE, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE] }
      ],
      description: 'Administrator permissions',
      createdBy: adminUser.id
    });

    // Trainer permissions - create and manage exercises/workouts
    const trainerPermissionSet = new PermissionSet({
      role: Role.TRAINER,
      permissions: [
        { resource: ResourceType.EXERCISE, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.SHARE] },
        { resource: ResourceType.WORKOUT, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.SHARE] },
        { resource: ResourceType.PROGRAM, actions: [Action.READ, Action.SHARE] },
        { resource: ResourceType.PROFILE, actions: [Action.READ] }
      ],
      description: 'Trainer permissions',
      createdBy: adminUser.id
    });

    // Client permissions - read only with own data access
    const clientPermissionSet = new PermissionSet({
      role: Role.CLIENT,
      permissions: [
        { resource: ResourceType.EXERCISE, actions: [Action.READ] },
        { resource: ResourceType.WORKOUT, actions: [Action.READ] },
        { resource: ResourceType.PROGRAM, actions: [Action.READ] },
        { resource: ResourceType.PROFILE, actions: [Action.READ, Action.UPDATE] }
      ],
      description: 'Client permissions',
      createdBy: adminUser.id
    });

    await mockRepository.create(adminPermissionSet);
    await mockRepository.create(trainerPermissionSet);
    await mockRepository.create(clientPermissionSet);
  }

  describe('Role-based Access Control', () => {
    it('should allow admin full access to all resources', async () => {
      const canCreateExercise = await iamService.canAccess(adminUser, ResourceType.EXERCISE, Action.CREATE);
      const canDeleteWorkout = await iamService.canAccess(adminUser, ResourceType.WORKOUT, Action.DELETE);
      const canUpdateProfile = await iamService.canAccess(adminUser, ResourceType.PROFILE, Action.UPDATE);

      expect(canCreateExercise).toBe(true);
      expect(canDeleteWorkout).toBe(true);
      expect(canUpdateProfile).toBe(true);
    });

    it('should allow trainer to create and manage exercises/workouts', async () => {
      const canCreateExercise = await iamService.canAccess(trainerUser, ResourceType.EXERCISE, Action.CREATE);
      const canUpdateWorkout = await iamService.canAccess(trainerUser, ResourceType.WORKOUT, Action.UPDATE);
      const canShareExercise = await iamService.canAccess(trainerUser, ResourceType.EXERCISE, Action.SHARE);

      expect(canCreateExercise).toBe(true);
      expect(canUpdateWorkout).toBe(true);
      expect(canShareExercise).toBe(true);
    });

    it('should deny trainer delete permissions', async () => {
      const canDeleteExercise = await iamService.canAccess(trainerUser, ResourceType.EXERCISE, Action.DELETE);
      const canDeleteProfile = await iamService.canAccess(trainerUser, ResourceType.PROFILE, Action.DELETE);

      expect(canDeleteExercise).toBe(false);
      expect(canDeleteProfile).toBe(false);
    });

    it('should allow client read access only', async () => {
      const canReadExercise = await iamService.canAccess(clientUser, ResourceType.EXERCISE, Action.READ);
      const canUpdateOwnProfile = await iamService.canAccess(clientUser, ResourceType.PROFILE, Action.UPDATE);

      expect(canReadExercise).toBe(true);
      expect(canUpdateOwnProfile).toBe(true);
    });

    it('should deny client create/delete permissions', async () => {
      const canCreateExercise = await iamService.canAccess(clientUser, ResourceType.EXERCISE, Action.CREATE);
      const canDeleteWorkout = await iamService.canAccess(clientUser, ResourceType.WORKOUT, Action.DELETE);

      expect(canCreateExercise).toBe(false);
      expect(canDeleteWorkout).toBe(false);
    });
  });

  describe('Sharing Permissions', () => {
    it('should allow trainer to share with client in same organization', async () => {
      const canShare = await iamService.canShare(trainerUser, clientUser, ResourceType.WORKOUT);
      expect(canShare).toBe(true);
    });

    it('should allow admin to share with anyone in same organization', async () => {
      const canShareWithTrainer = await iamService.canShare(adminUser, trainerUser, ResourceType.PROGRAM);
      const canShareWithClient = await iamService.canShare(adminUser, clientUser, ResourceType.EXERCISE);

      expect(canShareWithTrainer).toBe(true);
      expect(canShareWithClient).toBe(true);
    });

    it('should deny sharing without share permission', async () => {
      const canShare = await iamService.canShare(clientUser, trainerUser, ResourceType.EXERCISE);
      expect(canShare).toBe(false);
    });

    it('should deny cross-organization sharing', async () => {
      const differentOrgUser = {
        ...clientUser,
        organization: new Types.ObjectId()
      };

      const canShare = await iamService.canShare(trainerUser, differentOrgUser, ResourceType.WORKOUT);
      expect(canShare).toBe(false);
    });
  });

  describe('Permission Validation', () => {
    it('should validate user permissions correctly', async () => {
      const trainerPermissions = await iamService.getUserPermissions(trainerUser);
      
      expect(trainerPermissions.length).toBe(4);
      
      const exercisePermission = trainerPermissions.find(p => p.resource === ResourceType.EXERCISE);
      expect(exercisePermission?.actions).toContain(Action.CREATE);
      expect(exercisePermission?.actions).toContain(Action.SHARE);
      expect(exercisePermission?.actions).not.toContain(Action.DELETE);
    });

    it('should handle inactive users', async () => {
      const inactiveUser = { ...trainerUser, status: 'INACTIVE' };
      
      const canAccess = await iamService.canAccess(inactiveUser, ResourceType.EXERCISE, Action.READ);
      expect(canAccess).toBe(false);
    });

    it('should validate organization context', async () => {
      const differentOrgId = new Types.ObjectId();
      
      const canAccess = await iamService.canAccess(
        trainerUser,
        ResourceType.EXERCISE,
        Action.READ,
        { organizationId: differentOrgId }
      );
      
      expect(canAccess).toBe(false);
    });
  });

  describe('Access Validation Service Integration', () => {
    it('should validate active user context', async () => {
      const context = {
        user: trainerUser,
        resource: ResourceType.EXERCISE,
        action: Action.CREATE
      };

      const result = await validationService.validate(context);
      expect(result.valid).toBe(true);
      expect(result.failedRules).toHaveLength(0);
    });

    it('should reject inactive user context', async () => {
      const inactiveUser = { ...trainerUser, status: 'INACTIVE' };
      const context = {
        user: inactiveUser,
        resource: ResourceType.EXERCISE,
        action: Action.CREATE
      };

      const result = await validationService.validate(context);
      expect(result.valid).toBe(false);
      expect(result.failedRules).toContain('UserActive');
    });

    it('should validate organization status', async () => {
      const context = {
        user: trainerUser,
        resource: ResourceType.EXERCISE,
        action: Action.CREATE,
        organizationId: organizationId,
        metadata: { organizationStatus: 'INACTIVE' }
      };

      const result = await validationService.validate(context);
      expect(result.valid).toBe(false);
      expect(result.failedRules).toContain('OrganizationActive');
    });
  });
});