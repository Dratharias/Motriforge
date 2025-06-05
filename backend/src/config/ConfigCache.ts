interface CacheEntry<T> {
  readonly value: T;
  readonly timestamp: Date;
  readonly accessCount: number;
  readonly lastAccessed: Date;
}

interface CacheStats {
  readonly totalEntries: number;
  readonly totalSize: number;
  readonly hitCount: number;
  readonly missCount: number;
  readonly hitRate: number;
  readonly oldestEntry?: Date;
  readonly newestEntry?: Date;
}

interface CacheOperationBatch<T> {
  readonly key: string;
  readonly value?: T;
  readonly operation: 'get' | 'set' | 'delete';
}

interface CacheMemoryUsage {
  readonly used: number;
  readonly available: number;
  readonly percentage: number;
}

class CacheStatsCalculator {
  public calculateStats(cache: Map<string, CacheEntry<any>>, hitCount: number, missCount: number): CacheStats {
    const totalRequests = hitCount + missCount;
    const entries = Array.from(cache.values());
    
    return {
      totalEntries: cache.size,
      totalSize: this.calculateTotalSize(cache),
      hitCount,
      missCount,
      hitRate: totalRequests > 0 ? hitCount / totalRequests : 0,
      ...this.calculateEntryTimestamps(entries),
    };
  }

  private calculateTotalSize(cache: Map<string, CacheEntry<any>>): number {
    let totalSize = 0;
    
    for (const entry of cache.values()) {
      try {
        const serialized = JSON.stringify(entry);
        totalSize += serialized.length * 2; // Rough estimate for UTF-16
      } catch {
        totalSize += 1024; // Default estimate for non-serializable objects
      }
    }
    
    return totalSize;
  }

  private calculateEntryTimestamps(entries: CacheEntry<any>[]): { oldestEntry?: Date; newestEntry?: Date } {
    if (entries.length === 0) {
      return {};
    }

    const oldestEntry = entries.reduce((oldest, entry) => 
      entry.timestamp < oldest ? entry.timestamp : oldest, entries[0].timestamp);
    
    const newestEntry = entries.reduce((newest, entry) => 
      entry.timestamp > newest ? entry.timestamp : newest, entries[0].timestamp);

    return { oldestEntry, newestEntry };
  }
}

class CacheEntryManager {
  public createEntry<T>(value: T): CacheEntry<T> {
    const now = new Date();
    return {
      value: this.cloneConfig(value),
      timestamp: now,
      accessCount: 0,
      lastAccessed: now
    };
  }

  public updateEntryAccess<T>(entry: CacheEntry<T>): CacheEntry<T> {
    return {
      ...entry,
      accessCount: entry.accessCount + 1,
      lastAccessed: new Date()
    };
  }

  private cloneConfig<T>(config: T): T {
    try {
      return JSON.parse(JSON.stringify(config));
    } catch (error) {
      console.warn('Failed to clone config, returning original reference:', error);
      return config;
    }
  }
}

class CacheEvictionManager {
  public evictOldestEntry(cache: Map<string, CacheEntry<any>>): void {
    const oldestKey = this.findOldestAccessedKey(cache);
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }

  public cleanup(cache: Map<string, CacheEntry<any>>, maxAge: number): number {
    const cutoff = Date.now() - maxAge;
    let removedCount = 0;

    for (const [key, entry] of cache.entries()) {
      if (entry.timestamp.getTime() < cutoff) {
        cache.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  private findOldestAccessedKey(cache: Map<string, CacheEntry<any>>): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of cache.entries()) {
      if (entry.lastAccessed.getTime() < oldestTime) {
        oldestTime = entry.lastAccessed.getTime();
        oldestKey = key;
      }
    }

    return oldestKey;
  }
}

class CacheAnalyzer {
  public getMostAccessedKeys(cache: Map<string, CacheEntry<any>>, limit = 10): readonly { key: string; accessCount: number }[] {
    return Array.from(cache.entries())
      .map(([key, entry]) => ({ key, accessCount: entry.accessCount }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }

  public getLeastAccessedKeys(cache: Map<string, CacheEntry<any>>, limit = 10): readonly { key: string; accessCount: number }[] {
    return Array.from(cache.entries())
      .map(([key, entry]) => ({ key, accessCount: entry.accessCount }))
      .sort((a, b) => a.accessCount - b.accessCount)
      .slice(0, limit);
  }

  public calculateMemoryUsage(totalSize: number, maxEntries: number, compressionThreshold: number): CacheMemoryUsage {
    const availableMemory = maxEntries * compressionThreshold;
    
    return {
      used: totalSize,
      available: availableMemory,
      percentage: availableMemory > 0 ? (totalSize / availableMemory) * 100 : 0
    };
  }
}

export class ConfigCache {
  private readonly cache = new Map<string, CacheEntry<any>>();
  private hitCount = 0;
  private missCount = 0;
  private readonly maxEntries: number;
  private readonly compressionThreshold: number;
  
  private readonly statsCalculator = new CacheStatsCalculator();
  private readonly entryManager = new CacheEntryManager();
  private readonly evictionManager = new CacheEvictionManager();
  private readonly analyzer = new CacheAnalyzer();

  constructor(options: { maxEntries?: number; compressionThreshold?: number } = {}) {
    this.maxEntries = options.maxEntries ?? 100;
    this.compressionThreshold = options.compressionThreshold ?? 1024 * 1024; // 1MB
  }

  public store<T>(key: string, config: T): void {
    try {
      this.enforceMaxEntries(key);
      const entry = this.entryManager.createEntry(config);
      this.cache.set(key, entry);
    } catch (error) {
      console.warn(`Failed to cache config for key ${key}:`, error);
    }
  }

  public retrieve<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.missCount++;
      return null;
    }

    this.hitCount++;
    const updatedEntry = this.entryManager.updateEntryAccess(entry);
    this.cache.set(key, updatedEntry);
    
    return entry.value;
  }

