import { Types } from 'mongoose';
import { LoggerFacade } from '@/core/logging';
import { EventMediator } from '@/core/events/EventMediator';
import { PushTokenQueryHelper } from './PushTokenQueryHelper';
import { PushTokenCacheHelper } from './PushTokenCacheHelper';
import { CrudOperations } from '../operations/CrudOperations';
import { IPushToken } from '@/types/repositories/tokens';

/**
 * Management helper for push token lifecycle operations
 */
export class PushTokenManagementHelper {
  constructor(
    private readonly crudOps: CrudOperations<IPushToken>,
    private readonly logger: LoggerFacade,
    private readonly eventMediator: EventMediator,
    private readonly cacheHelper: PushTokenCacheHelper
  ) {}

  /**
   * Clean up inactive tokens
   */
  public async cleanupInactiveTokens(daysInactive: number = 30): Promise<number> {
    try {
      this.logger.debug('Cleaning up inactive push tokens', { daysInactive });

      const query = PushTokenQueryHelper.buildInactiveTokensQuery(daysInactive);
      const result = await this.crudOps.deleteMany(query);

      if (result.deletedCount > 0 && this.cacheHelper.isEnabled) {
        await this.cacheHelper.invalidateAll();
      }

      await this.publishEvent('push_token.cleanup_inactive', {
        deletedCount: result.deletedCount,
        daysInactive,
        timestamp: new Date()
      });

      return result.deletedCount;
    } catch (error) {
      this.logger.error('Error cleaning up inactive tokens', error as Error, { daysInactive });
      throw error;
    }
  }

  /**
   * Clean up expired tokens
   */
  public async cleanupExpiredTokens(): Promise<number> {
    try {
      this.logger.debug('Cleaning up expired push tokens');

      const query = PushTokenQueryHelper.buildExpiredTokensQuery();
      const result = await this.crudOps.deleteMany(query);

      if (result.deletedCount > 0 && this.cacheHelper.isEnabled) {
        await this.cacheHelper.invalidateAll();
      }

      await this.publishEvent('push_token.cleanup_expired', {
        deletedCount: result.deletedCount,
        timestamp: new Date()
      });

      return result.deletedCount;
    } catch (error) {
      this.logger.error('Error cleaning up expired tokens', error as Error);
      throw error;
    }
  }

  /**
   * Archive old tokens instead of deleting them
   */
  public async archiveOldTokens(daysOld: number = 90): Promise<number> {
    try {
      this.logger.debug('Archiving old tokens', { daysOld });

      const query = PushTokenQueryHelper.buildArchiveOldTokensQuery(daysOld);
      const result = await this.crudOps.updateMany(query, {
        $set: {
          archived: true,
          archivedAt: new Date()
        }
      });

      if (result.modifiedCount > 0) {
        await this.publishEvent('push_token.archived', {
          archivedCount: result.modifiedCount,
          daysOld,
          timestamp: new Date()
        });
      }

      return result.modifiedCount;
    } catch (error) {
      this.logger.error('Error archiving old tokens', error as Error, { daysOld });
      throw error;
    }
  }

  /**
   * Rotate tokens for security
   */
  public async rotateTokensForUser(
    userId: Types.ObjectId,
    reason?: string
  ): Promise<IPushToken[]> {
    try {
      this.logger.debug('Rotating tokens for user', { 
        userId: userId.toString(),
        reason 
      });

      // Mark all existing tokens as inactive
      await this.crudOps.updateMany(
        { user: userId, isActive: true },
        { 
          isActive: false,
          metadata: { 
            rotationReason: reason ?? 'security_rotation',
            rotatedAt: new Date()
          }
        }
      );

      // Get the deactivated tokens for event publishing
      const rotatedTokens = await this.crudOps.find({
        user: userId,
        'metadata.rotatedAt': { $exists: true }
      });

      if (this.cacheHelper.isEnabled) {
        await this.cacheHelper.invalidateUserCaches(userId);
        await this.cacheHelper.invalidateActiveTokenCaches();
      }

      await this.publishEvent('push_token.rotated', {
        userId: userId.toString(),
        tokenCount: rotatedTokens.length,
        reason,
        timestamp: new Date()
      });

      return rotatedTokens;
    } catch (error) {
      this.logger.error('Error rotating tokens for user', error as Error, { 
        userId: userId.toString(),
        reason 
      });
      throw error;
    }
  }

