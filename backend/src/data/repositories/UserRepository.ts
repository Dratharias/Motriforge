import { BaseRepository } from './BaseRepository';
import { Database } from '../database/Database';
import { LoggerFacade } from '../../core/logging/LoggerFacade';
import { EventMediator } from '../../core/events/EventMediator';
import { ValidationError } from '../../core/error/exceptions/ValidationError';
import { EntityNotFoundError } from '../../core/error/exceptions/DatabaseError';
import { Filter, ObjectId, OptionalUnlessRequiredId } from 'mongodb';

/**
 * User model interface
 */
export interface User {
  _id?: ObjectId;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: string;
  organizations: Array<{
    organizationId: ObjectId;
    role: string;
    joinedAt: Date;
    active: boolean;
  }>;
  primaryOrganization?: ObjectId;
  active: boolean;
  storageQuota: number;
  storageUsed: number;
  notificationSettings: {
    email: boolean;
    push: boolean;
    sms: boolean;
    frequency: string;
  };
  privacySettings: {
    profileVisibility: string;
    shareActivity: boolean;
    shareProgression: boolean;
  };
  preferences: {
    theme: string;
    language: string;
    unitSystem: string;
    dateFormat: string;
    timeFormat: string;
  };
  mfaEnabled: boolean;
  mfaSettings?: {
    method: string;
    secret?: string;
    backup?: string[];
    lastVerified?: Date;
  };
  verificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLogin?: Date;
  loginAttempts: number;
  lockUntil?: Date | null;
  externalAuth?: Array<{
    provider: string;
    providerId: string;
    displayName?: string;
    lastLogin: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}


/**
 * Data required to create a new user
 */
export interface UserCreationData {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role?: string;
  active?: boolean;
  notificationSettings?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
    frequency?: string;
  };
  privacySettings?: {
    profileVisibility?: string;
    shareActivity?: boolean;
    shareProgression?: boolean;
  };
  preferences?: {
    theme?: string;
    language?: string;
    unitSystem?: string;
    dateFormat?: string;
    timeFormat?: string;
  };
  externalAuth?: Array<{
    provider: string;
    providerId: string;
    displayName?: string;
  }>;
}

/**
 * Multi-factor authentication settings
 */
export interface MFASettings {
  method: string;
  secret?: string;
  backup?: string[];
  lastVerified?: Date;
}

/**
 * Repository for user data access
 */
export class UserRepository extends BaseRepository<User> {
  /**
   * Create a new UserRepository instance
   * 
   * @param db - Database instance
   * @param logger - Logger instance
   * @param eventMediator - Event mediator instance
   */
  constructor(
    db: Database,
    logger: LoggerFacade,
    eventMediator?: EventMediator
  ) {
    super('users', db, logger, eventMediator);
  }