  public invalidate(key: string): void {
    this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
    this.resetStats();
  }

  public getLastUpdated(key: string): Date | null {
    const entry = this.cache.get(key);
    return entry?.timestamp ?? null;
  }

  public isExpired(key: string, ttl: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return true;
    }

    const age = Date.now() - entry.timestamp.getTime();
    return age > ttl;
  }

  public has(key: string): boolean {
    return this.cache.has(key);
  }

  public keys(): readonly string[] {
    return Array.from(this.cache.keys());
  }

  public getStats(): CacheStats {
    return this.statsCalculator.calculateStats(this.cache, this.hitCount, this.missCount);
  }

  public cleanup(maxAge: number): number {
    return this.evictionManager.cleanup(this.cache, maxAge);
  }

  public getMostAccessedKeys(limit = 10): readonly { key: string; accessCount: number }[] {
    return this.analyzer.getMostAccessedKeys(this.cache, limit);
  }

  public getLeastAccessedKeys(limit = 10): readonly { key: string; accessCount: number }[] {
    return this.analyzer.getLeastAccessedKeys(this.cache, limit);
  }

  public warmup<T>(entries: readonly { key: string; value: T }[]): void {
    for (const entry of entries) {
      this.store(entry.key, entry.value);
    }
  }

  public export(): Record<string, any> {
    const exported: Record<string, any> = {};
    
    for (const [key, entry] of this.cache.entries()) {
      exported[key] = {
        value: entry.value,
        metadata: {
          timestamp: entry.timestamp.toISOString(),
          accessCount: entry.accessCount,
          lastAccessed: entry.lastAccessed.toISOString()
        }
      };
    }
    
    return exported;
  }

  public import(data: Record<string, any>): void {
    this.clear();
    
    for (const [key, item] of Object.entries(data)) {
      if (this.isValidImportItem(item)) {
        const entry = this.createEntryFromImport(item);
        this.cache.set(key, entry);
      }
    }
  }

  public getMemoryUsage(): CacheMemoryUsage {
    const totalSize = this.statsCalculator.calculateStats(this.cache, this.hitCount, this.missCount).totalSize;
    return this.analyzer.calculateMemoryUsage(totalSize, this.maxEntries, this.compressionThreshold);
  }

  public resetStats(): void {
    this.hitCount = 0;
    this.missCount = 0;
  }

  public async prefetch<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const cached = this.retrieve<T>(key);
    if (cached) {
      return cached;
    }

    const value = await loader();
    this.store(key, value);
    return value;
  }

  public async batch<T>(operations: readonly CacheOperationBatch<T>[]): Promise<Record<string, T | null>> {
    const results: Record<string, T | null> = {};

    for (const op of operations) {
      switch (op.operation) {
        case 'get':
          results[op.key] = this.retrieve<T>(op.key);
          break;
        case 'set':
          if (op.value !== undefined) {
            this.store(op.key, op.value);
            results[op.key] = op.value;
          }
          break;
        case 'delete':
          this.invalidate(op.key);
          results[op.key] = null;
          break;
      }
    }

    return results;
  }

  private enforceMaxEntries(key: string): void {
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      this.evictionManager.evictOldestEntry(this.cache);
    }
  }

  private isValidImportItem(item: any): boolean {
    return item && typeof item === 'object' && 'value' in item;
  }

  private createEntryFromImport(item: any): CacheEntry<any> {
    const now = new Date();
    return {
      value: item.value,
      timestamp: item.metadata?.timestamp ? new Date(item.metadata.timestamp) : now,
      accessCount: item.metadata?.accessCount ?? 0,
      lastAccessed: item.metadata?.lastAccessed ? new Date(item.metadata.lastAccessed) : now
    };
  }
}