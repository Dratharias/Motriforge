import { Model, Types } from 'mongoose';
import { LoggerFacade } from '@/core/logging';
import { EventMediator } from '@/core/events/EventMediator';
import { CacheFacade } from '@/core/cache/facade/CacheFacade';
import { IRefreshToken } from '@/types/models';
import { ITokenRepository } from '@/types/repositories';
import { ValidationResult, RepositoryContext } from '@/types/repositories/base';
import { BaseRepository } from './BaseRepository';
import { ValidationHelpers } from './helpers';

/**
 * Repository for token operations with enhanced validation and caching
 */
export class TokenRepository extends BaseRepository<IRefreshToken> implements ITokenRepository {
  private static readonly CACHE_TTL = 300; // 5 minutes
  private static readonly TOKEN_CACHE_TTL = 1800; // 30 minutes for token data

  constructor(
    tokenModel: Model<IRefreshToken>,
    logger: LoggerFacade,
    eventMediator: EventMediator,
    cache?: CacheFacade
  ) {
    super(tokenModel, logger, eventMediator, cache, 'TokenRepository');
  }

  /**
   * Find token by token string
   */
  public async findByToken(token: string): Promise<IRefreshToken | null> {
    const cacheKey = this.cacheHelpers.generateCustomKey('token', { token });
    
    // Check cache first
    const cached = await this.cacheHelpers.getCustom<IRefreshToken>(cacheKey);
    if (cached) {
      return this.mapToEntity(cached);
    }

    try {
      this.logger.debug('Finding token by token string');
      
      const refreshToken = await this.crudOps.findOne({
        token,
        expiresAt: { $gt: new Date() },
        isRevoked: { $ne: true }
      });

      if (refreshToken && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, refreshToken, TokenRepository.TOKEN_CACHE_TTL);
        const tokenId = this.extractId(refreshToken);
        if (tokenId) {
          await this.cacheHelpers.cacheById(tokenId, refreshToken, TokenRepository.TOKEN_CACHE_TTL);
        }
      }

      return refreshToken ? this.mapToEntity(refreshToken) : null;
    } catch (error) {
      this.logger.error('Error finding token by token string', error as Error);
      throw error;
    }
  }

  /**
   * Find tokens by user ID
   */
  public async findByUserId(userId: Types.ObjectId): Promise<IRefreshToken[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('user', { 
      userId: userId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<IRefreshToken[]>(cacheKey);
    if (cached) {
      return cached.map(token => this.mapToEntity(token));
    }

    try {
      this.logger.debug('Finding tokens by user ID', { userId: userId.toString() });
      
      const tokens = await this.crudOps.find({
        user: new Types.ObjectId(userId.toString()),
        expiresAt: { $gt: new Date() },
        isRevoked: { $ne: true }
      }, {
        sort: [{ field: 'createdAt', direction: 'desc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, tokens, TokenRepository.CACHE_TTL);
      }

      return tokens.map(token => this.mapToEntity(token));
    } catch (error) {
      this.logger.error('Error finding tokens by user ID', error as Error, { 
        userId: userId.toString() 
      });
      throw error;
    }
  }

  /**
   * Delete token by token string
   */
  public async deleteByToken(token: string): Promise<boolean> {
    try {
      this.logger.debug('Deleting token by token string');
      
      const result = await this.crudOps.findOneAndDelete({ token });

      if (result && this.cacheHelpers.isEnabled) {
        const tokenId = this.extractId(result);
        if (tokenId) {
          await this.cacheHelpers.invalidateAfterDelete(tokenId);
        }
        await this.cacheHelpers.invalidateByPattern('token:*');
        await this.cacheHelpers.invalidateByPattern('user:*');
      }

      if (result) {
        await this.publishEvent('token.deleted', {
          tokenId: this.extractId(result)?.toString(),
          userId: result.user.toString(),
          timestamp: new Date()
        });
      }

      return !!result;
    } catch (error) {
      this.logger.error('Error deleting token by token string', error as Error);
      throw error;
    }
  }

  /**
   * Delete all tokens for user
   */
  public async deleteAllForUser(userId: Types.ObjectId): Promise<boolean> {
    try {
      this.logger.debug('Deleting all tokens for user', { userId: userId.toString() });
      
      const result = await this.crudOps.deleteMany({
        user: userId
      });

      if (result.deletedCount > 0 && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateByPattern('token:*');
        await this.cacheHelpers.invalidateByPattern('user:*');
      }

      if (result.deletedCount > 0) {
        await this.publishEvent('tokens.deleted.all', {
          userId: userId.toString(),
          deletedCount: result.deletedCount,
          timestamp: new Date()
        });
      }

      return result.deletedCount > 0;
    } catch (error) {
      this.logger.error('Error deleting all tokens for user', error as Error, { 
        userId: userId.toString() 
      });
      throw error;
    }
  }

  /**
   * Mark token as revoked
   */
  public async markAsRevoked(tokenId: Types.ObjectId): Promise<void> {
    try {
      this.logger.debug('Marking token as revoked', { tokenId: tokenId.toString() });
      
      const result = await this.crudOps.update(tokenId, {
        isRevoked: true,
        revokedAt: new Date(),
        updatedAt: new Date()
      });

      if (result && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateAfterUpdate(tokenId, result);
        await this.cacheHelpers.invalidateByPattern('token:*');
      }

      if (result) {
        await this.publishEvent('token.revoked', {
          tokenId: tokenId.toString(),
          userId: result.user.toString(),
          timestamp: new Date()
        });
      }
    } catch (error) {
      this.logger.error('Error marking token as revoked', error as Error, { 
        tokenId: tokenId.toString() 
      });
      throw error;
    }
  }

  /**
   * Check if token is revoked
   */
  public async isRevoked(tokenId: Types.ObjectId): Promise<boolean> {
    try {
      this.logger.debug('Checking if token is revoked', { tokenId: tokenId.toString() });
      
      const token = await this.findById(tokenId);
      return token?.isRevoked ?? true;
    } catch (error) {
      this.logger.error('Error checking if token is revoked', error as Error, { 
        tokenId: tokenId.toString() 
      });
      throw error;
    }
  }

  /**
   * Clean up expired tokens
   */
  public async cleanupExpiredTokens(): Promise<number> {
    try {
      this.logger.debug('Cleaning up expired tokens');
      
      const result = await this.crudOps.deleteMany({
        expiresAt: { $lt: new Date() }
      });

      if (result.deletedCount > 0 && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateByPattern('*');
      }

      if (result.deletedCount > 0) {
        await this.publishEvent('tokens.cleanup', {
          deletedCount: result.deletedCount,
          timestamp: new Date()
        });
      }

      this.logger.info('Cleaned up expired tokens', { 
        deletedCount: result.deletedCount 
      });

      return result.deletedCount;
    } catch (error) {
      this.logger.error('Error cleaning up expired tokens', error as Error);
      throw error;
    }
  }

  /**
   * Find active tokens for user
   */
  public async findActiveTokensForUser(userId: Types.ObjectId): Promise<IRefreshToken[]> {
    try {
      this.logger.debug('Finding active tokens for user', { userId: userId.toString() });
      
      const tokens = await this.crudOps.find({
        user: userId,
        expiresAt: { $gt: new Date() },
        isRevoked: { $ne: true }
      }, {
        sort: [{ field: 'createdAt', direction: 'desc' }]
      });

      return tokens.map(token => this.mapToEntity(token));
    } catch (error) {
      this.logger.error('Error finding active tokens for user', error as Error, { 
        userId: userId.toString() 
      });
      throw error;
    }
  }

  /**
   * Override create to handle token-specific logic
   */
  public async create(data: Partial<IRefreshToken>, context?: RepositoryContext): Promise<IRefreshToken> {
    // Set default expiration if not provided (7 days)
    if (!data.expiresAt) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      data.expiresAt = expiresAt;
    }

    // Set default values
    const tokenData: Partial<IRefreshToken> = {
      ...data,
      isRevoked: data.isRevoked ?? false,
      clientId: data.clientId ?? 'default',
      userAgent: data.userAgent ?? 'unknown',
      ipAddress: data.ipAddress ?? 'unknown'
    };

    const token = await super.create(tokenData, context);

    // Publish token creation event
    await this.publishEvent('token.created', {
      tokenId: token._id.toString(),
      userId: token.user.toString(),
      expiresAt: token.expiresAt,
      timestamp: new Date()
    });

    return token;
  }

  /**
   * Validate token data
   */
  protected validateData(data: Partial<IRefreshToken>): ValidationResult {
    const errors: string[] = [];

    // Required fields validation
    const requiredFields = ['token', 'user'];
    const requiredValidation = ValidationHelpers.validateRequiredFields(data, requiredFields);
    if (!requiredValidation.valid) {
      errors.push(...requiredValidation.errors);
    }

    // Token format validation
    if (data.token && data.token.length < 32) {
      errors.push('Token must be at least 32 characters long');
    }

    // Expiration date validation
    if (data.expiresAt && data.expiresAt < new Date()) {
      errors.push('Token expiration date cannot be in the past');
    }

    // User agent validation
    if (data.userAgent && data.userAgent.length > 500) {
      errors.push('User agent must be less than 500 characters');
    }

    // IP address validation (basic)
    if (data.ipAddress && data.ipAddress.length > 45) {
      errors.push('IP address must be less than 45 characters');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Map database document to domain entity
   */
  protected mapToEntity(data: any): IRefreshToken {
    return {
      _id: data._id,
      token: data.token,
      user: data.user,
      expiresAt: data.expiresAt,
      clientId: data.clientId ?? 'default',
      userAgent: data.userAgent ?? 'unknown',
      ipAddress: data.ipAddress ?? 'unknown',
      isRevoked: data.isRevoked ?? false,
      revokedAt: data.revokedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    } as IRefreshToken;
  }

  /**
   * Map domain entity to database document
   */
  protected mapFromEntity(entity: IRefreshToken): any {
    const doc = { ...entity };
    
    // Remove any computed fields
    delete (doc as any).__v;
    
    return doc;
  }
}