
/**
 * LFU (Least Frequently Used) eviction strategy
 */
export class LFUEvictionStrategy implements IEvictionStrategy {
  public readonly name = 'lfu';

  selectKeysToEvict(entries: Array<{ key: string; entry: CacheEntry }>, targetCount: number): string[] {
    // Sort by hit count (lowest first)
    const sorted = entries.sort((a, b) => a.entry.metadata.hits - b.entry.metadata.hits);
    return sorted.slice(0, targetCount).map(item => item.key);
  }

  shouldEvict(entry: CacheEntry): boolean {
    // Check expiration
    if (entry.metadata.expiresAt && entry.metadata.expiresAt <= new Date()) {
      return true;
    }

    // Evict entries with very low hit counts that haven't been accessed recently
    const timeSinceAccess = Date.now() - entry.metadata.lastAccessed.getTime();
    const oneHourMs = 60 * 60 * 1000;
    
    return entry.metadata.hits < 2 && timeSinceAccess > oneHourMs;
  }
}

