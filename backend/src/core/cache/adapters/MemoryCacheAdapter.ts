import { CacheAdapter } from './CacheAdapter';
import { CacheEntry } from '../CacheEntry';
import { CacheOptions } from '../CacheOptions';
import { CacheStats, createCacheStats, recordHit, recordMiss } from '../CacheStats';
import { EvictionStrategy } from '../CachePolicy';
import { EventEmitter } from 'events';
import { LoggerFacade } from '../../logging/LoggerFacade';

/**
 * Options for the memory cache adapter
 */
export interface MemoryCacheOptions {
  /**
   * Maximum number of entries
   */
  maxEntries?: number;
  
  /**
   * How often to check for expired entries (ms)
   */
  cleanupInterval?: number;
  
  /**
   * Default TTL for entries (ms)
   */
  defaultTTL?: number;
  
  /**
   * Eviction strategy
   */
  evictionStrategy?: EvictionStrategy;
}

/**
 * In-memory implementation of cache adapter
 */
export class MemoryCacheAdapter implements CacheAdapter {
  /**
   * Cache storage
   */
  private readonly store: Map<string, CacheEntry<any>> = new Map();
  
  /**
   * Configuration options
   */
  private readonly options: MemoryCacheOptions;
  
  /**
   * Event emitter for cache events
   */
  private readonly eventEmitter = new EventEmitter();
  
  /**
   * Cache statistics
   */
  private stats: CacheStats = createCacheStats();
  
  /**
   * Logger instance
   */
  private readonly logger: LoggerFacade;
  
  /**
   * Interval ID for cleanup task
   */
  private cleanupIntervalId?: NodeJS.Timeout;

