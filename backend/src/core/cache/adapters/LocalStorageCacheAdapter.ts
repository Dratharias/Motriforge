import { CacheAdapter } from './CacheAdapter';
import { CacheEntry } from '../CacheEntry';
import { CacheOptions } from '../CacheOptions';
import { CacheStats, createCacheStats, recordHit, recordMiss } from '../CacheStats';
import { LoggerFacade } from '../../logging/LoggerFacade';

/**
 * Options for the localStorage cache adapter
 */
export interface StorageCacheOptions {
  /**
   * Prefix for localStorage keys
   */
  prefix?: string;
  
  /**
   * Default TTL for entries (ms)
   */
  defaultTTL?: number;
  
  /**
   * Whether to maintain a memory mirror for faster reads
   */
  useMemoryMirror?: boolean;
  
  /**
   * How often to sync with localStorage (ms)
   */
  syncInterval?: number;
}

/**
 * LocalStorage implementation of cache adapter
 * Note: This adapter is meant for browser environments
 */
export class LocalStorageCacheAdapter implements CacheAdapter {
  /**
   * Prefix for localStorage keys
   */
  private readonly prefix: string;
  
  /**
   * In-memory mirror of cached values for faster access
   */
  private readonly memoryMirror: Map<string, any> = new Map();
  
  /**
   * Configuration options
   */
  private readonly options: StorageCacheOptions;
  
  /**
   * Cache statistics
   */
  private stats: CacheStats = createCacheStats();
  
  /**
   * Logger instance
   */
  private readonly logger: LoggerFacade;
  
  /**
   * Interval ID for sync task
   */
  private syncIntervalId?: NodeJS.Timeout;
  
  /**
   * Whether localStorage is available
   */
  private readonly isStorageAvailable: boolean;

  constructor(
    logger: LoggerFacade,
    options: StorageCacheOptions = {}
  ) {
    this.options = {
      prefix: 'cache:',
      defaultTTL: 60 * 60 * 1000, // 1 hour
      useMemoryMirror: true,
      syncInterval: 5 * 60 * 1000, // 5 minutes
      ...options
    };
    
    this.prefix = this.options.prefix ?? 'cache:';
    this.logger = logger.withComponent('LocalStorageCacheAdapter');
    
    // Check if localStorage is available
    this.isStorageAvailable = this.checkStorageAvailability();
    
    if (!this.isStorageAvailable) {
      this.logger.warn('localStorage is not available, falling back to memory-only cache');
    } else if (this.options.useMemoryMirror) {
      // Initialize memory mirror from localStorage
      this.initializeFromStorage();
      
      // Start sync interval
      this.startSyncInterval();
    }
  }

  /**
   * Get a value from the cache
   */
  public async get<T>(key: string): Promise<T | undefined> {
    try {
      const fullKey = this.getFullKey(key);
      
      // Use memory mirror if enabled
      if (this.options.useMemoryMirror && this.memoryMirror.has(key)) {
        const cacheEntry = this.memoryMirror.get(key) as CacheEntry<T>;
        
        if (cacheEntry.isExpired()) {
          this.delete(key);
          this.stats = recordMiss(this.stats);
          return undefined;
        }
        
        cacheEntry.recordHit();
        this.stats = recordHit(this.stats);
        return cacheEntry.getValue();
      }
      
      // Fall back to localStorage if mirror is not enabled or entry is not in mirror
      if (this.isStorageAvailable) {
        const json = localStorage.getItem(fullKey);
        
        if (!json) {
          this.stats = recordMiss(this.stats);
          return undefined;
        }
        
        const cacheEntry = this.deserializeEntry<T>(json);
        
        if (cacheEntry.isExpired()) {
          this.delete(key);
          this.stats = recordMiss(this.stats);
          return undefined;
        }
        
        cacheEntry.recordHit();
        this.stats = recordHit(this.stats);
        
        // Update the entry in localStorage to reflect the hit
        localStorage.setItem(fullKey, this.serializeEntry(cacheEntry));
        
        // Update memory mirror if enabled
        if (this.options.useMemoryMirror) {
          this.memoryMirror.set(key, cacheEntry);
        }
        
        return cacheEntry.getValue();
      }
      
      // If localStorage is not available, we can't get the value
      this.stats = recordMiss(this.stats);
      return undefined;
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
      const fullKey = this.getFullKey(key);
      
      // Calculate expiry time if TTL is provided
      const ttl = options?.ttl ?? this.options.defaultTTL;
      const expiresAt = ttl ? new Date(Date.now() + ttl) : undefined;
      
      // Create the entry
      const entry = new CacheEntry<T>({
        key,
        value,
        expiresAt,
        metadata: {
          tags: options?.tags,
          priority: options?.priority ?? 1
        }
      });
      
      // Store in memory mirror if enabled
      if (this.options.useMemoryMirror) {
        this.memoryMirror.set(key, entry);
      }
      
      // Store in localStorage if available
      if (this.isStorageAvailable) {
        localStorage.setItem(fullKey, this.serializeEntry(entry));
      }
      
      this.stats.sets++;
      this.stats.itemCount = this.getItemCount();
      
      // Update stats for newest and oldest entries
      this.updateEntryTimestampStats();
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
      const fullKey = this.getFullKey(key);
      
      // Remove from memory mirror if enabled
      if (this.options.useMemoryMirror) {
        this.memoryMirror.delete(key);
      }
      
      // Remove from localStorage if available
      if (this.isStorageAvailable) {
        localStorage.removeItem(fullKey);
      }
      
      this.stats.deletes++;
      this.stats.itemCount = this.getItemCount();
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
      // Clear memory mirror if enabled
      if (this.options.useMemoryMirror) {
        this.memoryMirror.clear();
      }
      
      // Clear localStorage if available
      if (this.isStorageAvailable) {
        // Remove only items with our prefix
        const keysToRemove: string[] = [];
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(this.prefix)) {
            keysToRemove.push(key);
          }
        }
        
        for (const key of keysToRemove) {
          localStorage.removeItem(key);
        }
      }
      
