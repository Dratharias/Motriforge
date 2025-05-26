
/**
 * TTL (Time To Live) eviction strategy
 */
export class TTLEvictionStrategy implements IEvictionStrategy {
  public readonly name = 'ttl';

  selectKeysToEvict(entries: Array<{ key: string; entry: CacheEntry }>, targetCount: number): string[] {
    // Sort by expiration time (earliest first)
    const sorted = entries
      .filter(item => item.entry.metadata.expiresAt) // Only entries with TTL
      .sort((a, b) => {
        const aTime = a.entry.metadata.expiresAt?.getTime() || 0;
        const bTime = b.entry.metadata.expiresAt?.getTime() || 0;
        return aTime - bTime;
      });

    return sorted.slice(0, targetCount).map(item => item.key);
  }

  shouldEvict(entry: CacheEntry): boolean {
    return entry.metadata.expiresAt ? entry.metadata.expiresAt <= new Date() : false;
  }
}