  /**
   * Batch update tokens for user
   */
  public async batchUpdateTokensForUser(
    userId: Types.ObjectId,
    updates: Partial<IPushToken>
  ): Promise<number> {
    try {
      this.logger.debug('Batch updating tokens for user', { 
        userId: userId.toString() 
      });

      const result = await this.crudOps.updateMany(
        { user: userId, isActive: true },
        updates
      );

      if (result.modifiedCount > 0 && this.cacheHelper.isEnabled) {
        await this.cacheHelper.invalidateUserCaches(userId);
        await this.cacheHelper.invalidateActiveTokenCaches();
      }

      await this.publishEvent('push_token.batch_updated', {
        userId: userId.toString(),
        updatedCount: result.modifiedCount,
        timestamp: new Date()
      });

      return result.modifiedCount;
    } catch (error) {
      this.logger.error('Error batch updating tokens for user', error as Error, { 
        userId: userId.toString() 
      });
      throw error;
    }
  }

  /**
   * Bulk activate/deactivate tokens
   */
  public async bulkUpdateActiveStatus(
    tokenIds: (Types.ObjectId)[],
    isActive: boolean
  ): Promise<number> {
    try {
      this.logger.debug('Bulk updating active status', { 
        count: tokenIds.length,
        isActive 
      });

      const result = await this.crudOps.updateMany({
        _id: { $in: tokenIds }
      }, {
        isActive,
        ...(isActive ? { lastUsed: new Date() } : {})
      });

      if (result.modifiedCount > 0 && this.cacheHelper.isEnabled) {
        await this.cacheHelper.invalidateAll();
      }

      await this.publishEvent('push_token.bulk_status_update', {
        tokenIds: tokenIds.map(id => id.toString()),
        isActive,
        updatedCount: result.modifiedCount,
        timestamp: new Date()
      });

      return result.modifiedCount;
    } catch (error) {
      this.logger.error('Error bulk updating active status', error as Error, { 
        count: tokenIds.length,
        isActive 
      });
      throw error;
    }
  }

  /**
   * Get duplicate tokens (same user + device combination)
   */
  public async findDuplicateTokens(): Promise<Array<{
    user: Types.ObjectId;
    deviceId: string;
    tokens: IPushToken[];
  }>> {
    try {
      this.logger.debug('Finding duplicate tokens');

      const pipeline = PushTokenQueryHelper.buildDuplicateTokensAggregation();
      const results = await this.crudOps.aggregate<{
        _id: { user: Types.ObjectId; deviceId: string };
        tokens: any[];
        count: number;
      }>(pipeline);

      return results.map((result) => ({
        user: result._id.user,
        deviceId: result._id.deviceId,
        tokens: result.tokens
      }));
    } catch (error) {
      this.logger.error('Error finding duplicate tokens', error as Error);
      throw error;
    }
  }

  /**
   * Deduplicate tokens (keep most recent, deactivate others)
   */
  public async deduplicateTokens(): Promise<number> {
    try {
      this.logger.debug('Deduplicating tokens');

      const duplicates = await this.findDuplicateTokens();
      let deactivatedCount = 0;

      for (const duplicate of duplicates) {
        // Sort by lastUsed (most recent first)
        const sortedTokens = duplicate.tokens.toSorted((a, b) => 
          new Date(b.lastUsed ?? b.createdAt).getTime() - new Date(a.lastUsed ?? a.createdAt).getTime()
        );

        // Keep the first (most recent), deactivate the rest
        const tokensToDeactivate = sortedTokens.slice(1);
        
        if (tokensToDeactivate.length > 0) {
          const tokenIds = tokensToDeactivate.map(token => token._id);
          const updated = await this.bulkUpdateActiveStatus(tokenIds, false);
          deactivatedCount += updated;
        }
      }

      if (deactivatedCount > 0) {
        await this.publishEvent('push_token.deduplicated', {
          deactivatedCount,
          duplicateGroups: duplicates.length,
          timestamp: new Date()
        });
      }

      return deactivatedCount;
    } catch (error) {
      this.logger.error('Error deduplicating tokens', error as Error);
      throw error;
    }
  }

