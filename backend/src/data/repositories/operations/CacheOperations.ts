import { Types } from 'mongoose';
import { LoggerFacade } from '@/core/logging';
import { CacheHelpers } from '../helpers/CacheHelpers';
import { FilterQuery, QueryOptions } from '@/types/repositories/base';
import { CacheFacade } from '@/core/cache/facade/CacheFacade';

/**
 * Handles caching operations for repositories
 */
export class CacheOperations<T> {
  private readonly cacheHelpers: CacheHelpers;

  constructor(
    private readonly cache: CacheFacade | undefined,
    private readonly logger: LoggerFacade,
    private readonly collectionName: string
  ) {
    this.cacheHelpers = new CacheHelpers(cache!, logger, collectionName);
  }

  /**
   * Check if caching is enabled
   */
  public get isEnabled(): boolean {
    return !!this.cache;
  }

  /**
   * Get cached document by ID
   */
  public async getCachedById(id: string | Types.ObjectId): Promise<T | null> {
    if (!this.cache) return null;
    
    try {
      return await this.cacheHelpers.getCachedById<T>(id);
    } catch (error) {
      this.logger.warn('Error getting cached document by ID', { 
        id: id.toString(), 
        error 
      });
      return null;
    }
  }

  /**
   * Cache document by ID
   */
  public async cacheById(id: string | Types.ObjectId, doc: any, ttl: number = 300): Promise<void> {
    if (!this.cache) return;
    
    try {
      await this.cacheHelpers.cacheById(id, doc, ttl);
    } catch (error) {
      this.logger.warn('Error caching document by ID', { 
        id: id.toString(), 
        error 
      });
    }
  }

  /**
   * Get cached query result
   */
  public async getCachedQueryResult<R>(
    query: FilterQuery, 
    options?: QueryOptions
  ): Promise<R | null> {
    if (!this.cache) return null;
    
    try {
      return await this.cacheHelpers.getCachedQueryResult<R>(query, options);
    } catch (error) {
      this.logger.warn('Error getting cached query result', { query, error });
      return null;
    }
  }

  /**
   * Cache query result
   */
  public async cacheQueryResult<R>(
    query: FilterQuery, 
    result: R, 
    ttl: number = 300, 
    options?: QueryOptions
  ): Promise<void> {
    if (!this.cache) return;
    
    try {
      await this.cacheHelpers.cacheQueryResult(query, result, ttl, options);
    } catch (error) {
      this.logger.warn('Error caching query result', { query, error });
    }
  }

  /**
   * Invalidate cache after create operation
   */
  public async invalidateAfterCreate(doc: any): Promise<void> {
    if (!this.cache) return;
    
    try {
      await this.cacheHelpers.invalidateAfterCreate(doc);
    } catch (error) {
      this.logger.warn('Error invalidating cache after create', { error });
    }
  }

  /**
   * Invalidate cache after update operation
   */
  public async invalidateAfterUpdate(id: string | Types.ObjectId, doc?: any): Promise<void> {
    if (!this.cache) return;
    
    try {
      await this.cacheHelpers.invalidateAfterUpdate(id, doc);
    } catch (error) {
      this.logger.warn('Error invalidating cache after update', { 
        id: id.toString(), 
        error 
      });
    }
  }

  /**
   * Invalidate cache after delete operation
   */
  public async invalidateAfterDelete(id: string | Types.ObjectId): Promise<void> {
    if (!this.cache) return;
    
    try {
      await this.cacheHelpers.invalidateAfterDelete(id);
    } catch (error) {
      this.logger.warn('Error invalidating cache after delete', { 
        id: id.toString(), 
        error 
      });
    }
  }

  /**
   * Invalidate cache by pattern
   */
  public async invalidateByPattern(pattern: string): Promise<void> {
    if (!this.cache) return;
    
    try {
      await this.cacheHelpers.invalidateByPattern(pattern);
    } catch (error) {
      this.logger.warn('Error invalidating cache by pattern', { pattern, error });
    }
  }

  /**
   * Generate custom cache key
   */
  public generateCustomKey(operation: string, params: Record<string, any>): string {
    return this.cacheHelpers.generateCustomKey(operation, params);
  }

  /**
   * Set custom cache value
   */
  public async setCustom(key: string, value: any, ttl: number = 300): Promise<void> {
    if (!this.cache) return;
    
    try {
      await this.cache.set(key, value, { ttl });
    } catch (error) {
      this.logger.warn('Error setting custom cache value', { key, error });
    }
  }

  /**
   * Get custom cache value
   */
  public async getCustom<R>(key: string): Promise<R | null> {
    if (!this.cache) return null;
    
    try {
      return await this.cache.get<R>(key) ?? null;
    } catch (error) {
      this.logger.warn('Error getting custom cache value', { key, error });
      return null;
    }
  }

  /**
   * Remove custom cache value
   */
  public async removeCustom(key: string): Promise<void> {
    if (!this.cache) return;
    
    try {
      await this.cache.remove(key);
    } catch (error) {
      this.logger.warn('Error removing custom cache value', { key, error });
    }
  }

  /**
   * Check if query is simple enough for caching
   */
  public isSimpleQuery(query: FilterQuery): boolean {
    const queryKeys = Object.keys(query);
    return queryKeys.length <= 3 && !queryKeys.some(key => 
      key.startsWith('$') || 
      (typeof query[key] === 'object' && query[key] !== null)
    );
  }
}