  constructor(
    logger: LoggerFacade,
    options: MemoryCacheOptions = {}
  ) {
    this.options = {
      maxEntries: 1000,
      cleanupInterval: 60 * 1000, // 1 minute
      defaultTTL: 60 * 60 * 1000, // 1 hour
      evictionStrategy: EvictionStrategy.LRU,
      ...options
    };
    
    this.logger = logger.withComponent('MemoryCacheAdapter');
    
    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Get a value from the cache
   */
  public async get<T>(key: string): Promise<T | undefined> {
    try {
      const entry = this.store.get(key);
      
      if (!entry) {
        this.stats = recordMiss(this.stats);
        return undefined;
      }
      
      if (entry.isExpired()) {
        this.delete(key);
        this.stats = recordMiss(this.stats);
        this.eventEmitter.emit('expired', key);
        return undefined;
      }
      
      // Record the hit
      entry.recordHit();
      this.stats = recordHit(this.stats);
      this.eventEmitter.emit('hit', key);
      
      return entry.getValue();
    } catch (error) {
      this.stats.errors++;
      this.logger.error(`Error getting value for key ${key}`, error as Error);
      return undefined;
    }
  }

  /**
   * Set a value in the cache
   */
  public async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      // Calculate expiry time if TTL is provided
      const ttl = options?.ttl ?? this.options.defaultTTL;
      const expiresAt = ttl ? new Date(Date.now() + ttl) : undefined;
      
      // Check if we need to evict entries due to size constraints
      if (this.options.maxEntries && this.store.size >= this.options.maxEntries) {
        this.evictEntries(1);
      }
      
      // Create and store the entry
      const entry = new CacheEntry<T>({
        key,
        value,
        expiresAt,
        metadata: {
          tags: options?.tags,
          priority: options?.priority ?? 1
        }
      });
      
      this.store.set(key, entry);
      this.stats.sets++;
      this.stats.itemCount = this.store.size;
      
      // Update stats for newest and oldest entries
      this.updateEntryTimestampStats();
      
      this.eventEmitter.emit('set', key);
    } catch (error) {
      this.stats.errors++;
      this.logger.error(`Error setting value for key ${key}`, error as Error);
    }
  }

  /**
   * Delete a value from the cache
   */
  public async delete(key: string): Promise<void> {
    try {
      const deleted = this.store.delete(key);
      
      if (deleted) {
        this.stats.deletes++;
        this.stats.itemCount = this.store.size;
        this.eventEmitter.emit('delete', key);
      }
    } catch (error) {
      this.stats.errors++;
      this.logger.error(`Error deleting key ${key}`, error as Error);
    }
  }

  /**
   * Clear all values from the cache
   */
  public async clear(): Promise<void> {
    try {
      this.store.clear();
      this.stats.deletes += this.stats.itemCount;
      this.stats.itemCount = 0;
      this.eventEmitter.emit('clear');
    } catch (error) {
      this.stats.errors++;
      this.logger.error('Error clearing cache', error as Error);
    }
  }

  /**
   * Check if a key exists in the cache
   */
  public async has(key: string): Promise<boolean> {
    try {
      const entry = this.store.get(key);
      
      if (!entry) {
        return false;
      }
      
      if (entry.isExpired()) {
        this.delete(key);
        return false;
      }
      
      return true;
    } catch (error) {
      this.stats.errors++;
      this.logger.error(`Error checking key ${key}`, error as Error);
      return false;
    }
  }

  /**
   * Get all keys matching a pattern
   */
  public async keys(pattern?: string): Promise<string[]> {
    try {
      const allKeys = Array.from(this.store.keys());
      
      if (!pattern) {
        return allKeys;
      }
      
      // Simple glob pattern matching
      const regex = new RegExp(pattern.replace('*', '.*'));
      return allKeys.filter(key => regex.test(key));
    } catch (error) {
      this.stats.errors++;
      this.logger.error('Error getting keys', error as Error);
      return [];
    }
  }

  /**
   * Get statistics about the cache
   */
  public getStatistics(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Start the interval to clean up expired entries
   */
  private startCleanupInterval(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }
    
    this.cleanupIntervalId = setInterval(() => {
      this.evictExpiredEntries();
    }, this.options.cleanupInterval);
    
    // Ensure the interval doesn't prevent the process from exiting
    if (this.cleanupIntervalId.unref) {
      this.cleanupIntervalId.unref();
    }
  }

  /**
   * Evict expired entries
   */
  private evictExpiredEntries(): void {
    try {
      let evicted = 0;
      
      for (const [key, entry] of this.store.entries()) {
        if (entry.isExpired()) {
          this.store.delete(key);
          evicted++;
        }
      }
      
      if (evicted > 0) {
        this.stats.itemCount = this.store.size;
        this.logger.debug(`Evicted ${evicted} expired entries`);
      }
    } catch (error) {
      this.logger.error('Error evicting expired entries', error as Error);
    }
  }

  /**
   * Evict entries based on the configured eviction strategy
   */
  private evictEntries(count: number): void {
    if (count <= 0 || this.store.size === 0) {
      return;
    }
    
    try {
      const entriesToEvict = this.selectEntriesForEviction(count);
      
      for (const key of entriesToEvict) {
        this.store.delete(key);
        this.eventEmitter.emit('evict', key);
      }
      
      this.stats.itemCount = this.store.size;
      this.logger.debug(`Evicted ${entriesToEvict.length} entries due to size constraints`);
    } catch (error) {
      this.logger.error('Error evicting entries', error as Error);
    }
  }

  /**
   * Select entries for eviction based on the configured strategy
   */
  private selectEntriesForEviction(count: number): string[] {
    const entries = Array.from(this.store.entries());
    
    switch (this.options.evictionStrategy) {
      case EvictionStrategy.LRU:
        // Sort by last accessed time (oldest first)
        entries.sort((a, b) => a[1].lastAccessedAt.getTime() - b[1].lastAccessedAt.getTime());
        break;
        
      case EvictionStrategy.LFU:
        // Sort by hit count (lowest first)
        entries.sort((a, b) => a[1].hitCount - b[1].hitCount);
        break;
        
      case EvictionStrategy.FIFO:
        // Sort by creation time (oldest first)
        entries.sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime());
        break;
        
      case EvictionStrategy.RANDOM:
        // Random shuffle
        for (let i = entries.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [entries[i], entries[j]] = [entries[j], entries[i]];
        }
        break;
    }
    
    // Return the keys to evict
    return entries.slice(0, count).map(entry => entry[0]);
  }

  /**
   * Update statistics for newest and oldest entries
   */
  private updateEntryTimestampStats(): void {
    if (this.store.size === 0) {
      this.stats.oldestEntry = undefined;
      this.stats.newestEntry = undefined;
      return;
    }
    
    const entries = Array.from(this.store.values());

    const defaultEntry: CacheEntry<any> = {
      createdAt: new Date(0)
    } as CacheEntry<any>;
    
    // Find oldest entry
    const oldest = entries.reduce((prev, current) =>
      prev.createdAt < current.createdAt ? prev : current,
      defaultEntry
    );    
    
    // Find newest entry
    const newest = entries.reduce((prev, current) =>
      prev.createdAt > current.createdAt ? prev : current,
      { ...defaultEntry, createdAt: new Date(8640000000000000) }
    );
    
    this.stats.oldestEntry = oldest.createdAt;
    this.stats.newestEntry = newest.createdAt;
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = undefined;
    }
    
    this.eventEmitter.removeAllListeners();
    this.store.clear();
  }
}