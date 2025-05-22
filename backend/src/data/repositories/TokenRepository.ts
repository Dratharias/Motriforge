import { BaseRepository } from './BaseRepository';
import { Database } from '../database/Database';
import { LoggerFacade } from '../../core/logging/LoggerFacade';
import { EventMediator } from '../../core/events/EventMediator';
import { ValidationError } from '../../core/error/exceptions/ValidationError';
import { Filter, ObjectId, OptionalUnlessRequiredId } from 'mongodb';
import { CacheFacade } from '@/core/cache/facade/CacheFacade';

/**
 * Refresh token model interface
 */
export interface RefreshToken {
  _id?: ObjectId;
  token: string;
  userId: ObjectId;
  expiresAt: Date;
  clientId?: string;
  userAgent?: string;
  ipAddress?: string;
  isRevoked: boolean;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Repository for token data access
 */
export class TokenRepository extends BaseRepository<RefreshToken> {
  /**
   * Cache for token storage
   */
  private readonly tokenCache?: CacheFacade;
  
  /**
   * Cache key prefix for tokens
   */
  private readonly cacheKeyPrefix: string = 'token:';
  
  /**
   * Cache domain for tokens
   */
  private readonly cacheDomain: string = 'auth';
  
  /**
   * Create a new TokenRepository instance
   * 
   * @param db - Database instance
   * @param logger - Logger instance
   * @param eventMediator - Event mediator instance
   * @param tokenCache - Optional cache for tokens
   */
  constructor(
    db: Database,
    logger: LoggerFacade,
    eventMediator?: EventMediator,
    tokenCache?: CacheFacade
  ) {
    super('refresh_tokens', db, logger, eventMediator);
    this.tokenCache = tokenCache;
  }

  /**
   * Find a token by its value
   * 
   * @param token - Token value
   * @returns Token if found, null otherwise
   */
  public async findByToken(token: string): Promise<RefreshToken | null> {
    // Try cache first if available
    if (this.tokenCache) {
      const cacheKey = this.getCacheKey(token);
      const cachedToken = await this.tokenCache.get<RefreshToken>(cacheKey, this.cacheDomain);
      
      if (cachedToken) {
        return cachedToken;
      }
    }
    
    // Fall back to database
    const result = await this.findOne({ token, isRevoked: false });
    
    // Cache the result if found
    if (result && this.tokenCache) {
      const cacheKey = this.getCacheKey(token);
      await this.tokenCache.set(cacheKey, result, { ttl: this.getRemainingTTL(result) }, this.cacheDomain);
    }
    
    return result;
  }

  /**
   * Find all tokens for a user
   * 
   * @param userId - User ID
   * @param includeRevoked - Whether to include revoked tokens
   * @returns Array of tokens
   */
  public async findByUserId(
    userId: string | ObjectId,
    includeRevoked: boolean = false
  ): Promise<RefreshToken[]> {
    const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    
    const query: Filter<RefreshToken> = { userId: userObjectId };
    
    if (!includeRevoked) {
      query.isRevoked = false;
    }
    
    return this.find(query);
  }

  /**
   * Create a new token
   * 
   * @param token - Token data
   * @returns Created token
   */
  public async create(token: OptionalUnlessRequiredId<RefreshToken>): Promise<RefreshToken> {
    // Ensure token value uniqueness
    const existingToken = await this.findOne({ token: token.token });
    if (existingToken) {
      throw new ValidationError(
        'Token already exists',
        [{ field: 'token', message: 'Token already exists' }],
        'TOKEN_ALREADY_EXISTS'
      );
    }
    
    // Create token with defaults
    const now = new Date();
    
    const tokenData: OptionalUnlessRequiredId<RefreshToken> = {
      ...token,
      isRevoked: false,
      createdAt: now,
      updatedAt: now
    };
    
    // Create in database
    const result = await super.create(tokenData);
    
    // Cache the token if cache is available
    if (this.tokenCache) {
      const cacheKey = this.getCacheKey(result.token);
      await this.tokenCache.set(cacheKey, result, { ttl: this.getRemainingTTL(result) }, this.cacheDomain);
    }
    
    return result;
  }

  /**
   * Update a token
   * 
   * @param id - Token ID
   * @param updates - Token update data
   * @returns Updated token
   */
  public async update(id: string | ObjectId, updates: Partial<RefreshToken>): Promise<RefreshToken> {
    const result = await super.update(id, updates);
    
    // Update cache if available and token has changed
    if (this.tokenCache && result.token) {
      const cacheKey = this.getCacheKey(result.token);
      
      if (result.isRevoked) {
        // Remove from cache if revoked
        await this.tokenCache.remove(cacheKey, this.cacheDomain);
      } else {
        // Update the cache
        await this.tokenCache.set(cacheKey, result, { ttl: this.getRemainingTTL(result) }, this.cacheDomain);
      }
    }
    
    return result;
  }

