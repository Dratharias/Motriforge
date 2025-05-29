import { describe, it, expect, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { Role, ResourceType, Action, Status } from '../../../types/core/enums';
import { IUser } from '../../../types/core/interfaces';
import { IAMService } from '../core/IAMService';
import { PermissionSet } from '../core/PermissionSet';
import { DefaultPermissions } from '../core/DefaultPermissions';
import { IPermissionRepository, IPermissionSet } from '../core/interfaces';

class MockPermissionRepository implements IPermissionRepository {
  private permissions = new Map<Role, IPermissionSet>();

  constructor() {
    this.setupDefaultPermissions();
  }

  async findByRole(role: Role): Promise<IPermissionSet | null> {
    return this.permissions.get(role) ?? null;
  }

  async create(permissionSet: IPermissionSet): Promise<IPermissionSet> {
    this.permissions.set(permissionSet.role, permissionSet);
    return permissionSet;
  }

  async update(id: Types.ObjectId, updates: Partial<IPermissionSet>): Promise<IPermissionSet | null> {
    for (const [role, permissionSet] of this.permissions.entries()) {
      if (permissionSet.id.equals(id)) {
        Object.assign(permissionSet, updates);
        return permissionSet;
      }
    }
    return null;
  }

  private setupDefaultPermissions(): void {
    const roles = [Role.ADMIN, Role.TRAINER, Role.CLIENT, Role.MANAGER, Role.GUEST];
    
    for (const role of roles) {
      const permissions = DefaultPermissions.getForRole(role);
      const description = DefaultPermissions.createDescription(role);
      
      const permissionSet = new PermissionSet({
        role,
        permissions,
        description,
        isActive: true
      });
      
      this.permissions.set(role, permissionSet);
    }
  }
}

describe('IAM Core Tests', () => {
  let iamService: IAMService;
  let mockRepo: MockPermissionRepository;
  
  const organizationId = new Types.ObjectId();
  
  const createUser = (role: Role): IUser => ({
    id: new Types.ObjectId(),
    email: `${role.toLowerCase()}@test.com`,
    role,
    status: Status.ACTIVE,
    organization: organizationId,
    createdAt: new Date(),
    lastActiveAt: new Date()
  });

  beforeEach(() => {
    mockRepo = new MockPermissionRepository();
    iamService = new IAMService(mockRepo);
  });

  describe('Permission Checking', () => {
    it('should grant admin full access', async () => {
      const admin = createUser(Role.ADMIN);
      
      const canDelete = await iamService.canAccess(admin, ResourceType.EXERCISE, Action.DELETE);
      const canCreate = await iamService.canAccess(admin, ResourceType.WORKOUT, Action.CREATE);
      
      expect(canDelete).toBe(true);
      expect(canCreate).toBe(true);
    });

    it('should grant trainer appropriate access', async () => {
      const trainer = createUser(Role.TRAINER);
      
      const canCreate = await iamService.canAccess(trainer, ResourceType.EXERCISE, Action.CREATE);
      const canDelete = await iamService.canAccess(trainer, ResourceType.EXERCISE, Action.DELETE);
      
      expect(canCreate).toBe(true);
      expect(canDelete).toBe(false);
    });

    it('should grant client limited access', async () => {
      const client = createUser(Role.CLIENT);
      
      const canRead = await iamService.canAccess(client, ResourceType.EXERCISE, Action.READ);
      const canCreate = await iamService.canAccess(client, ResourceType.EXERCISE, Action.CREATE);
      const canUpdateProfile = await iamService.canAccess(client, ResourceType.PROFILE, Action.UPDATE);
      
      expect(canRead).toBe(true);
      expect(canCreate).toBe(false);
      expect(canUpdateProfile).toBe(true);
    });

    it('should deny access for inactive users', async () => {
      const inactiveUser = { ...createUser(Role.ADMIN), status: Status.INACTIVE };
      
      const canAccess = await iamService.canAccess(inactiveUser, ResourceType.EXERCISE, Action.READ);
      expect(canAccess).toBe(false);
    });
  });

  describe('Sharing Permissions', () => {
    it('should allow sharing within same organization', async () => {
      const trainer = createUser(Role.TRAINER);
      const client = createUser(Role.CLIENT);
      
      const canShare = await iamService.canShare(trainer, client, ResourceType.WORKOUT);
      expect(canShare).toBe(true);
    });

    it('should deny sharing across organizations', async () => {
      const trainer = createUser(Role.TRAINER);
      const client = { ...createUser(Role.CLIENT), organization: new Types.ObjectId() };
      
      const canShare = await iamService.canShare(trainer, client, ResourceType.WORKOUT);
      expect(canShare).toBe(false);
    });

    it('should deny sharing without share permission', async () => {
      const client1 = createUser(Role.CLIENT);
      const client2 = createUser(Role.CLIENT);
      
      const canShare = await iamService.canShare(client1, client2, ResourceType.EXERCISE);
      expect(canShare).toBe(false);
    });
  });

  describe('User Permissions', () => {
    it('should return correct permissions for role', async () => {
      const trainer = createUser(Role.TRAINER);
      
      const permissions = await iamService.getUserPermissions(trainer);
      
      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions.some(p => 
        p.resource === ResourceType.EXERCISE && 
        p.actions.includes(Action.CREATE)
      )).toBe(true);
    });

    it('should return empty permissions for unknown role', async () => {
      // Mock a user with unknown role
      const unknownUser = { ...createUser(Role.CLIENT), role: 'UNKNOWN' as Role };
      
      const permissions = await iamService.getUserPermissions(unknownUser);
      expect(permissions).toEqual([]);
    });
  });
});