  /**
   * Find a user by email address
   * 
   * @param email - User email address
   * @returns User if found, null otherwise
   */
  public async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ email: email.toLowerCase() });
  }

  /**
   * Find a user by username (email or custom username)
   * 
   * @param username - Username to search for
   * @returns User if found, null otherwise
   */
  public async findByUsername(username: string): Promise<User | null> {
    // Since we're using email as username, this is equivalent to findByEmail
    return this.findByEmail(username);
  }

  /**
   * Find a user by external authentication provider ID
   * 
   * @param provider - Auth provider name
   * @param externalId - Provider's user ID
   * @returns User if found, null otherwise
   */
  public async findByExternalId(provider: string, externalId: string): Promise<User | null> {
    return this.findOne({
      'externalAuth.provider': provider,
      'externalAuth.providerId': externalId
    });
  }

  /**
   * Find a user by verification token
   * 
   * @param token - Verification token
   * @returns User if found, null otherwise
   */
  public async findByVerificationToken(token: string): Promise<User | null> {
    return this.findOne({ verificationToken: token });
  }

  /**
   * Find a user by password reset token
   * 
   * @param token - Password reset token
   * @returns User if found, null otherwise
   */
  public async findByPasswordResetToken(token: string): Promise<User | null> {
    return this.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    });
  }

  /**
   * Create a new user
   * 
   * @param userData - User creation data
   * @returns Created user
   */
  public async create(userData: UserCreationData): Promise<User> {
    // Ensure email is lowercase for consistency
    const email = userData.email.toLowerCase();
    
    // Check if email already exists
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new ValidationError(
        'Email address is already in use',
        [{ field: 'email', message: 'Email address is already in use' }],
        'EMAIL_ALREADY_EXISTS'
      );
    }
    
    // Create default values
    const now = new Date();
    
    const user: OptionalUnlessRequiredId<User> = {
      email,
      passwordHash: userData.passwordHash,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role ?? 'user',
      organizations: [],
      active: userData.active ?? true,
      storageQuota: 1024 * 1024 * 100, // 100MB default
      storageUsed: 0,
      notificationSettings: {
        email: userData.notificationSettings?.email ?? true,
        push: userData.notificationSettings?.push ?? true,
        sms: userData.notificationSettings?.sms ?? false,
        frequency: userData.notificationSettings?.frequency ?? 'daily'
      },
      privacySettings: {
        profileVisibility: userData.privacySettings?.profileVisibility ?? 'private',
        shareActivity: userData.privacySettings?.shareActivity ?? false,
        shareProgression: userData.privacySettings?.shareProgression ?? false
      },
      preferences: {
        theme: userData.preferences?.theme ?? 'light',
        language: userData.preferences?.language ?? 'en',
        unitSystem: userData.preferences?.unitSystem ?? 'metric',
        dateFormat: userData.preferences?.dateFormat ?? 'YYYY-MM-DD',
        timeFormat: userData.preferences?.timeFormat ?? '24h'
      },
      mfaEnabled: false,
      loginAttempts: 0,
      createdAt: now,
      updatedAt: now
    };
    
    // Add external auth if provided
    if (userData.externalAuth && userData.externalAuth.length > 0) {
      user.externalAuth = userData.externalAuth.map(auth => ({
        ...auth,
        lastLogin: now
      }));
    }
    
    // Create the user in the database
    return super.create(user);
  }

  /**
   * Update user password hash
   * 
   * @param id - User ID
   * @param passwordHash - New password hash
   * @returns Updated user
   */
  public async updatePassword(id: string | ObjectId, passwordHash: string): Promise<User> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    
    const updateData = {
      passwordHash,
      updatedAt: new Date(),
      passwordResetToken: undefined,
      passwordResetExpires: undefined
    };
    
    const result = await this.collection.updateOne(
      { _id: objectId } as Filter<User>,
      { $set: updateData, $unset: { passwordResetToken: "", passwordResetExpires: "" } }
    );
    
    if (result.matchedCount === 0) {
      throw new EntityNotFoundError('User', objectId.toString());
    }
    
    return this.findById(objectId);
  }

  /**
   * Update MFA settings for a user
   * 
   * @param id - User ID
   * @param mfaSettings - MFA settings
   * @returns Updated user
   */
  public async updateMFASettings(id: string | ObjectId, mfaSettings: MFASettings): Promise<User> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    
    const updateData = {
      mfaEnabled: true,
      mfaSettings,
      updatedAt: new Date()
    };
    
    const result = await this.collection.updateOne(
      { _id: objectId } as Filter<User>,
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      throw new EntityNotFoundError('User', objectId.toString());
    }
    
    return this.findById(objectId);
  }

  /**
   * Disable MFA for a user
   * 
   * @param id - User ID
   * @returns Updated user
   */
  public async disableMFA(id: string | ObjectId): Promise<User> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    
    const updateData = {
      mfaEnabled: false,
      updatedAt: new Date()
    };
    
    const result = await this.collection.updateOne(
      { _id: objectId } as Filter<User>,
      { $set: updateData, $unset: { mfaSettings: "" } }
    );
    
    if (result.matchedCount === 0) {
      throw new EntityNotFoundError('User', objectId.toString());
    }
    
    return this.findById(objectId);
  }

  /**
   * Record a login for a user
   * 
   * @param id - User ID
   * @returns Updated user
   */
  public async recordLogin(id: string | ObjectId): Promise<User> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    
    const updateData = {
      lastLogin: new Date(),
      loginAttempts: 0,
      lockUntil: null,
      updatedAt: new Date()
    };
    
    const result = await this.collection.updateOne(
      { _id: objectId } as Filter<User>,
      { $set: updateData, $unset: { lockUntil: "" } }
    );
    
    if (result.matchedCount === 0) {
      throw new EntityNotFoundError('User', objectId.toString());
    }
    
    return this.findById(objectId);
  }

  /**
   * Record a failed login attempt for a user
   * 
   * @param id - User ID
   * @param maxAttempts - Maximum allowed attempts before locking
   * @param lockDuration - Lock duration in minutes
   * @returns Updated user
   */
  public async recordFailedLogin(
    id: string | ObjectId,
    maxAttempts: number = 5,
    lockDuration: number = 30
  ): Promise<User> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    
    // First, get the current user state
    const user = await this.findById(objectId);
    
    // Increment attempts
    const loginAttempts = user.loginAttempts + 1;
    
    // Determine if account should be locked
    const updateData: any = {
      loginAttempts,
      updatedAt: new Date()
    };
    
    if (loginAttempts >= maxAttempts) {
      // Lock the account
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + lockDuration);
      updateData.lockUntil = lockUntil;
    }
    
    const result = await this.collection.updateOne(
      { _id: objectId } as Filter<User>,
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      throw new EntityNotFoundError('User', objectId.toString());
    }
    
    return this.findById(objectId);
  }

  /**
   * Find users belonging to a specific organization
   * 
   * @param organizationId - Organization ID
   * @returns Array of users
   */
  public async findUsersInOrganization(organizationId: string | ObjectId): Promise<User[]> {
    const orgId = typeof organizationId === 'string' ? new ObjectId(organizationId) : organizationId;
    
    return this.find({
      'organizations.organizationId': orgId,
      'organizations.active': true
    });
  }

  /**
   * Add user to an organization
   * 
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @param role - Role in the organization
   * @returns Updated user
   */
  public async addToOrganization(
    userId: string | ObjectId,
    organizationId: string | ObjectId,
    role: string = 'member'
  ): Promise<User> {
    const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    const orgObjectId = typeof organizationId === 'string' ? new ObjectId(organizationId) : organizationId;
    
    // Check if user already belongs to this organization
    const user = await this.findById(userObjectId);
    const existingOrg = user.organizations.find(org => 
      org.organizationId.toString() === orgObjectId.toString()
    );
    
    if (existingOrg) {
      // Update existing organization membership
      const updateData = {
        'organizations.$.role': role,
        'organizations.$.active': true,
        updatedAt: new Date()
      };
      
      const result = await this.collection.updateOne(
        { 
          _id: userObjectId,
          'organizations.organizationId': orgObjectId
        } as Filter<User>,
        { $set: updateData }
      );
      
      if (result.matchedCount === 0) {
        throw new EntityNotFoundError('User', userObjectId.toString());
      }
    } else {
      // Add new organization membership
      const membershipData = {
        organizationId: orgObjectId,
        role,
        joinedAt: new Date(),
        active: true
      };
      
      const result = await this.collection.updateOne(
        { _id: userObjectId } as Filter<User>,
        { 
          $push: { organizations: membershipData },
          $set: { updatedAt: new Date() }
        }
      );
      
      if (result.matchedCount === 0) {
        throw new EntityNotFoundError('User', userObjectId.toString());
      }
      
      // If this is the first organization, set it as primary
      if (user.organizations.length === 0) {
        await this.collection.updateOne(
          { _id: userObjectId } as Filter<User>,
          { $set: { primaryOrganization: orgObjectId, updatedAt: new Date() } }
        );
      }
    }
    
    return this.findById(userObjectId);
  }

  /**
   * Remove user from an organization
   * 
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @returns Updated user
   */
  public async removeFromOrganization(
    userId: string | ObjectId,
    organizationId: string | ObjectId
  ): Promise<User> {
    const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    const orgObjectId = typeof organizationId === 'string' ? new ObjectId(organizationId) : organizationId;
    
    // Options: either remove completely or set active to false
    // We'll set active to false to preserve history
    const updateData = {
      'organizations.$.active': false,
      updatedAt: new Date()
    };
    
    const result = await this.collection.updateOne(
      { 
        _id: userObjectId,
        'organizations.organizationId': orgObjectId
      } as Filter<User>,
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      throw new EntityNotFoundError('User', userObjectId.toString());
    }
    
    // If this was the primary organization, unset it
    const user = await this.findById(userObjectId);
    if (user.primaryOrganization?.toString() === orgObjectId.toString()) {
      // Find another active organization to make primary
      const activeOrg = user.organizations.find(org => 
        org.active && org.organizationId.toString() !== orgObjectId.toString()
      );
      
      if (activeOrg) {
        await this.collection.updateOne(
          { _id: userObjectId } as Filter<User>,
          { $set: { primaryOrganization: activeOrg.organizationId, updatedAt: new Date() } }
        );
      } else {
        await this.collection.updateOne(
          { _id: userObjectId } as Filter<User>,
          { $unset: { primaryOrganization: "" }, $set: { updatedAt: new Date() } }
        );
      }
    }
    
    return this.findById(userObjectId);
  }

  /**
   * Set primary organization for a user
   * 
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @returns Updated user
   */
  public async setPrimaryOrganization(
    userId: string | ObjectId,
    organizationId: string | ObjectId
  ): Promise<User> {
    const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    const orgObjectId = typeof organizationId === 'string' ? new ObjectId(organizationId) : organizationId;
    
    // Verify user belongs to this organization
    const user = await this.findById(userObjectId);
    const existingOrg = user.organizations.find(org => 
      org.organizationId.toString() === orgObjectId.toString() && org.active
    );
    
    if (!existingOrg) {
      throw new ValidationError(
        'User does not belong to this organization',
        [{ field: 'organizationId', message: 'User does not belong to this organization' }],
        'INVALID_ORGANIZATION'
      );
    }
    
    // Update primary organization
    const result = await this.collection.updateOne(
      { _id: userObjectId } as Filter<User>,
      { $set: { primaryOrganization: orgObjectId, updatedAt: new Date() } }
    );
    
    if (result.matchedCount === 0) {
      throw new EntityNotFoundError('User', userObjectId.toString());
    }
    
    return this.findById(userObjectId);
  }

  /**
   * Update user storage quota
   * 
   * @param userId - User ID
   * @param quotaInBytes - New quota in bytes
   * @returns Updated user
   */
  public async updateStorageQuota(
    userId: string | ObjectId,
    quotaInBytes: number
  ): Promise<User> {
    const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    
    if (quotaInBytes < 0) {
      throw new ValidationError(
        'Storage quota cannot be negative',
        [{ field: 'quotaInBytes', message: 'Storage quota cannot be negative' }],
        'INVALID_QUOTA'
      );
    }
    
    const result = await this.collection.updateOne(
      { _id: userObjectId } as Filter<User>,
      { $set: { storageQuota: quotaInBytes, updatedAt: new Date() } }
    );
    
    if (result.matchedCount === 0) {
      throw new EntityNotFoundError('User', userObjectId.toString());
    }
    
    return this.findById(userObjectId);
  }

  /**
   * Update user storage used
   * 
   * @param userId - User ID
   * @param usedInBytes - Storage used in bytes
   * @returns Updated user
   */
  public async updateStorageUsed(
    userId: string | ObjectId,
    usedInBytes: number
  ): Promise<User> {
    const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    
    if (usedInBytes < 0) {
      throw new ValidationError(
        'Storage used cannot be negative',
        [{ field: 'usedInBytes', message: 'Storage used cannot be negative' }],
        'INVALID_STORAGE_USED'
      );
    }
    
    const result = await this.collection.updateOne(
      { _id: userObjectId } as Filter<User>,
      { $set: { storageUsed: usedInBytes, updatedAt: new Date() } }
    );
    
    if (result.matchedCount === 0) {
      throw new EntityNotFoundError('User', userObjectId.toString());
    }
    
    return this.findById(userObjectId);
  }

  /**
   * Override validation to ensure user data is valid
   * 
   * @param data - User data to validate
   * @param isUpdate - Whether this is an update operation
   */
  protected validateData(data: any, isUpdate: boolean = false): void {
    const errors: Array<{ field: string; message: string }> = [];
    
    // Skip validation for empty updates
    if (isUpdate && Object.keys(data).length === 0) {
      return;
    }
    
    // Validate email if provided
    if (!isUpdate && !data.email) {
      errors.push({ field: 'email', message: 'Email is required' });
    } else if (data.email && typeof data.email === 'string') {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push({ field: 'email', message: 'Invalid email format' });
      }
    }
    
    // Validate password if provided
    if (!isUpdate && !data.passwordHash) {
      errors.push({ field: 'passwordHash', message: 'Password hash is required' });
    }
    
    // Validate name if provided
    if (!isUpdate && !data.firstName) {
      errors.push({ field: 'firstName', message: 'First name is required' });
    }
    
    if (!isUpdate && !data.lastName) {
      errors.push({ field: 'lastName', message: 'Last name is required' });
    }
    
    // Throw validation error if any errors were found
    if (errors.length > 0) {
      throw new ValidationError(
        'Validation failed',
        errors,
        'VALIDATION_ERROR'
      );
    }
  }
}