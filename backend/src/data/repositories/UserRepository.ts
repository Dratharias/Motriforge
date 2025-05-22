import { CacheFacade } from "@/core/cache/facade/CacheFacade";
import { EventMediator } from "@/core/events/EventMediator";
import { LoggerFacade } from "@/core/logging";
import { ValidationResult } from "@/types/events";
import { IUser } from "@/types/models";
import { IUserRepository, RepositoryContext } from "@/types/repositories";
import { Model, Types } from "mongoose";
import { BaseRepository } from "./BaseRepository";
import { ValidationHelpers } from "./helpers";

/**
 * Repository for user operations with enhanced validation and caching
 */
export class UserRepository extends BaseRepository<IUser> implements IUserRepository {
  private static readonly CACHE_TTL = 600; // 10 minutes
  private static readonly USER_CACHE_TTL = 900; // 15 minutes for user data

  constructor(
    userModel: Model<IUser>,
    logger: LoggerFacade,
    eventMediator: EventMediator,
    cache?: CacheFacade
  ) {
    super(userModel, logger, eventMediator, cache, 'UserRepository');
  }

  /**
   * Find user by email address
   */
  public async findByEmail(email: string): Promise<IUser | null> {
    const cacheKey = this.cacheHelpers.generateCustomKey('email', { email });
    
    // Check cache first
    const cached = await this.cacheHelpers.getCustom<IUser>(cacheKey);
    if (cached) {
      return this.mapToEntity(cached);
    }

    try {
      this.logger.debug('Finding user by email', { email });
      
      const user = await this.crudOps.findOne(
        { email: { $regex: new RegExp(`^${email}$`, 'i') } }
      );

      if (user && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, user, UserRepository.USER_CACHE_TTL);
        // Also cache by ID
        await this.cacheHelpers.cacheById(this.extractId(user)!, user, UserRepository.USER_CACHE_TTL);
      }

      return user ? this.mapToEntity(user) : null;
    } catch (error) {
      this.logger.error('Error finding user by email', error as Error, { email });
      throw error;
    }
  }

  /**
   * Find user by username
   */
  public async findByUsername(username: string): Promise<IUser | null> {
    const cacheKey = this.cacheHelpers.generateCustomKey('username', { username });
    
    const cached = await this.cacheHelpers.getCustom<IUser>(cacheKey);
    if (cached) {
      return this.mapToEntity(cached);
    }

    try {
      this.logger.debug('Finding user by username', { username });
      
      // Assuming username is stored in a username field or as part of user profile
      const user = await this.crudOps.findOne({
        $or: [
          { username: { $regex: new RegExp(`^${username}$`, 'i') } },
          { 'profile.username': { $regex: new RegExp(`^${username}$`, 'i') } }
        ]
      });

      if (user && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, user, UserRepository.CACHE_TTL);
      }

      return user ? this.mapToEntity(user) : null;
    } catch (error) {
      this.logger.error('Error finding user by username', error as Error, { username });
      throw error;
    }
  }

  /**
   * Find user by external provider ID
   */
  public async findByExternalId(provider: string, externalId: string): Promise<IUser | null> {
    const cacheKey = this.cacheHelpers.generateCustomKey('external', { provider, externalId });
    
    const cached = await this.cacheHelpers.getCustom<IUser>(cacheKey);
    if (cached) {
      return this.mapToEntity(cached);
    }

    try {
      this.logger.debug('Finding user by external ID', { provider, externalId });
      
      const user = await this.crudOps.findOne({
        [`externalProviders.${provider}.id`]: externalId
      });

      if (user && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, user, UserRepository.CACHE_TTL);
      }

      return user ? this.mapToEntity(user) : null;
    } catch (error) {
      this.logger.error('Error finding user by external ID', error as Error, { 
        provider, 
        externalId 
      });
      throw error;
    }
  }

  /**
   * Find user by verification token
   */
  public async findByVerificationToken(token: string): Promise<IUser | null> {
    try {
      this.logger.debug('Finding user by verification token');
      
      const user = await this.crudOps.findOne({
        'verification.token': token,
        'verification.expiresAt': { $gt: new Date() }
      });

      return user ? this.mapToEntity(user) : null;
    } catch (error) {
      this.logger.error('Error finding user by verification token', error as Error);
      throw error;
    }
  }

  /**
   * Find user by password reset token
   */
  public async findByPasswordResetToken(token: string): Promise<IUser | null> {
    try {
      this.logger.debug('Finding user by password reset token');
      
      const user = await this.crudOps.findOne({
        'passwordReset.token': token,
        'passwordReset.expiresAt': { $gt: new Date() }
      });

      return user ? this.mapToEntity(user) : null;
    } catch (error) {
      this.logger.error('Error finding user by password reset token', error as Error);
      throw error;
    }
  }

  /**
   * Update user password
   */
  public async updatePassword(
    id: string | Types.ObjectId, 
    passwordHash: string
  ): Promise<IUser | null> {
    try {
      this.logger.debug('Updating user password', { id: id.toString() });
      
      const user = await this.crudOps.update(id, {
        passwordHash,
        'passwordReset.token': null,
        'passwordReset.expiresAt': null,
        updatedAt: new Date()
      });

      if (user && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateAfterUpdate(id, user);
        // Invalidate email cache
        await this.cacheHelpers.invalidateByPattern('email:*');
      }

      if (user) {
        await this.publishEvent('user.password.updated', {
          userId: id.toString(),
          timestamp: new Date()
        });
      }

      return user ? this.mapToEntity(user) : null;
    } catch (error) {
      this.logger.error('Error updating user password', error as Error, { 
        id: id.toString() 
      });
      throw error;
    }
  }

  /**
   * Update MFA settings
   */
  public async updateMFASettings(
    id: string | Types.ObjectId, 
    mfaSettings: any
  ): Promise<IUser | null> {
    try {
      this.logger.debug('Updating user MFA settings', { id: id.toString() });
      
      const user = await this.crudOps.update(id, {
        mfaSettings,
        updatedAt: new Date()
      });

      if (user && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateAfterUpdate(id, user);
      }

      if (user) {
        await this.publishEvent('user.mfa.updated', {
          userId: id.toString(),
          enabled: mfaSettings?.enabled ?? false,
          timestamp: new Date()
        });
      }

      return user ? this.mapToEntity(user) : null;
    } catch (error) {
      this.logger.error('Error updating user MFA settings', error as Error, { 
        id: id.toString() 
      });
      throw error;
    }
  }

  /**
   * Find users in organization
   */
  public async findUsersInOrganization(
    organizationId: string | Types.ObjectId
  ): Promise<IUser[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('organization', { 
      organizationId: organizationId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<IUser[]>(cacheKey);
    if (cached) {
      return cached.map(user => this.mapToEntity(user));
    }

    try {
      this.logger.debug('Finding users in organization', { 
        organizationId: organizationId.toString() 
      });
      
      const users = await this.crudOps.find({
        'organizations.organization': organizationId,
        'organizations.active': true
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, users, UserRepository.CACHE_TTL);
      }

      return users.map(user => this.mapToEntity(user));
    } catch (error) {
      this.logger.error('Error finding users in organization', error as Error, { 
        organizationId: organizationId.toString() 
      });
      throw error;
    }
  }

  /**
   * Find users by role
   */
  public async findByRole(roleId: string | Types.ObjectId): Promise<IUser[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('role', { 
      roleId: roleId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<IUser[]>(cacheKey);
    if (cached) {
      return cached.map(user => this.mapToEntity(user));
    }

    try {
      this.logger.debug('Finding users by role', { roleId: roleId.toString() });
      
      const users = await this.crudOps.find({
        role: roleId
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, users, UserRepository.CACHE_TTL);
      }

      return users.map(user => this.mapToEntity(user));
    } catch (error) {
      this.logger.error('Error finding users by role', error as Error, { 
        roleId: roleId.toString() 
      });
      throw error;
    }
  }

  /**
   * Activate user account
   */
  public async activateUser(id: string | Types.ObjectId): Promise<IUser | null> {
    try {
      this.logger.debug('Activating user account', { id: id.toString() });
      
      const user = await this.crudOps.update(id, {
        active: true,
        'verification.verified': true,
        'verification.verifiedAt': new Date(),
        updatedAt: new Date()
      });

      if (user && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateAfterUpdate(id, user);
      }

      if (user) {
        await this.publishEvent('user.activated', {
          userId: id.toString(),
          timestamp: new Date()
        });
      }

      return user ? this.mapToEntity(user) : null;
    } catch (error) {
      this.logger.error('Error activating user account', error as Error, { 
        id: id.toString() 
      });
      throw error;
    }
  }

  /**
   * Deactivate user account
   */
  public async deactivateUser(id: string | Types.ObjectId): Promise<IUser | null> {
    try {
      this.logger.debug('Deactivating user account', { id: id.toString() });
      
      const user = await this.crudOps.update(id, {
        active: false,
        updatedAt: new Date()
      });

      if (user && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateAfterUpdate(id, user);
      }

      if (user) {
        await this.publishEvent('user.deactivated', {
          userId: id.toString(),
          timestamp: new Date()
        });
      }

      return user ? this.mapToEntity(user) : null;
    } catch (error) {
      this.logger.error('Error deactivating user account', error as Error, { 
        id: id.toString() 
      });
      throw error;
    }
  }

  /**
   * Override create to handle user-specific logic
   */
  public async create(data: Partial<IUser>, context?: RepositoryContext): Promise<IUser> {
    // Validate unique email before creation
    if (data.email) {
      const existingUser = await this.findByEmail(data.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }
    }

    const user = await super.create(data, context);

    // Publish user creation event
    await this.publishEvent('user.created', {
      userId: user._id.toString(),
      email: user.email,
      organizationId: context?.organizationId,
      timestamp: new Date()
    });

    return user;
  }

  /**
   * Validate user data
   */
  protected validateData(data: Partial<IUser>): ValidationResult {
    const errors: string[] = [];

    // Email validation
    if (data.email) {
      if (!ValidationHelpers.validateEmail(data.email)) {
        errors.push('Invalid email format');
      }
    }

    // Password validation (if provided)
    if (data.passwordHash && data.passwordHash.length < 8) {
      errors.push('Password hash seems too short');
    }

    // Name validation
    if (data.firstName !== undefined) {
      const nameValidation = ValidationHelpers.validateFieldLength(
        data.firstName, 
        'firstName', 
        1, 
        50
      );
      if (!nameValidation.valid) {
        errors.push(...nameValidation.errors);
      }
    }

    if (data.lastName !== undefined) {
      const nameValidation = ValidationHelpers.validateFieldLength(
        data.lastName, 
        'lastName', 
        1, 
        50
      );
      if (!nameValidation.valid) {
        errors.push(...nameValidation.errors);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Map database document to domain entity
   */
  protected mapToEntity(data: any): IUser {
    return {
      _id: data._id,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      passwordHash: data.passwordHash,
      role: data.role,
      organizations: data.organizations ?? [],
      primaryOrganization: data.primaryOrganization,
      active: data.active ?? true,
      storageQuota: data.storageQuota ?? 1024 * 1024 * 100, // 100MB default
      storageUsed: data.storageUsed ?? 0,
      notificationSettings: data.notificationSettings ?? {},
      privacySettings: data.privacySettings ?? {},
      preferences: data.preferences ?? {},
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    } as IUser;
  }

  /**
   * Map domain entity to database document
   */
  protected mapFromEntity(entity: IUser): any {
    const doc = { ...entity };
    
    // Remove any computed or sensitive fields that shouldn't be stored
    delete (doc as any).__v;
    
    return doc;
  }
}