      this.stats.deletes += this.stats.itemCount;
      this.stats.itemCount = 0;
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
      // Check memory mirror if enabled
      if (this.options.useMemoryMirror) {
        return this.memoryMirror.has(key);
      }
      
      // Check localStorage if available
      if (this.isStorageAvailable) {
        return localStorage.getItem(this.getFullKey(key)) !== null;
      }
      
      return false;
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
      const keys: string[] = [];
      
      // If memory mirror is enabled, get keys from there
      if (this.options.useMemoryMirror) {
        keys.push(...Array.from(this.memoryMirror.keys()));
      }
      // Otherwise get them from localStorage
      else if (this.isStorageAvailable) {
        for (let i = 0; i < localStorage.length; i++) {
          const fullKey = localStorage.key(i);
          if (fullKey?.startsWith(this.prefix)) {
            keys.push(this.getBaseKey(fullKey));
          }
        }
      }
      
      if (!pattern) {
        return keys;
      }
      
      // Simple glob pattern matching
      const regex = new RegExp(pattern.replace('*', '.*'));
      return keys.filter(key => regex.test(key));
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
   * Get the full localStorage key with prefix
   */
  private getFullKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Get the base key without prefix
   */
  private getBaseKey(fullKey: string): string {
    return fullKey.substring(this.prefix.length);
  }

  /**
  * Check if localStorage is available in the current environment
  * @returns {boolean} True if localStorage is available and working, false otherwise
  * @private
  */
  private checkStorageAvailability(): boolean {
    try {
      if (typeof localStorage === 'undefined') {
        this.logger.warn('localStorage is undefined in this environment', { reason: 'undefined' });
        return false;
      }
      
      const testKey = `${this.prefix}__test__`;
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      
      this.logger.debug('localStorage is available');
      return true;
    } catch (e) {
      this.logger.warn('localStorage is not available', { 
        error: e instanceof Error ? e.message : String(e) 
      });
      return false;
    }
  }

  /**
   * Initialize memory mirror from localStorage
   */
  private initializeFromStorage(): void {
    if (!this.isStorageAvailable || !this.options.useMemoryMirror) {
      return;
    }
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const fullKey = localStorage.key(i);
        
        if (!fullKey?.startsWith(this.prefix)) {
          continue;
        }
        
        const baseKey = this.getBaseKey(fullKey);
        const json = localStorage.getItem(fullKey);
        
        if (json) {
          const entry = this.deserializeEntry(json);
          
          // Skip expired entries
          if (entry.isExpired()) {
            localStorage.removeItem(fullKey);
            continue;
          }
          
          this.memoryMirror.set(baseKey, entry);
        }
      }
      
      this.stats.itemCount = this.memoryMirror.size;
      this.logger.debug(`Initialized memory mirror with ${this.memoryMirror.size} entries`);
    } catch (error) {
      this.logger.error('Error initializing from localStorage', error as Error);
    }
  }

  /**
   * Start the interval to sync memory mirror with localStorage
   */
  private startSyncInterval(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }
    
    this.syncIntervalId = setInterval(() => {
      this.syncToStorage();
    }, this.options.syncInterval);
    
    // Ensure the interval doesn't prevent the process from exiting
    if (this.syncIntervalId.unref) {
      this.syncIntervalId.unref();
    }
  }

  /**
   * Sync memory mirror to localStorage
   */
  private syncToStorage(): void {
    if (!this.isStorageAvailable || !this.options.useMemoryMirror) {
      return;
    }
    
    try {
      for (const [key, entry] of this.memoryMirror.entries()) {
        // Skip expired entries
        if (entry.isExpired()) {
          this.memoryMirror.delete(key);
          localStorage.removeItem(this.getFullKey(key));
          continue;
        }
        
        localStorage.setItem(this.getFullKey(key), this.serializeEntry(entry));
      }
      
      this.logger.debug(`Synced ${this.memoryMirror.size} entries to localStorage`);
    } catch (error) {
      this.logger.error('Error syncing to localStorage', error as Error);
    }
  }

  /**
   * Serialize a cache entry to a string
   */
  private serializeEntry<T>(entry: CacheEntry<T>): string {
    return JSON.stringify(entry);
  }

  /**
   * Deserialize a string to a cache entry
   */
  private deserializeEntry<T>(json: string): CacheEntry<T> {
    try {
      return JSON.parse(json) as CacheEntry<T>;
    } catch (error) {
      this.logger.error('Error deserializing cache entry', error as Error);
      throw error;
    }
  }

  /**
   * Get the total number of items in the cache
   */
  private getItemCount(): number {
    if (this.options.useMemoryMirror) {
      return this.memoryMirror.size;
    }
    
    if (this.isStorageAvailable) {
      let count = 0;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          count++;
        }
      }
      
      return count;
    }
    
    return 0;
  }

  /**
   * Update statistics for newest and oldest entries
   */
  private updateEntryTimestampStats(): void {
    if (!this.options.useMemoryMirror || this.memoryMirror.size === 0) {
      return;
    }
    
    const entries = Array.from(this.memoryMirror.values()) as CacheEntry[];

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
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = undefined;
    }
    
    this.memoryMirror.clear();
  }
}