  /**
   * Delete a token by its value
   * 
   * @param token - Token value
   * @returns True if token was deleted, false otherwise
   */
  public async deleteByToken(token: string): Promise<boolean> {
    const existingToken = await this.findOne({ token });
    
    if (!existingToken) {
      return false;
    }
    
    const result = await this.delete(existingToken._id as ObjectId);
    
    // Remove from cache if available
    if (this.tokenCache) {
      const cacheKey = this.getCacheKey(token);
      await this.tokenCache.remove(cacheKey, this.cacheDomain);
    }
    
    return result;
  }

  /**
   * Delete all tokens for a user
   * 
   * @param userId - User ID
   * @returns True if tokens were deleted, false otherwise
   */
  public async deleteAllForUser(userId: string | ObjectId): Promise<boolean> {
    const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    
    // Get all tokens for the user
    const tokens = await this.findByUserId(userObjectId, true);
    
    if (tokens.length === 0) {
      return false;
    }
    
    // Delete from database
    const result = await this.collection.deleteMany({ userId: userObjectId });
    
    // Remove from cache if available
    if (this.tokenCache) {
      for (const token of tokens) {
        const cacheKey = this.getCacheKey(token.token);
        await this.tokenCache.remove(cacheKey, this.cacheDomain);
      }
    }
    
    // Publish events for each deleted token
    for (const token of tokens) {
      this.publishEvent('deleted', token);
    }
    
    return result.deletedCount > 0;
  }

  /**
   * Mark a token as revoked
   * 
   * @param tokenId - Token ID
   * @returns True if token was revoked, false otherwise
   */
  public async markAsRevoked(tokenId: string | ObjectId): Promise<boolean> {
    const objectId = typeof tokenId === 'string' ? new ObjectId(tokenId) : tokenId;
    
    // Get token to remove from cache
    const token = await this.findById(objectId);
    
    const now = new Date();
    const result = await this.collection.updateOne(
      { _id: objectId } as Filter<RefreshToken>,
      { 
        $set: { 
          isRevoked: true,
          revokedAt: now,
          updatedAt: now
        } 
      }
    );
    
    // Remove from cache if available
    if (this.tokenCache) {
      const cacheKey = this.getCacheKey(token.token);
      await this.tokenCache.remove(cacheKey, this.cacheDomain);
    }
    
    // Publish event
    if (result.matchedCount > 0) {
      const updatedToken = { ...token, isRevoked: true, revokedAt: now, updatedAt: now };
      this.publishEvent('revoked', updatedToken);
    }
    
    return result.matchedCount > 0;
  }

  /**
   * Check if a token is revoked
   * 
   * @param tokenId - Token ID
   * @returns True if token is revoked, false otherwise
   */
  public async isRevoked(tokenId: string | ObjectId): Promise<boolean> {
    const objectId = typeof tokenId === 'string' ? new ObjectId(tokenId) : tokenId;
    
    const token = await this.findById(objectId);
    return token.isRevoked;
  }

  /**
   * Clean up expired tokens
   * 
   * @returns Number of deleted tokens
   */
  public async cleanupExpiredTokens(): Promise<number> {
    const now = new Date();
    
    // Delete expired tokens
    const result = await this.collection.deleteMany({
      expiresAt: { $lt: now }
    });
    
    // Cannot clean cache for expired tokens as we don't know the token values
    // But they'll expire from the cache naturally due to TTL
    
    return result.deletedCount ?? 0;
  }

  /**
   * Build a cache key for a token
   * 
   * @param token - Token value
   * @returns Cache key
   */
  private getCacheKey(token: string): string {
    return `${this.cacheKeyPrefix}${token}`;
  }

  /**
   * Calculate the remaining TTL for a token in seconds
   * 
   * @param token - Token object
   * @returns TTL in seconds
   */
  private getRemainingTTL(token: RefreshToken): number {
    const now = new Date();
    const expiresAt = new Date(token.expiresAt);
    
    const ttlMs = expiresAt.getTime() - now.getTime();
    
    // Return TTL in seconds, minimum 1 second
    return Math.max(Math.floor(ttlMs / 1000), 1);
  }

  /**
   * Override validation to ensure token data is valid
   * 
   * @param data - Token data to validate
   * @param isUpdate - Whether this is an update operation
   */
  protected validateData(data: any, isUpdate: boolean = false): void {
    const errors: Array<{ field: string; message: string }> = [];
    
    // Skip validation for empty updates
    if (isUpdate && Object.keys(data).length === 0) {
      return;
    }
    
    // Validate token if provided
    if (!isUpdate && !data.token) {
      errors.push({ field: 'token', message: 'Token is required' });
    }
    
    // Validate userId if provided
    if (!isUpdate && !data.userId) {
      errors.push({ field: 'userId', message: 'User ID is required' });
    }
    
    // Validate expiresAt if provided
    if (!isUpdate && !data.expiresAt) {
      errors.push({ field: 'expiresAt', message: 'Expiration date is required' });
    } else if (data.expiresAt && !(data.expiresAt instanceof Date)) {
      errors.push({ field: 'expiresAt', message: 'Expiration date must be a valid date' });
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