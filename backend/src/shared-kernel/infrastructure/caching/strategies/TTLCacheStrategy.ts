import { CacheEntryMetadata } from "@/types/shared/infrastructure/caching";
import { ICacheStrategy } from "../interfaces/ICache";

/**
 * TTL (Time To Live) based cache strategy
 */
export class TTLCacheStrategy implements ICacheStrategy {
  public readonly name = 'ttl';

  constructor(
    private readonly defaultTtl: number = 3600,
    private readonly ttlMap: Map<string, number> = new Map()
  ) {}

  shouldCache(key: string, value: any): boolean {
    return value !== null && value !== undefined;
  }

  getTtl(key: string, value: any): number {
    // Check for specific TTL mappings
    for (const [pattern, ttl] of this.ttlMap) {
      if (key.includes(pattern)) {
        return ttl;
      }
    }
    
    return this.defaultTtl;
  }

  getEvictionPriority(entry: CacheEntryMetadata): number {
    // TTL: Higher priority for entries that expire sooner
    if (!entry.expiresAt) {
      return Date.now() + this.defaultTtl * 1000;
    }
    
    return entry.expiresAt.getTime();
  }

  shouldEvict(entry: CacheEntryMetadata): boolean {
    return entry.expiresAt ? entry.expiresAt <= new Date() : false;
  }

  /**
   * Set TTL for specific key patterns
   */
  setTtlForPattern(pattern: string, ttl: number): void {
    this.ttlMap.set(pattern, ttl);
  }
}

