import { Model, Types } from 'mongoose';
import { LoggerFacade } from '@/core/logging';
import { EventMediator } from '@/core/events/EventMediator';
import { CacheFacade } from '@/core/cache/facade/CacheFacade';
import { BaseRepository } from './BaseRepository';
import { 
  ValidationResult, 
  RepositoryContext,
  IPushTokenRepository,
  IPushToken
} from '@/types/repositories';
import {
  PushTokenValidationHelper,
  PushTokenCacheHelper,
  PushTokenQueryHelper,
  PushTokenManagementHelper,
  PushTokenMetricsHelper
} from './tokenHelpers';

/**
 * Repository for push token operations with helper delegation
 */
export class PushTokenRepository extends BaseRepository<IPushToken> implements IPushTokenRepository {
  private readonly cacheHelper: PushTokenCacheHelper;
  private readonly managementHelper: PushTokenManagementHelper;
  private readonly metricsHelper: PushTokenMetricsHelper;

  constructor(
    pushTokenModel: Model<IPushToken>,
    logger: LoggerFacade,
    eventMediator: EventMediator,
    cache?: CacheFacade
  ) {
    super(pushTokenModel, logger, eventMediator, cache, 'PushTokenRepository');
    
    // Initialize helpers
    this.cacheHelper = new PushTokenCacheHelper(cache);
    this.managementHelper = new PushTokenManagementHelper(
      this.crudOps,
      this.logger,
      this.eventMediator,
      this.cacheHelper
    );
    this.metricsHelper = new PushTokenMetricsHelper(
      this.crudOps,
      this.logger,
      this.cacheHelper
    );
  }

  // #region Basic Query Operations

  /**
   * Find tokens by user
   */
  public async findByUser(userId: Types.ObjectId): Promise<IPushToken[]> {
    // Check cache first
    const cached = await this.cacheHelper.getUserTokens(userId);
    if (cached) {
      return cached.map((token: any) => this.mapToEntity(token));
    }

    try {
      this.logger.debug('Finding push tokens by user', { 
        userId: userId.toString() 
      });
      
      const tokens = await this.crudOps.find({
        user: userId
      }, {
        sort: PushTokenQueryHelper.buildSortOptions('lastUsed')
      });

      const entities = tokens.map(token => this.mapToEntity(token));

      // Cache results
      await this.cacheHelper.setUserTokens(userId, entities);

      return entities;
    } catch (error) {
      this.logger.error('Error finding push tokens by user', error as Error, { 
        userId: userId.toString() 
      });
      throw error;
    }
  }

  /**
   * Find token by token string
   */
  public async findByToken(token: string): Promise<IPushToken | null> {
    // Check cache first
    const cached = await this.cacheHelper.getToken(token);
    if (cached) {
      return this.mapToEntity(cached);
    }

    try {
      this.logger.debug('Finding push token by token string');
      
      const pushToken = await this.crudOps.findOne({ token });

      if (pushToken) {
        const entity = this.mapToEntity(pushToken);
        // Cache the result
        await this.cacheHelper.setToken(token, entity);
        return entity;
      }

      return null;
    } catch (error) {
      this.logger.error('Error finding push token by token', error as Error);
      throw error;
    }
  }

  /**
   * Find tokens by device ID
   */
  public async findByDeviceId(deviceId: string): Promise<IPushToken[]> {
    // Check cache first
    const cached = await this.cacheHelper.getDeviceTokens(deviceId);
    if (cached) {
      return cached.map((token: any) => this.mapToEntity(token));
    }

    try {
      this.logger.debug('Finding push tokens by device ID', { deviceId });
      
      const tokens = await this.crudOps.find({
        deviceId
      }, {
        sort: PushTokenQueryHelper.buildSortOptions('lastUsed')
      });

      const entities = tokens.map(token => this.mapToEntity(token));

      // Cache results
      await this.cacheHelper.setDeviceTokens(deviceId, entities);

      return entities;
    } catch (error) {
      this.logger.error('Error finding push tokens by device ID', error as Error, { deviceId });
      throw error;
    }
  }

