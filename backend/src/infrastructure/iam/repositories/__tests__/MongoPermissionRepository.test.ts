// src/infrastructure/iam/repositories/__tests__/MongoPermissionRepository.local.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { Collection, MongoClient, Db } from 'mongodb';
import { Role, ResourceType, Action } from '../../../../types/core/enums';
import { MongoPermissionRepository, PermissionSetDocument } from '../MongoPermissionRepository';
import { PermissionSet } from '../../core/PermissionSet';

// Mock MongoDB types
type MockCollection = {
  findOne: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  insertOne: ReturnType<typeof vi.fn>;
  findOneAndUpdate: ReturnType<typeof vi.fn>;
  deleteOne: ReturnType<typeof vi.fn>;
  countDocuments: ReturnType<typeof vi.fn>;
  createIndex: ReturnType<typeof vi.fn>;
};

type MockDb = {
  collection: ReturnType<typeof vi.fn>;
};

type MockClient = {
  db: ReturnType<typeof vi.fn>;
};

describe('MongoPermissionRepository Local Tests', () => {
  let repository: MongoPermissionRepository;
  let mockCollection: MockCollection;
  let mockDb: MockDb;
  let mockClient: MockClient;

  const createMockDocument = (role: Role, isActive = true): PermissionSetDocument => ({
    _id: new Types.ObjectId(),
    role,
    permissions: [
      {
        resource: ResourceType.EXERCISE,
        actions: [Action.CREATE, Action.READ],
        conditions: undefined
      }
    ],
    description: `Test ${role} permissions`,
    isActive,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1
  });

  beforeEach(() => {
    // Create mocks
    mockCollection = {
      findOne: vi.fn(),
      find: vi.fn(),
      insertOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      deleteOne: vi.fn(),
      countDocuments: vi.fn(),
      createIndex: vi.fn()
    };

    mockDb = {
      collection: vi.fn().mockReturnValue(mockCollection)
    };

    mockClient = {
      db: vi.fn().mockReturnValue(mockDb)
    } as MockClient;

    // Setup find().toArray() mock
    const mockFindResult = {
      toArray: vi.fn()
    };
    mockCollection.find.mockReturnValue(mockFindResult);

    repository = new MongoPermissionRepository();
    
    // Initialize with mocked client
    repository['db'] = mockDb as unknown as Db;
    repository['collection'] = mockCollection as unknown as Collection<PermissionSetDocument>;
  });

  describe('Role Permission Management', () => {
    it('should create and map permission set correctly', async () => {
      const mockDoc = createMockDocument(Role.TRAINER);
      mockCollection.insertOne.mockResolvedValue({ acknowledged: true });

      const permissionSet = new PermissionSet({
        role: Role.TRAINER,
        permissions: [
          { resource: ResourceType.EXERCISE, actions: [Action.CREATE, Action.READ] }
        ],
        description: 'Test trainer permissions',
        isActive: true
      });

      // Mock findByRole to return null (no existing permissions)
      mockCollection.findOne.mockResolvedValue(null);

      const result = await repository.create(permissionSet);

      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          role: Role.TRAINER,
          permissions: expect.arrayContaining([
            expect.objectContaining({
              resource: ResourceType.EXERCISE,
              actions: [Action.CREATE, Action.READ]
            })
          ]),
          description: 'Test trainer permissions',
          isActive: true
        })
      );

      expect(result.role).toBe(Role.TRAINER);
      expect(result.isActive).toBe(true);
    });

    it('should find permission set by role with correct filtering', async () => {
      const mockDoc = createMockDocument(Role.CLIENT);
      mockCollection.findOne.mockResolvedValue(mockDoc);

      const result = await repository.findByRole(Role.CLIENT);

      expect(mockCollection.findOne).toHaveBeenCalledWith({
        role: Role.CLIENT,
        isActive: true
      }, undefined);

      expect(result).not.toBeNull();
      expect(result!.role).toBe(Role.CLIENT);
      expect(result!.allows(ResourceType.EXERCISE, Action.CREATE)).toBe(true);
    });

    it('should prevent duplicate role permissions', async () => {
      const existingDoc = createMockDocument(Role.CLIENT);
      mockCollection.findOne.mockResolvedValue(existingDoc);

      const permissionSet = new PermissionSet({
        role: Role.CLIENT,
        permissions: [{ resource: ResourceType.PROFILE, actions: [Action.UPDATE] }],
        description: 'Duplicate client permissions',
        isActive: true
      });

      await expect(repository.create(permissionSet))
        .rejects.toThrow('Permissions for role CLIENT already exist');

      expect(mockCollection.insertOne).not.toHaveBeenCalled();
    });

    it('should update permission set with version increment', async () => {
      const originalDoc = createMockDocument(Role.MANAGER);
      const updatedDoc = {
        ...originalDoc,
        description: 'Updated manager permissions',
        permissions: [
          {
            resource: ResourceType.PROGRAM,
            actions: [Action.READ, Action.UPDATE],
            conditions: undefined
          }
        ],
        version: 2,
        updatedAt: new Date()
      };

      mockCollection.findOneAndUpdate.mockResolvedValue(updatedDoc);

      const result = await repository.update(originalDoc._id, {
        permissions: [
          { resource: ResourceType.PROGRAM, actions: [Action.READ, Action.UPDATE] }
        ],
        description: 'Updated manager permissions'
      });

      expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: originalDoc._id },
        {
          $set: expect.objectContaining({
            description: 'Updated manager permissions',
            permissions: expect.arrayContaining([
              expect.objectContaining({
                resource: ResourceType.PROGRAM,
                actions: [Action.READ, Action.UPDATE]
              })
            ]),
            updatedAt: expect.any(Date)
          }),
          $inc: { version: 1 }
        },
        { returnDocument: 'after' }
      );

      expect(result).not.toBeNull();
      expect(result!.description).toBe('Updated manager permissions');
    });

    it('should find only active permission sets', async () => {
      const activeDoc = createMockDocument(Role.ADMIN, true);
      const mockFindResult = { toArray: vi.fn().mockResolvedValue([activeDoc]) };
      mockCollection.find.mockReturnValue(mockFindResult);

      const result = await repository.findActive();

      expect(mockCollection.find).toHaveBeenCalledWith({ isActive: true }, undefined);
      expect(result.length).toBe(1);
      expect(result[0].role).toBe(Role.ADMIN);
      expect(result[0].isActive).toBe(true);
    });

    it('should check role permission existence correctly', async () => {
      mockCollection.countDocuments.mockResolvedValue(1);

      const exists = await repository.isRolePermissionExists(Role.TRAINER);

      expect(mockCollection.countDocuments).toHaveBeenCalledWith({ role: Role.TRAINER });
      expect(exists).toBe(true);
    });

    it('should deactivate role permissions with version increment', async () => {
      const deactivatedDoc = createMockDocument(Role.CLIENT, false);
      mockCollection.findOneAndUpdate.mockResolvedValue(deactivatedDoc);

      const result = await repository.deactivateRole(Role.CLIENT);

      expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
        { role: Role.CLIENT },
        {
          $set: {
            isActive: false,
            updatedAt: expect.any(Date)
          },
          $inc: { version: 1 }
        },
        { returnDocument: 'after' }
      );

      expect(result).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle findByRole when document not found', async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const result = await repository.findByRole(Role.GUEST);

      expect(mockCollection.findOne).toHaveBeenCalledWith({
        role: Role.GUEST,
        isActive: true
      }, undefined);

      expect(mockCollection.findOne).toHaveBeenCalledWith({
        role: Role.GUEST,
        isActive: true
      }, undefined);
      expect(result).toBeNull();
    });

    it('should handle database errors gracefully in findByRole', async () => {
      const dbError = new Error('Database connection failed');
      mockCollection.findOne.mockRejectedValue(dbError);

      const result = await repository.findByRole(Role.ADMIN);

      expect(mockCollection.findOne).toHaveBeenCalledWith({
        role: Role.ADMIN,
        isActive: true
      }, undefined);
      expect(result).toBeNull();
    });

    it('should handle invalid ObjectId in update', async () => {
      const invalidId = new Types.ObjectId();
      mockCollection.findOneAndUpdate.mockResolvedValue(null);

      const result = await repository.update(invalidId, { description: 'test' });

      expect(result).toBeNull();
    });

    it('should handle delete operation for non-existent document', async () => {
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 0 });

      const result = await repository.delete(new Types.ObjectId());

      expect(result).toBe(false);
    });

    it('should handle countDocuments error in isRolePermissionExists', async () => {
      mockCollection.countDocuments.mockRejectedValue(new Error('Count failed'));

      const result = await repository.isRolePermissionExists(Role.ADMIN);

      expect(result).toBe(false);
    });
  });

  describe('Document Mapping', () => {
    it('should correctly map document to PermissionSet domain object', async () => {
      const mockDoc: PermissionSetDocument = {
        _id: new Types.ObjectId(),
        role: Role.TRAINER,
        permissions: [
          {
            resource: ResourceType.EXERCISE,
            actions: [Action.CREATE, Action.READ, Action.UPDATE],
            conditions: { organizationOnly: true }
          },
          {
            resource: ResourceType.WORKOUT,
            actions: [Action.CREATE, Action.READ],
            conditions: undefined
          }
        ],
        description: 'Trainer permissions with conditions',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        createdBy: new Types.ObjectId()
      };

      mockCollection.findOne.mockResolvedValue(mockDoc);

      const result = await repository.findByRole(Role.TRAINER);

      expect(mockCollection.findOne).toHaveBeenCalledWith({
        role: Role.TRAINER,
        isActive: true
      }, undefined);

      expect(result).not.toBeNull();
      expect(result!.role).toBe(Role.TRAINER);
      expect(result!.description).toBe('Trainer permissions with conditions');
      expect(result!.allows(ResourceType.EXERCISE, Action.CREATE)).toBe(true);
      expect(result!.allows(ResourceType.EXERCISE, Action.DELETE)).toBe(false);
      expect(result!.allows(ResourceType.WORKOUT, Action.READ)).toBe(true);

      const permissions = result!.getPermissions();
      expect(permissions).toHaveLength(2);
      expect(permissions[0].conditions).toEqual({ organizationOnly: true });
      expect(permissions[1].conditions).toBeUndefined();
    });

    it('should handle empty permissions array in mapping', async () => {
      const mockDoc: PermissionSetDocument = {
        _id: new Types.ObjectId(),
        role: Role.GUEST,
        permissions: [],
        description: 'Guest with no permissions',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };

      mockCollection.findOne.mockResolvedValue(mockDoc);

      const result = await repository.findByRole(Role.GUEST);

      expect(result).not.toBeNull();
      expect(result!.getPermissions()).toHaveLength(0);
      expect(result!.allows(ResourceType.EXERCISE, Action.READ)).toBe(false);
    });
  });

  describe('Query Construction', () => {
    it('should construct correct query filters for different operations', async () => {
      // Test findById query
      const testId = new Types.ObjectId();
      mockCollection.findOne.mockResolvedValue(null);
      
      await repository.findById(testId);
      expect(mockCollection.findOne).toHaveBeenCalledWith({ _id: testId }, undefined);

      // Test findAll query
      const mockFindResult = { toArray: vi.fn().mockResolvedValue([]) };
      mockCollection.find.mockReturnValue(mockFindResult);
      
      await repository.findAll();
      expect(mockCollection.find).toHaveBeenCalledWith({}, undefined);
    });

    it('should handle complex permission document structure in create', async () => {
      mockCollection.findOne.mockResolvedValue(null); // No existing permissions
      mockCollection.insertOne.mockResolvedValue({ acknowledged: true });

      const complexPermissionSet = new PermissionSet({
        role: Role.ADMIN,
        permissions: [
          {
            resource: ResourceType.EXERCISE,
            actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.SHARE],
            conditions: { scope: 'organization' }
          },
          {
            resource: ResourceType.WORKOUT,
            actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
            conditions: undefined
          }
        ],
        description: 'Full admin permissions',
        isActive: true
      });

      await repository.create(complexPermissionSet);

      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          role: Role.ADMIN,
          permissions: [
            {
              resource: ResourceType.EXERCISE,
              actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.SHARE],
              conditions: { scope: 'organization' }
            },
            {
              resource: ResourceType.WORKOUT,
              actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
              conditions: undefined
            }
          ],
          description: 'Full admin permissions',
          isActive: true,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          version: 1
        })
      );
    });
  });
});