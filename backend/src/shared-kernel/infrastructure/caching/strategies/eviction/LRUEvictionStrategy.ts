
/**
 * LRU (Least Recently Used) eviction strategy
 */
export class LRUEvictionStrategy implements IEvictionStrategy {
  public readonly name = 'lru';

  selectKeysToEvict(entries: Array<{ key: string; entry: CacheEntry }>, targetCount: number): string[] {
    // Sort by last accessed time (oldest first)
    const sorted = entries.sort((a, b) => 
      a.entry.metadata.lastAccessed.getTime() - b.entry.metadata.lastAccessed.getTime()
    );

    return sorted.slice(0, targetCount).map(item => item.key);
  }

  shouldEvict(entry: CacheEntry): boolean {
    // Check expiration
    if (entry.metadata.expiresAt && entry.metadata.expiresAt <= new Date()) {
      return true;
    }

    // Don't evict based on LRU logic alone - let capacity management handle it
    return false;
  }
}