  /**
   * Find tokens by device type
   */
  public async findByDeviceType(deviceType: string): Promise<IPushToken[]> {
    // Check cache first
    const cached = await this.cacheHelper.getDeviceTypeTokens(deviceType);
    if (cached) {
      return cached.map((token: any) => this.mapToEntity(token));
    }

    try {
      this.logger.debug('Finding push tokens by device type', { deviceType });
      
      const tokens = await this.crudOps.find({
        deviceType
      }, {
        sort: PushTokenQueryHelper.buildSortOptions('lastUsed')
      });

      const entities = tokens.map(token => this.mapToEntity(token));

      // Cache results
      await this.cacheHelper.setDeviceTypeTokens(deviceType, entities);

      return entities;
    } catch (error) {
      this.logger.error('Error finding push tokens by device type', error as Error, { deviceType });
      throw error;
    }
  }

  /**
   * Find active push tokens
   */
  public async findActivePushTokens(userId?: Types.ObjectId): Promise<IPushToken[]> {
    // Check cache first
    const cached = await this.cacheHelper.getActiveTokens(userId);
    if (cached) {
      return cached.map((token: any) => this.mapToEntity(token));
    }

    try {
      this.logger.debug('Finding active push tokens', { 
        userId: userId?.toString() 
      });
      
      const query = PushTokenQueryHelper.buildActiveTokensQuery(userId);
      const tokens = await this.crudOps.find(query, {
        sort: PushTokenQueryHelper.buildSortOptions('lastUsed')
      });

      const entities = tokens.map(token => this.mapToEntity(token));

      // Cache results
      await this.cacheHelper.setActiveTokens(entities, userId);

      return entities;
    } catch (error) {
      this.logger.error('Error finding active push tokens', error as Error, { 
        userId: userId?.toString() 
      });
      throw error;
    }
  }

  /**
   * Find expired tokens
   */
  public async findExpiredTokens(): Promise<IPushToken[]> {
    try {
      this.logger.debug('Finding expired push tokens');
      
      const query = PushTokenQueryHelper.buildExpiredTokensQuery();
      const tokens = await this.crudOps.find(query);

      return tokens.map(token => this.mapToEntity(token));
    } catch (error) {
      this.logger.error('Error finding expired push tokens', error as Error);
      throw error;
    }
  }

  /**
   * Find failed tokens
   */
  public async findFailedTokens(maxFailures: number = 5): Promise<IPushToken[]> {
    try {
      this.logger.debug('Finding failed push tokens', { maxFailures });
      
      const query = PushTokenQueryHelper.buildFailedTokensQuery(maxFailures);
      const tokens = await this.crudOps.find(query, {
        sort: [{ field: 'lastFailure', direction: 'desc' }]
      });

      return tokens.map(token => this.mapToEntity(token));
    } catch (error) {
      this.logger.error('Error finding failed push tokens', error as Error, { maxFailures });
      throw error;
    }
  }

  /**
   * Find tokens for notification delivery
   */
  public async findTokensForNotification(
    userIds: Types.ObjectId[],
    deviceTypes?: string[]
  ): Promise<IPushToken[]> {
    try {
      this.logger.debug('Finding tokens for notification delivery', { 
        userCount: userIds.length,
        deviceTypes 
      });

      const query = PushTokenQueryHelper.buildNotificationTokensQuery(userIds, deviceTypes);
      const tokens = await this.crudOps.find(query, {
        sort: PushTokenQueryHelper.buildSortOptions('lastUsed')
      });

      return tokens.map(token => this.mapToEntity(token));
    } catch (error) {
      this.logger.error('Error finding tokens for notification', error as Error, { 
        userCount: userIds.length,
        deviceTypes 
      });
      throw error;
    }
  }