  /**
   * Auto-deactivate tokens with too many failures
   */
  public async autoDeactivateFailedTokens(maxFailures: number = 10): Promise<number> {
    try {
      this.logger.debug('Auto-deactivating failed tokens', { maxFailures });

      const query = PushTokenQueryHelper.buildFailedTokensQuery(maxFailures);
      const result = await this.crudOps.updateMany(
        { ...query, isActive: true },
        { 
          isActive: false,
          metadata: {
            autoDeactivatedAt: new Date(),
            autoDeactivationReason: 'too_many_failures'
          }
        }
      );

      if (result.modifiedCount > 0) {
        if (this.cacheHelper.isEnabled) {
          await this.cacheHelper.invalidateActiveTokenCaches();
        }

        await this.publishEvent('push_token.auto_deactivated_bulk', {
          deactivatedCount: result.modifiedCount,
          maxFailures,
          timestamp: new Date()
        });
      }

      return result.modifiedCount;
    } catch (error) {
      this.logger.error('Error auto-deactivating failed tokens', error as Error, { maxFailures });
      throw error;
    }
  }

  /**
   * Refresh tokens that are close to expiration
   */
  public async refreshExpiringTokens(daysBefore: number = 7): Promise<IPushToken[]> {
    try {
      this.logger.debug('Finding tokens needing refresh', { daysBefore });

      const query = PushTokenQueryHelper.buildTokensNeedingRefreshQuery(daysBefore);
      const sortOptions = PushTokenQueryHelper.buildSortOptions('expiresAt');
      
      const tokens = await this.crudOps.find(query, { sort: sortOptions });

      if (tokens.length > 0) {
        await this.publishEvent('push_token.refresh_needed', {
          tokenCount: tokens.length,
          daysBefore,
          tokens: tokens.map((token) => ({
            id: token._id.toString(),
            userId: token.user.toString(),
            expiresAt: token.expiresAt
          })),
          timestamp: new Date()
        });
      }

      return tokens;
    } catch (error) {
      this.logger.error('Error finding tokens needing refresh', error as Error, { daysBefore });
      throw error;
    }
  }

  /**
   * Cleanup strategy - comprehensive cleanup operation
   */
  public async performComprehensiveCleanup(options: {
    cleanupInactiveDays?: number;
    archiveOldDays?: number;
    maxFailures?: number;
    deduplicateTokens?: boolean;
  } = {}): Promise<{
    inactiveDeleted: number;
    expiredDeleted: number;
    archived: number;
    autoDeactivated: number;
    deduplicated: number;
  }> {
    const {
      cleanupInactiveDays = 30,
      archiveOldDays = 90,
      maxFailures = 10,
      deduplicateTokens = true
    } = options;

    try {
      this.logger.info('Starting comprehensive push token cleanup', options);

      const results = {
        inactiveDeleted: 0,
        expiredDeleted: 0,
        archived: 0,
        autoDeactivated: 0,
        deduplicated: 0
      };

      // 1. Auto-deactivate failed tokens first
      results.autoDeactivated = await this.autoDeactivateFailedTokens(maxFailures);

      // 2. Archive old tokens
      results.archived = await this.archiveOldTokens(archiveOldDays);

      // 3. Clean up expired tokens
      results.expiredDeleted = await this.cleanupExpiredTokens();

      // 4. Clean up inactive tokens
      results.inactiveDeleted = await this.cleanupInactiveTokens(cleanupInactiveDays);

      // 5. Deduplicate tokens if requested
      if (deduplicateTokens) {
        results.deduplicated = await this.deduplicateTokens();
      }

      // Clear all caches after comprehensive cleanup
      if (this.cacheHelper.isEnabled) {
        await this.cacheHelper.invalidateAll();
      }

      await this.publishEvent('push_token.comprehensive_cleanup', {
        results,
        options,
        timestamp: new Date()
      });

      this.logger.info('Comprehensive push token cleanup completed', { results });

      return results;
    } catch (error) {
      this.logger.error('Error during comprehensive cleanup', error as Error, options);
      throw error;
    }
  }

  /**
   * Publish event helper
   */
  private async publishEvent(eventType: string, payload: any): Promise<void> {
    try {
      await this.eventMediator.publishAsync({
        type: eventType,
        payload,
        source: 'push-token-management',
        timestamp: new Date()
      } as any);
    } catch (error) {
      this.logger.warn('Failed to publish push token event', {
        eventType,
        error: (error as Error).message
      });
    }
  }
}