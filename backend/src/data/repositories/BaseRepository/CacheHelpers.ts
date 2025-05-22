import { Types } from 'mongoose';
import { LoggerFacade } from '@/core/logging';
import { CacheFacade } from '@/core/cache/facade/CacheFacade';

/**
 * Cache helpers for repository operations
 */
export class CacheHelpers {
  private readonly cache: CacheFacade;
  private readonly logger: LoggerFacade;
  private readonly collectionName: string;

  constructor(cache: CacheFacade, logger: LoggerFacade, collectionName: string) {
    this.cache = cache;
    this.logger = logger;
    this.collectionName = collectionName;
  }

  /**
   * Generate cache key for document by ID
   */
  public generateIdKey(id: string | Types.ObjectId): string {
    return `${this.collectionName}:id:${id.toString()}`;
  }

  /**
   * Generate cache key for query
   */
  public generateQueryKey(query: Record<string, any>, options?: Record<string, any>): string {
    const queryString = JSON.stringify(query);
    const optionsString = options ? JSON.stringify(options) : '';
    const hash = this.simpleHash(queryString + optionsString);
    return `${this.collectionName}:query:${hash}`;
  }

  /**
   * Generate cache key for list operations
   */
  public generateListKey(
    query: Record<string, any>,
    page?: number,
    limit?: number,
    sort?: Record<string, any>
  ): string {
    const keyData = { query, page, limit, sort };
    const hash = this.simpleHash(JSON.stringify(keyData));
    return `${this.collectionName}:list:${hash}`;
  }

  /**
   * Generate cache key for count operations
   */
  public generateCountKey(query: Record<string, any>): string {
    const queryString = JSON.stringify(query);
    const hash = this.simpleHash(queryString);
    return `${this.collectionName}:count:${hash}`;
  }

  /**
   * Generate cache key for custom operations
   */
  public generateCustomKey(operation: string, params: Record<string, any>): string {
    const paramsString = JSON.stringify(params);
    const hash = this.simpleHash(paramsString);
    return `${this.collectionName}:${operation}:${hash}`;
  }

  /**
   * Cache a document by ID
   */
  public async cacheById<T>(
    id: string | Types.ObjectId,
    document: T,
    ttl: number = 300
  ): Promise<void> {
    try {
      const key = this.generateIdKey(id);
      await this.cache.set(key, document, { ttl });
      
      this.logger.debug('Document cached by ID', {
        collection: this.collectionName,
        id: id.toString(),
        key
      });
    } catch (error) {
      this.logger.warn('Failed to cache document by ID', {
        collection: this.collectionName,
        id: id.toString(),
        error
      });
    }
  }

  /**
   * Get cached document by ID
   */
  public async getCachedById<T>(id: string | Types.ObjectId): Promise<T | null> {
    try {
      const key = this.generateIdKey(id);
      const cached = await this.cache.get<T>(key);
      
      if (cached) {
        this.logger.debug('Document cache hit', {
          collection: this.collectionName,
          id: id.toString(),
          key
        });
      }
      
      return cached ?? null;
    } catch (error) {
      this.logger.warn('Failed to get cached document by ID', {
        collection: this.collectionName,
        id: id.toString(),
        error
      });
      return null;
    }
  }

  /**
   * Cache query result
   */
  public async cacheQueryResult<T>(
    query: Record<string, any>,
    result: T,
    ttl: number = 300,
    options?: Record<string, any>
  ): Promise<void> {
    try {
      const key = this.generateQueryKey(query, options);
      await this.cache.set(key, result, { ttl });
      
      this.logger.debug('Query result cached', {
        collection: this.collectionName,
        query,
        key
      });
    } catch (error) {
      this.logger.warn('Failed to cache query result', {
        collection: this.collectionName,
        query,
        error
      });
    }
  }

  /**
   * Get cached query result
   */
  public async getCachedQueryResult<T>(
    query: Record<string, any>,
    options?: Record<string, any>
  ): Promise<T | null> {
    try {
      const key = this.generateQueryKey(query, options);
      const cached = await this.cache.get<T>(key);
      
      if (cached) {
        this.logger.debug('Query cache hit', {
          collection: this.collectionName,
          query,
          key
        });
      }
      
      return cached ?? null;
    } catch (error) {
      this.logger.warn('Failed to get cached query result', {
        collection: this.collectionName,
        query,
        error
      });
      return null;
    }
  }

  /**
   * Invalidate cache by ID
   */
  public async invalidateById(id: string | Types.ObjectId): Promise<void> {
    try {
      const key = this.generateIdKey(id);
      await this.cache.remove(key);
      
      this.logger.debug('Cache invalidated by ID', {
        collection: this.collectionName,
        id: id.toString(),
        key
      });
    } catch (error) {
      this.logger.warn('Failed to invalidate cache by ID', {
        collection: this.collectionName,
        id: id.toString(),
        error
      });
    }
  }

  /**
   * Invalidate cache by pattern
   */
  public async invalidateByPattern(pattern: string): Promise<void> {
    try {
      const fullPattern = `${this.collectionName}:${pattern}`;
      const keys = await this.cache.keys(fullPattern);
      
      if (keys.length > 0) {
        await Promise.all(keys.map(key => this.cache.remove(key)));
        
        this.logger.debug('Cache invalidated by pattern', {
          collection: this.collectionName,
          pattern: fullPattern,
          invalidatedCount: keys.length
        });
      }
    } catch (error) {
      this.logger.warn('Failed to invalidate cache by pattern', {
        collection: this.collectionName,
        pattern,
        error
      });
    }
  }

  /**
   * Invalidate all cache for collection
   */
  public async invalidateAll(): Promise<void> {
    try {
      const pattern = `${this.collectionName}:*`;
      const keys = await this.cache.keys(pattern);
      
      if (keys.length > 0) {
        await Promise.all(keys.map(key => this.cache.remove(key)));
        
        this.logger.debug('All cache invalidated for collection', {
          collection: this.collectionName,
          invalidatedCount: keys.length
        });
      }
    } catch (error) {
      this.logger.warn('Failed to invalidate all cache for collection', {
        collection: this.collectionName,
        error
      });
    }
  }

  /**
   * Invalidate cache after document creation
   */
  public async invalidateAfterCreate(document: any): Promise<void> {
    // Invalidate list caches as they may no longer be accurate
    await this.invalidateByPattern('list:*');
    await this.invalidateByPattern('count:*');
    await this.invalidateByPattern('query:*');
  }

  /**
   * Invalidate cache after document update
   */
  public async invalidateAfterUpdate(id: string | Types.ObjectId, document?: any): Promise<void> {
    // Invalidate the specific document cache
    await this.invalidateById(id);
    
    // Invalidate list and query caches that might include this document
    await this.invalidateByPattern('list:*');
    await this.invalidateByPattern('query:*');
  }

  /**
   * Invalidate cache after document deletion
   */
  public async invalidateAfterDelete(id: string | Types.ObjectId): Promise<void> {
    // Invalidate the specific document cache
    await this.invalidateById(id);
    
    // Invalidate list, count, and query caches
    await this.invalidateByPattern('list:*');
    await this.invalidateByPattern('count:*');
    await this.invalidateByPattern('query:*');
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}