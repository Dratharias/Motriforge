import { CacheEntryMetadata, CacheConfiguration } from "@/types/shared/infrastructure/caching";
import { BaseCacheAdapter } from "../core/BaseCacheAdapter";
import { ICacheSerializer, ICacheStrategy, ICacheHealthChecker, ICacheMetricsCollector } from "../interfaces/ICache";

/**
 * In-memory cache implementation - single responsibility for memory-based caching
 */
export class MemoryCache extends BaseCacheAdapter {
  private readonly store: Map<string, { value: any; metadata: CacheEntryMetadata }> = new Map();
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    name: string,
    config: CacheConfiguration,
    serializer: ICacheSerializer,
    strategy: ICacheStrategy,
    healthChecker: ICacheHealthChecker,
    metricsCollector: ICacheMetricsCollector
  ) {
    super(name, config, serializer, strategy, healthChecker, metricsCollector);
  }

  async connect(): Promise<void> {
    this.connected = true;
    this.startCleanupTimer();
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.stopCleanupTimer();
    this.store.clear();
  }

  isConnected(): boolean {
    return this.connected;
  }

  protected async performGet<T>(key: string): Promise<{ value: T; metadata: CacheEntryMetadata } | null> {
    const entry = this.store.get(key);
    
    if (!entry) {
      return null;
    }

    // Check expiration
    if (entry.metadata.expiresAt && entry.metadata.expiresAt <= new Date()) {
      this.store.delete(key);
      this.metricsCollector.recordEviction(key, 'expired');
      return null;
    }

    // Update access information
    entry.metadata = {
      ...entry.metadata,
      hits: entry.metadata.hits + 1,
      lastAccessed: new Date()
    };

    return {
      value: entry.value,
      metadata: entry.metadata
    };
  }

  protected async performSet<T>(key: string, value: T, metadata: CacheEntryMetadata): Promise<void> {
    // Check if we need to evict entries
    if (this.store.size >= this.config.maxKeys) {
      await this.evictEntries();
    }

    this.store.set(key, { value, metadata });
  }

  protected async performDelete(key: string): Promise<void> {
    this.store.delete(key);
  }

  protected async performExists(key: string): Promise<boolean> {
    if (!this.store.has(key)) {
      return false;
    }

    // Check expiration
    const entry = this.store.get(key)!;
    if (entry.metadata.expiresAt && entry.metadata.expiresAt <= new Date()) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  protected async performClear(): Promise<void> {
    this.store.clear();
  }

  protected async performKeys(pattern?: string): Promise<string[]> {
    const keys = Array.from(this.store.keys());
    
    if (!pattern) {
      return keys;
    }

    // Simple pattern matching (convert * to regex)
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return keys.filter(key => regex.test(key));
  }

  /**
   * Get memory usage statistics
   */
  getMemoryUsage(): { entryCount: number; estimatedSize: number } {
    let estimatedSize = 0;
    
    for (const [key, entry] of this.store) {
      estimatedSize += key.length * 2; // Rough estimate for key size
      estimatedSize += entry.metadata.size;
    }

    return {
      entryCount: this.store.size,
      estimatedSize
    };
  }

  private startCleanupTimer(): void {
    // Clean up expired entries every 60 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000);
  }

  private stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  private cleanupExpiredEntries(): void {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.store) {
      if (entry.metadata.expiresAt && entry.metadata.expiresAt <= now) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.store.delete(key);
      this.metricsCollector.recordEviction(key, 'expired');
    }
  }

  private async evictEntries(): Promise<void> {
    if (this.store.size === 0) {
      return;
    }

    const entries = Array.from(this.store.entries());
    
    // Sort by eviction priority (using strategy)
    entries.sort((a, b) => {
      const priorityA = this.strategy.getEvictionPriority(a[1].metadata);
      const priorityB = this.strategy.getEvictionPriority(b[1].metadata);
      return priorityA - priorityB;
    });

    // Evict 10% of entries or at least 1
    const evictionCount = Math.max(1, Math.floor(this.store.size * 0.1));
    
    for (let i = 0; i < evictionCount && i < entries.length; i++) {
      const [key] = entries[i];
      this.store.delete(key);
      this.metricsCollector.recordEviction(key, 'capacity');
    }
  }
}

