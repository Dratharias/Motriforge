import { describe, it, expect } from 'vitest';
import { Types } from 'mongoose';
import { PermissionSet } from '../PermissionSet';
import { Role, ResourceType, Action } from '../../../../../types/core/enums';
import { IResourcePermission } from '../../../../../types/core/interfaces';

describe('PermissionSet', () => {
  const mockPermissions: IResourcePermission[] = [
    {
      resource: ResourceType.EXERCISE,
      actions: [Action.CREATE, Action.READ, Action.UPDATE]
    },
    {
      resource: ResourceType.WORKOUT,
      actions: [Action.READ]
    }
  ];

  const createPermissionSet = (overrides = {}) => {
    return new PermissionSet({
      role: Role.TRAINER,
      permissions: mockPermissions,
      description: 'Trainer permissions',
      ...overrides
    });
  };

  describe('constructor', () => {
    it('should create a permission set with required fields', () => {
      const permissionSet = createPermissionSet();

      expect(permissionSet.role).toBe(Role.TRAINER);
      expect(permissionSet.permissions).toEqual(mockPermissions);
      expect(permissionSet.description).toBe('Trainer permissions');
      expect(permissionSet.isActive).toBe(true);
      expect(permissionSet.id).toBeInstanceOf(Types.ObjectId);
      expect(permissionSet.createdAt).toBeInstanceOf(Date);
    });

    it('should throw error if role is missing', () => {
      expect(() => {
        new PermissionSet({
          role: '' as any,
          permissions: mockPermissions,
          description: 'Test'
        });
      }).toThrow('Role is required for PermissionSet');
    });

    it('should throw error if description is missing', () => {
      expect(() => {
        new PermissionSet({
          role: Role.TRAINER,
          permissions: mockPermissions,
          description: ''
        });
      }).toThrow('Description is required for PermissionSet');
    });

    it('should throw error for duplicate resource permissions', () => {
      const duplicatePermissions = [
        ...mockPermissions,
        {
          resource: ResourceType.EXERCISE,
          actions: [Action.DELETE]
        }
      ];

      expect(() => {
        new PermissionSet({
          role: Role.TRAINER,
          permissions: duplicatePermissions,
          description: 'Test'
        });
      }).toThrow('Duplicate permission found for resource: EXERCISE');
    });
  });

  describe('allows', () => {
    const permissionSet = createPermissionSet();

    it('should return true for allowed resource and action', () => {
      expect(permissionSet.allows(ResourceType.EXERCISE, Action.CREATE)).toBe(true);
      expect(permissionSet.allows(ResourceType.EXERCISE, Action.READ)).toBe(true);
      expect(permissionSet.allows(ResourceType.WORKOUT, Action.READ)).toBe(true);
    });

    it('should return false for disallowed resource and action', () => {
      expect(permissionSet.allows(ResourceType.EXERCISE, Action.DELETE)).toBe(false);
      expect(permissionSet.allows(ResourceType.WORKOUT, Action.CREATE)).toBe(false);
      expect(permissionSet.allows(ResourceType.PROGRAM, Action.READ)).toBe(false);
    });
  });

  describe('getPermission', () => {
    const permissionSet = createPermissionSet();

    it('should return permission for existing resource', () => {
      const permission = permissionSet.getPermission(ResourceType.EXERCISE);
      
      expect(permission).not.toBeNull();
      expect(permission?.resource).toBe(ResourceType.EXERCISE);
      expect(permission?.actions).toEqual([Action.CREATE, Action.READ, Action.UPDATE]);
    });

    it('should return null for non-existing resource', () => {
      const permission = permissionSet.getPermission(ResourceType.PROGRAM);
      expect(permission).toBeNull();
    });
  });

  describe('hasPermission', () => {
    const permissionSet = createPermissionSet();

    it('should return true for existing permission', () => {
      expect(permissionSet.hasPermission(ResourceType.EXERCISE, Action.CREATE)).toBe(true);
    });

    it('should return false for non-existing permission', () => {
      expect(permissionSet.hasPermission(ResourceType.PROGRAM, Action.READ)).toBe(false);
    });
  });

  describe('update', () => {
    it('should create updated permission set', async () => {
      const original = createPermissionSet();
      
      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const updated = original.update({
        description: 'Updated description'
      });

      expect(updated.description).toBe('Updated description');
      expect(updated.role).toBe(original.role);
      expect(updated.permissions).toBe(original.permissions);
      expect(updated.version).toBe(original.version + 1);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(original.updatedAt.getTime());
      
      // Should be a new instance
      expect(updated).not.toBe(original);
    });

    it('should update permissions', () => {
      const original = createPermissionSet();
      const newPermissions: IResourcePermission[] = [
        {
          resource: ResourceType.PROGRAM,
          actions: [Action.READ]
        }
      ];

      const updated = original.update({
        permissions: newPermissions
      });

      expect(updated.permissions).toEqual(newPermissions);
      expect(updated.allows(ResourceType.PROGRAM, Action.READ)).toBe(true);
      expect(updated.allows(ResourceType.EXERCISE, Action.READ)).toBe(false);
    });
  });

  describe('getPermissions', () => {
    it('should return all permissions', () => {
      const permissionSet = createPermissionSet();
      const permissions = permissionSet.getPermissions();

      expect(permissions).toEqual(mockPermissions);
      expect(permissions.length).toBe(2);
    });
  });
});