  /**
   * Find tokens that need refresh
   */
  public async findTokensNeedingRefresh(daysBefore: number = 7): Promise<IPushToken[]> {
    return this.managementHelper.refreshExpiringTokens(daysBefore);
  }

  /**
   * Find duplicate tokens
   */
  public async findDuplicateTokens(): Promise<Array<{
    user: Types.ObjectId;
    deviceId: string;
    tokens: IPushToken[];
  }>> {
    return this.managementHelper.findDuplicateTokens();
  }

  // #endregion

  // #region Status Management Operations

  /**
   * Update last used timestamp
   */
  public async updateLastUsed(id: Types.ObjectId): Promise<IPushToken | null> {
    try {
      this.logger.debug('Updating last used timestamp', { id: id.toString() });

      const token = await this.crudOps.update(id, {
        lastUsed: new Date(),
        isActive: true
      });

      if (token) {
        const entity = this.mapToEntity(token);
        await this.cacheHelper.invalidateAfterUpdate(id, entity);
        return entity;
      }

      return null;
    } catch (error) {
      this.logger.error('Error updating last used timestamp', error as Error, { 
        id: id.toString() 
      });
      throw error;
    }
  }

  /**
   * Mark token as inactive
   */
  public async markAsInactive(id: Types.ObjectId): Promise<IPushToken | null> {
    try {
      this.logger.debug('Marking push token as inactive', { id: id.toString() });

      const token = await this.crudOps.update(id, { isActive: false });

      if (token) {
        const entity = this.mapToEntity(token);
        await this.cacheHelper.invalidateAfterUpdate(id, entity);

        await this.publishEvent('push_token.deactivated', {
          tokenId: id.toString(),
          userId: token.user.toString(),
          deviceType: token.deviceType,
          timestamp: new Date()
        });

        return entity;
      }

      return null;
    } catch (error) {
      this.logger.error('Error marking push token as inactive', error as Error, { 
        id: id.toString() 
      });
      throw error;
    }
  }

  /**
   * Increment failure count
   */
  public async incrementFailureCount(
    id: Types.ObjectId, 
    error?: string
  ): Promise<IPushToken | null> {
    try {
      this.logger.debug('Incrementing failure count for push token', { 
        id: id.toString() 
      });

      const updateData: any = {
        $inc: { failureCount: 1 },
        lastFailure: new Date()
      };

      if (error) {
        updateData.$set = {
          'metadata.lastError': error
        };
      }

      const token = await this.crudOps.findOneAndUpdate(
        { _id: id },
        updateData,
        { returnNew: true }
      );

      if (token) {
        const entity = this.mapToEntity(token);
        await this.cacheHelper.invalidateAfterUpdate(id, entity);

        // Auto-deactivate tokens with too many failures
        if (token.failureCount >= 10) {
          await this.markAsInactive(id);
          
          await this.publishEvent('push_token.auto_deactivated', {
            tokenId: id.toString(),
            userId: token.user.toString(),
            failureCount: token.failureCount,
            timestamp: new Date()
          });
        }

        return entity;
      }

      return null;
    } catch (error) {
      this.logger.error('Error incrementing failure count', error as Error, { 
        id: id.toString() 
      });
      throw error;
    }
  }

  /**
   * Mark token as successful
   */
  public async markAsSuccessful(id: Types.ObjectId): Promise<IPushToken | null> {
    try {
      this.logger.debug('Marking push token as successful', { id: id.toString() });

      const token = await this.crudOps.update(id, {
        failureCount: 0,
        lastSuccess: new Date(),
        lastUsed: new Date(),
        isActive: true
      });

      if (token) {
        const entity = this.mapToEntity(token);
        await this.cacheHelper.invalidateAfterUpdate(id, entity);
        return entity;
      }

      return null;
    } catch (error) {
      this.logger.error('Error marking push token as successful', error as Error, { 
        id: id.toString() 
      });
      throw error;
    }
  }

