import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { IAMService } from '../IAMService';
import { IPermissionRepository } from '../../permissions/core/interfaces';
import { PermissionSet } from '../../permissions/core/PermissionSet';
import { Role, ResourceType, Action } from '../../../../types/core/enums';
import { IUser } from '../../../../types/core/interfaces';

describe('IAMService', () => {
  let iamService: IAMService;
  let mockPermissionRepository: IPermissionRepository;
  
  const mockUser: IUser = {
    id: new Types.ObjectId(),
    email: 'trainer@example.com',
    role: Role.TRAINER,
    status: 'ACTIVE',
    organization: new Types.ObjectId(),
    createdAt: new Date(),
    lastActiveAt: new Date()
  };

  const mockPermissionSet = new PermissionSet({
    role: Role.TRAINER,
    permissions: [
      {
        resource: ResourceType.EXERCISE,
        actions: [Action.CREATE, Action.READ, Action.UPDATE]
      },
      {
        resource: ResourceType.WORKOUT,
        actions: [Action.READ, Action.SHARE]
      }
    ],
    description: 'Trainer permissions'
  });

  beforeEach(() => {
    mockPermissionRepository = {
      findByRole: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn(),
      findActive: vi.fn(),
      isRolePermissionExists: vi.fn()
    };

    iamService = new IAMService(mockPermissionRepository);
  });

  describe('canAccess', () => {
    it('should grant access for valid user with permission', async () => {
      vi.mocked(mockPermissionRepository.findByRole).mockResolvedValue(mockPermissionSet);

      const result = await iamService.canAccess(
        mockUser,
        ResourceType.EXERCISE,
        Action.CREATE
      );

      expect(result).toBe(true);
      expect(mockPermissionRepository.findByRole).toHaveBeenCalledWith(Role.TRAINER);
    });

    it('should deny access for user without permission', async () => {
      vi.mocked(mockPermissionRepository.findByRole).mockResolvedValue(mockPermissionSet);

      const result = await iamService.canAccess(
        mockUser,
        ResourceType.EXERCISE,
        Action.DELETE
      );

      expect(result).toBe(false);
    });

    it('should deny access for inactive user', async () => {
      const inactiveUser = { ...mockUser, status: 'INACTIVE' };
      vi.mocked(mockPermissionRepository.findByRole).mockResolvedValue(mockPermissionSet);

      const result = await iamService.canAccess(
        inactiveUser,
        ResourceType.EXERCISE,
        Action.READ
      );

      expect(result).toBe(false);
    });

    it('should deny access when no permissions exist for role', async () => {
      vi.mocked(mockPermissionRepository.findByRole).mockResolvedValue(null);

      const result = await iamService.canAccess(
        mockUser,
        ResourceType.EXERCISE,
        Action.READ
      );

      expect(result).toBe(false);
    });

    it('should validate organization context', async () => {
      const differentOrgId = new Types.ObjectId();
      vi.mocked(mockPermissionRepository.findByRole).mockResolvedValue(mockPermissionSet);

      const result = await iamService.canAccess(
        mockUser,
        ResourceType.EXERCISE,
        Action.READ,
        { organizationId: differentOrgId }
      );

      expect(result).toBe(false);
    });
  });

  describe('canShare', () => {
    const targetUser: IUser = {
      ...mockUser,
      id: new Types.ObjectId(),
      email: 'client@example.com',
      role: Role.CLIENT
    };

    it('should allow sharing with user in same organization', async () => {
      vi.mocked(mockPermissionRepository.findByRole).mockResolvedValue(mockPermissionSet);

      const result = await iamService.canShare(
        mockUser,
        targetUser,
        ResourceType.WORKOUT
      );

      expect(result).toBe(true);
    });

    it('should deny sharing without SHARE permission', async () => {
      const permissionSetWithoutShare = new PermissionSet({
        role: Role.TRAINER,
        permissions: [
          {
            resource: ResourceType.WORKOUT,
            actions: [Action.READ] // No SHARE permission
          }
        ],
        description: 'Limited permissions'
      });

      vi.mocked(mockPermissionRepository.findByRole).mockResolvedValue(permissionSetWithoutShare);

      const result = await iamService.canShare(
        mockUser,
        targetUser,
        ResourceType.WORKOUT
      );

      expect(result).toBe(false);
    });

    it('should deny sharing with user in different organization', async () => {
      const differentOrgUser = {
        ...targetUser,
        organization: new Types.ObjectId()
      };

      vi.mocked(mockPermissionRepository.findByRole).mockResolvedValue(mockPermissionSet);

      const result = await iamService.canShare(
        mockUser,
        differentOrgUser,
        ResourceType.WORKOUT
      );

      expect(result).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('should return true for matching permission', async () => {
      vi.mocked(mockPermissionRepository.findByRole).mockResolvedValue(mockPermissionSet);

      const result = await iamService.hasPermission(mockUser, {
        resource: ResourceType.EXERCISE,
        actions: [Action.READ, Action.UPDATE]
      });

      expect(result).toBe(true);
    });

    it('should return false for non-matching permission', async () => {
      vi.mocked(mockPermissionRepository.findByRole).mockResolvedValue(mockPermissionSet);

      const result = await iamService.hasPermission(mockUser, {
        resource: ResourceType.EXERCISE,
        actions: [Action.DELETE]
      });

      expect(result).toBe(false);
    });
  });

  describe('getUserPermissions', () => {
    it('should return user permissions', async () => {
      vi.mocked(mockPermissionRepository.findByRole).mockResolvedValue(mockPermissionSet);

      const permissions = await iamService.getUserPermissions(mockUser);

      expect(permissions).toEqual(mockPermissionSet.getPermissions());
      expect(permissions.length).toBe(2);
    });

    it('should return empty array when no permissions exist', async () => {
      vi.mocked(mockPermissionRepository.findByRole).mockResolvedValue(null);

      const permissions = await iamService.getUserPermissions(mockUser);

      expect(permissions).toEqual([]);
    });
  });

  describe('createPermissionSet', () => {
    it('should create new permission set', async () => {
      vi.mocked(mockPermissionRepository.findByRole).mockResolvedValue(null);
      vi.mocked(mockPermissionRepository.create).mockResolvedValue(mockPermissionSet);

      const createdBy = new Types.ObjectId();
      const permissions = [
        {
          resource: ResourceType.EXERCISE,
          actions: [Action.READ]
        }
      ];

      const result = await iamService.createPermissionSet(
        Role.CLIENT,
        permissions,
        'Client permissions',
        createdBy
      );

      expect(result).toBe(mockPermissionSet);
      expect(mockPermissionRepository.create).toHaveBeenCalled();
    });

    it('should throw error if permission set already exists', async () => {
      vi.mocked(mockPermissionRepository.findByRole).mockResolvedValue(mockPermissionSet);

      await expect(
        iamService.createPermissionSet(
          Role.TRAINER,
          [],
          'Description',
          new Types.ObjectId()
        )
      ).rejects.toThrow('Permissions for role TRAINER already exist');
    });
  });

  describe('updateRolePermissions', () => {
    it('should update existing role permissions', async () => {
      const updatedPermissionSet = mockPermissionSet.update({
        permissions: [
          {
            resource: ResourceType.PROGRAM,
            actions: [Action.READ]
          }
        ]
      });

      vi.mocked(mockPermissionRepository.findByRole).mockResolvedValue(mockPermissionSet);
      vi.mocked(mockPermissionRepository.update).mockResolvedValue(updatedPermissionSet);

      const newPermissions = [
        {
          resource: ResourceType.PROGRAM,
          actions: [Action.READ]
        }
      ];

      const result = await iamService.updateRolePermissions(Role.TRAINER, newPermissions);

      expect(result).toBe(updatedPermissionSet);
      expect(mockPermissionRepository.update).toHaveBeenCalledWith(
        mockPermissionSet.id,
        { permissions: newPermissions }
      );
    });

    it('should throw error if permission set does not exist', async () => {
      vi.mocked(mockPermissionRepository.findByRole).mockResolvedValue(null);

      await expect(
        iamService.updateRolePermissions(Role.TRAINER, [])
      ).rejects.toThrow('Permissions for role TRAINER not found');
    });
  });
});