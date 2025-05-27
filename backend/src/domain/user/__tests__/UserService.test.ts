import { describe, it, expect, vi, beforeEach, MockedFunction } from 'vitest';
import { Types } from 'mongoose';
import { UserService } from '../services/UserService.js';
import { IUserRepository, IUserCreationData } from '../interfaces/UserInterfaces.js';
import { User } from '../entities/User.js';
import { Role } from '../../../types/core/enums.js';
import { ValidationError } from '../../../infrastructure/errors/types/ValidationError.js';

describe('UserService', () => {
  let userService: UserService;
  let mockRepository: {
    [K in keyof IUserRepository]: MockedFunction<IUserRepository[K]>
  };

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      findByOrganization: vi.fn(),
      findByRole: vi.fn(),
      findActive: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      archive: vi.fn(),
      restore: vi.fn(),
      isEmailAvailable: vi.fn(),
      updateLastActive: vi.fn(),
      findInactiveUsers: vi.fn()
    };

    userService = new UserService(mockRepository);
  });

  describe('createUser', () => {
    const validUserData: IUserCreationData = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: Role.CLIENT,
      organizationId: new Types.ObjectId()
    };

    it('should create user with valid data', async () => {
      mockRepository.isEmailAvailable.mockResolvedValue(true);
      mockRepository.create.mockResolvedValue(expect.any(User));

      await userService.createUser(validUserData, new Types.ObjectId());

      // Email should be called with normalized email and no excludeId
      expect(mockRepository.isEmailAvailable).toHaveBeenCalledWith('test@example.com', undefined);
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should throw validation error for invalid email', async () => {
      const invalidData = { ...validUserData, email: 'invalid-email' };

      await expect(userService.createUser(invalidData, new Types.ObjectId()))
        .rejects.toThrow(ValidationError);
    });

    it('should throw validation error for duplicate email', async () => {
      mockRepository.isEmailAvailable.mockResolvedValue(false);

      await expect(userService.createUser(validUserData, new Types.ObjectId()))
        .rejects.toThrow(ValidationError);
    });

    it('should throw validation error for empty names', async () => {
      const invalidData = { ...validUserData, firstName: '' };

      await expect(userService.createUser(invalidData, new Types.ObjectId()))
        .rejects.toThrow(ValidationError);
    });

    it('should normalize email to lowercase', async () => {
      const dataWithUppercaseEmail = { ...validUserData, email: 'TEST@EXAMPLE.COM' };
      mockRepository.isEmailAvailable.mockResolvedValue(true);
      mockRepository.create.mockResolvedValue(expect.any(User));

      await userService.createUser(dataWithUppercaseEmail, new Types.ObjectId());

      // Email should be normalized to lowercase before validation
      expect(mockRepository.isEmailAvailable).toHaveBeenCalledWith('test@example.com', undefined);
    });
  });

  describe('updateUser', () => {
    const userId = new Types.ObjectId();

    it('should update user with valid data', async () => {
      const updates = { firstName: 'Jane', lastName: 'Smith' };
      mockRepository.update.mockResolvedValue(expect.any(User));

      const result = await userService.updateUser(userId, updates);

      expect(mockRepository.update).toHaveBeenCalledWith(userId, updates);
      expect(result).toBeDefined();
    });

    it('should validate email when updating', async () => {
      const updates = { email: 'new@example.com' };
      mockRepository.isEmailAvailable.mockResolvedValue(true);
      mockRepository.update.mockResolvedValue(expect.any(User));

      await userService.updateUser(userId, updates);

      expect(mockRepository.isEmailAvailable).toHaveBeenCalledWith('new@example.com', userId);
    });

    it('should throw validation error for invalid name update', async () => {
      const updates = { firstName: '' };

      await expect(userService.updateUser(userId, updates))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('archiveUser', () => {
    it('should archive user if they can be deleted', async () => {
      const mockUser = {
        canBeDeleted: vi.fn().mockReturnValue(true)
      } as any;
      
      mockRepository.findById.mockResolvedValue(mockUser);
      mockRepository.archive.mockResolvedValue(true);

      const result = await userService.archiveUser(new Types.ObjectId());

      expect(result).toBe(true);
      expect(mockRepository.archive).toHaveBeenCalled();
    });

    it('should throw validation error if user cannot be deleted', async () => {
      const mockUser = {
        canBeDeleted: vi.fn().mockReturnValue(false),
        id: new Types.ObjectId()
      } as any;
      
      mockRepository.findById.mockResolvedValue(mockUser);

      await expect(userService.archiveUser(new Types.ObjectId()))
        .rejects.toThrow(ValidationError);
    });
  });
});

