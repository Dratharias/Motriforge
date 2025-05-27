import { Types } from 'mongoose';
import { User } from '../entities/User.js';
import { 
  IUserRepository, 
  IUserCreationData, 
  IUserSearchCriteria, 
  IUserStatistics 
} from '../interfaces/UserInterfaces.js';
import { Role, Status } from '../../../types/core/enums.js';
import { ValidationError } from '../../../infrastructure/errors/types/ValidationError.js';

/**
 * Service for managing user operations
 */
export class UserService {
  constructor(
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Create a new user
   */
  async createUser(data: IUserCreationData, createdBy: Types.ObjectId): Promise<User> {
    // Normalize email first
    const normalizedEmail = data.email.toLowerCase().trim();
    
    // Validate email
    await this.validateEmail(normalizedEmail);

    // Validate required fields
    this.validateUserCreationData(data);

    const now = new Date();
    const userId = new Types.ObjectId();

    const user = new User({
      id: userId,
      email: normalizedEmail,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      role: data.role as Role,
      status: Status.ACTIVE,
      organization: data.organizationId,
      createdAt: now,
      updatedAt: now,
      createdBy,
      isActive: true,
    });

    return await this.userRepository.create(user);
  }

  /**
   * Get user by ID
   */
  async getUserById(id: Types.ObjectId): Promise<User | null> {
    return await this.userRepository.findById(id);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findByEmail(email.toLowerCase().trim());
  }

  /**
   * Update user information
   */
  async updateUser(
    id: Types.ObjectId, 
    updates: {
      firstName?: string;
      lastName?: string;
      email?: string;
      role?: Role;
      status?: Status;
    }
  ): Promise<User | null> {
    // Validate email if being updated
    if (updates.email) {
      const normalizedEmail = updates.email.toLowerCase().trim();
      await this.validateEmail(normalizedEmail, id);
      updates.email = normalizedEmail;
    }

    // Validate name fields
    if (updates.firstName !== undefined) {
      this.validateName(updates.firstName, 'firstName');
    }
    if (updates.lastName !== undefined) {
      this.validateName(updates.lastName, 'lastName');
    }

    return await this.userRepository.update(id, updates);
  }

  /**
   * Activate user
   */
  async activateUser(id: Types.ObjectId): Promise<User | null> {
    return await this.userRepository.update(id, { 
      status: Status.ACTIVE,
      isActive: true 
    });
  }

  /**
   * Deactivate user
   */
  async deactivateUser(id: Types.ObjectId): Promise<User | null> {
    return await this.userRepository.update(id, { 
      status: Status.INACTIVE,
      isActive: false 
    });
  }

  /**
   * Archive user (soft delete)
   */
  async archiveUser(id: Types.ObjectId): Promise<boolean> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      return false;
    }

    if (!user.canBeDeleted()) {
      throw new ValidationError(
        'user',
        user.id,
        'archive_validation',
        'Cannot archive user with active data'
      );
    }

    return await this.userRepository.archive(id);
  }

  /**
   * Restore archived user
   */
  async restoreUser(id: Types.ObjectId): Promise<boolean> {
    return await this.userRepository.restore(id);
  }

  /**
   * Update user's last active timestamp
   */
  async updateLastActive(id: Types.ObjectId): Promise<boolean> {
    return await this.userRepository.updateLastActive(id);
  }

  /**
   * Search users with criteria
   */
  async searchUsers(criteria: IUserSearchCriteria): Promise<readonly User[]> {
    // For now, implement basic search by role and organization
    if (criteria.role) {
      return await this.userRepository.findByRole(criteria.role);
    }
    
    if (criteria.organizationId) {
      return await this.userRepository.findByOrganization(criteria.organizationId);
    }

    if (criteria.isActive !== undefined && criteria.isActive) {
      return await this.userRepository.findActive();
    }

    return [];
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(): Promise<IUserStatistics> {
    const allUsers = await this.userRepository.findActive();
    
    const usersByRole: Record<string, number> = {};
    for (const user of allUsers) {
      usersByRole[user.role] = (usersByRole[user.role] ?? 0) + 1;
    }

    return {
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter(u => u.isUserActive()).length,
      usersByRole,
      recentlyActive: allUsers.filter(u => u.isRecentlyActive()).length,
      completedProfiles: 0, // Would need to query profile repository
      usersWithInjuries: 0 // Would need to query profile repository
    };
  }

  /**
   * Get users by organization
   */
  async getUsersByOrganization(organizationId: Types.ObjectId): Promise<readonly User[]> {
    return await this.userRepository.findByOrganization(organizationId);
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: Role): Promise<readonly User[]> {
    return await this.userRepository.findByRole(role);
  }

  /**
   * Check if user can be assigned workouts
   */
  async canUserBeAssigned(userId: Types.ObjectId): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    return user?.canBeAssigned() ?? false;
  }

  /**
   * Check if user can assign to others
   */
  async canUserAssignToOthers(userId: Types.ObjectId): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    return user?.canAssignToOthers() ?? false;
  }

  /**
   * Validate email availability
   */
  private async validateEmail(email: string, excludeId?: Types.ObjectId): Promise<void> {
    if (!email || email.trim().length === 0) {
      throw new ValidationError(
        'email',
        email,
        'required',
        'Email is required'
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError(
        'email',
        email,
        'format',
        'Invalid email format'
      );
    }

    const isAvailable = await this.userRepository.isEmailAvailable(email, excludeId);
    if (!isAvailable) {
      throw new ValidationError(
        'email',
        email,
        'unique',
        'Email is already taken'
      );
    }
  }

  /**
   * Validate name fields
   */
  private validateName(name: string, field: string): void {
    if (!name || name.trim().length === 0) {
      throw new ValidationError(
        field,
        name,
        'required',
        `${field} is required`
      );
    }

    if (name.length < 2) {
      throw new ValidationError(
        field,
        name,
        'min_length',
        `${field} must be at least 2 characters`
      );
    }

    if (name.length > 50) {
      throw new ValidationError(
        field,
        name,
        'max_length',
        `${field} must be less than 50 characters`
      );
    }
  }

  /**
   * Validate user creation data
   */
  private validateUserCreationData(data: IUserCreationData): void {
    this.validateName(data.firstName, 'firstName');
    this.validateName(data.lastName, 'lastName');

    if (!Object.values(Role).includes(data.role as Role)) {
      throw new ValidationError(
        'role',
        data.role,
        'invalid',
        'Invalid user role'
      );
    }

    if (!data.organizationId) {
      throw new ValidationError(
        'organizationId',
        data.organizationId,
        'required',
        'Organization ID is required'
      );
    }
  }
}