  // #endregion

  // #region Token Management Operations

  /**
   * Replace old token with new token
   */
  public async replaceToken(
    oldToken: string,
    newToken: string,
    userId: Types.ObjectId
  ): Promise<IPushToken | null> {
    try {
      this.logger.debug('Replacing push token', { 
        userId: userId.toString() 
      });

      const token = await this.crudOps.findOneAndUpdate(
        { token: oldToken, user: userId },
        { 
          token: newToken,
          lastUsed: new Date(),
          failureCount: 0,
          isActive: true
        },
        { returnNew: true }
      );

      if (token) {
        const entity = this.mapToEntity(token);
        
        // Invalidate caches
        await this.cacheHelper.invalidateUserCaches(userId);
        await this.cacheHelper.invalidateTokenCache(oldToken);

        await this.publishEvent('push_token.replaced', {
          tokenId: token._id.toString(),
          userId: userId.toString(),
          timestamp: new Date()
        });

        return entity;
      }

      return null;
    } catch (error) {
      this.logger.error('Error replacing push token', error as Error, { 
        userId: userId.toString() 
      });
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  public async updateNotificationPreferences(
    id: Types.ObjectId,
    preferences: Partial<IPushToken['notificationPreferences']>
  ): Promise<IPushToken | null> {
    try {
      this.logger.debug('Updating notification preferences', { 
        id: id.toString() 
      });

      const token = await this.crudOps.update(id, {
        notificationPreferences: preferences
      });

      if (token) {
        const entity = this.mapToEntity(token);
        await this.cacheHelper.invalidateAfterUpdate(id, entity);
        return entity;
      }

      return null;
    } catch (error) {
      this.logger.error('Error updating notification preferences', error as Error, { 
        id: id.toString() 
      });
      throw error;
    }
  }

  // #endregion

  // #region Statistics and Metrics (delegated to MetricsHelper)

  /**
   * Get token statistics by user
   */
  public async getTokenStatsByUser(userId: Types.ObjectId): Promise<{
    total: number;
    active: number;
    byPlatform: Record<string, number>;
  }> {
    return this.metricsHelper.getTokenStatsByUser(userId);
  }

  /**
   * Get health metrics
   */
  public async getHealthMetrics(): Promise<any> {
    return this.metricsHelper.getHealthMetrics();
  }

  // #endregion

  // #region Bulk Operations (delegated to ManagementHelper)

  /**
   * Batch update tokens for user
   */
  public async batchUpdateTokensForUser(
    userId: Types.ObjectId,
    updates: Partial<IPushToken>
  ): Promise<number> {
    return this.managementHelper.batchUpdateTokensForUser(userId, updates);
  }

  /**
   * Bulk activate/deactivate tokens
   */
  public async bulkUpdateActiveStatus(
    tokenIds: (Types.ObjectId)[],
    isActive: boolean
  ): Promise<number> {
    return this.managementHelper.bulkUpdateActiveStatus(tokenIds, isActive);
  }

  /**
   * Rotate tokens for security
   */
  public async rotateTokensForUser(
    userId: Types.ObjectId,
    reason?: string
  ): Promise<IPushToken[]> {
    return this.managementHelper.rotateTokensForUser(userId, reason);
  }

  // #endregion

  // #region Cleanup Operations (delegated to ManagementHelper)

  /**
   * Clean up inactive tokens
   */
  public async cleanupInactiveTokens(daysInactive: number = 30): Promise<number> {
    return this.managementHelper.cleanupInactiveTokens(daysInactive);
  }

  /**
   * Clean up expired tokens
   */
  public async cleanupExpiredTokens(): Promise<number> {
    return this.managementHelper.cleanupExpiredTokens();
  }

  /**
   * Archive old tokens
   */
  public async archiveOldTokens(daysOld: number = 90): Promise<number> {
    return this.managementHelper.archiveOldTokens(daysOld);
  }

  /**
   * Deduplicate tokens
   */
  public async deduplicateTokens(): Promise<number> {
    return this.managementHelper.deduplicateTokens();
  }

  // #endregion

  // #region Additional Public Methods

  /**
   * Perform comprehensive cleanup
   */
  public async performComprehensiveCleanup(options?: {
    cleanupInactiveDays?: number;
    archiveOldDays?: number;
    maxFailures?: number;
    deduplicateTokens?: boolean;
  }) {
    return this.managementHelper.performComprehensiveCleanup(options);
  }

  /**
   * Get dashboard metrics
   */
  public async getDashboardMetrics() {
    return this.metricsHelper.getDashboardMetrics();
  }

  /**
   * Get platform statistics
   */
  public async getPlatformStats() {
    return this.metricsHelper.getPlatformStats();
  }

  /**
   * Get failure analysis
   */
  public async getFailureAnalysis() {
    return this.metricsHelper.getFailureAnalysis();
  }

  // #endregion

  // #region BaseRepository Overrides

  /**
   * Override create to handle push token-specific logic
   */
  public async create(data: Partial<IPushToken>, context?: RepositoryContext): Promise<IPushToken> {
    // Check for existing token for the same user and device
    if (data.user && data.deviceId) {
      const existingTokens = await this.crudOps.find({
        user: data.user,
        deviceId: data.deviceId,
        isActive: true
      });

      // Deactivate existing tokens for the same device
      if (existingTokens.length > 0) {
        await this.crudOps.updateMany(
          { 
            user: data.user,
            deviceId: data.deviceId,
            isActive: true
          },
          { isActive: false }
        );
      }
    }

    // Set default values
    const tokenData: Partial<IPushToken> = {
      ...data,
      isActive: true,
      failureCount: 0,
      lastUsed: new Date(),
      platform: data.platform ?? data.deviceType as any,
      notificationPreferences: data.notificationPreferences ?? {
        workoutReminders: true,
        achievements: true,
        messages: true,
        systemNotifications: true
      },
      metadata: data.metadata ?? {}
    };

    // Set expiration if not provided (default to 1 year)
    if (!tokenData.expiresAt) {
      const expiration = new Date();
      expiration.setFullYear(expiration.getFullYear() + 1);
      tokenData.expiresAt = expiration;
    }

    const token = await super.create(tokenData, context);

    // Invalidate user-specific caches
    if (token.user) {
      await this.cacheHelper.invalidateUserCaches(token.user);
      await this.cacheHelper.invalidateActiveTokenCaches();
    }

    // Publish token creation event
    await this.publishEvent('push_token.created', {
      tokenId: token._id.toString(),
      userId: token.user.toString(),
      deviceType: token.deviceType,
      platform: token.platform,
      timestamp: new Date()
    });

    return token;
  }

  /**
   * Validate push token data using ValidationHelper
   */
  protected validateData(data: Partial<IPushToken>): ValidationResult {
    return PushTokenValidationHelper.validateData(data);
  }

  /**
   * Map database document to domain entity
   */
  protected mapToEntity(data: any): IPushToken {
    return {
      _id: data._id,
      user: data.user,
      token: data.token,
      deviceType: data.deviceType,
      deviceId: data.deviceId,
      isActive: data.isActive ?? true,
      lastUsed: data.lastUsed,
      platform: data.platform ?? data.deviceType,
      appVersion: data.appVersion,
      osVersion: data.osVersion,
      locale: data.locale,
      timezone: data.timezone,
      notificationPreferences: data.notificationPreferences ?? {
        workoutReminders: true,
        achievements: true,
        messages: true,
        systemNotifications: true
      },
      metadata: data.metadata ?? {},
      failureCount: data.failureCount ?? 0,
      lastFailure: data.lastFailure,
      lastSuccess: data.lastSuccess,
      expiresAt: data.expiresAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    } as IPushToken;
  }

  // #endregion
}