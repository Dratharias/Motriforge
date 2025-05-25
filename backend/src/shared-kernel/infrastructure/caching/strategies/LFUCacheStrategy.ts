import { CacheEntryMetadata } from "@/types/shared/infrastructure/caching";
import { ICacheStrategy } from "../interfaces/ICache";

/**
 * LFU (Least Frequently Used) cache strategy
 */
export class LFUCacheStrategy implements ICacheStrategy {
  public readonly name = 'lfu';

  constructor(private readonly defaultTtl: number = 3600) {}

  shouldCache(key: string, value: any): boolean {
    return value !== null && value !== undefined;
  }

  getTtl(key: string, value: any): number {
    return this.defaultTtl;
  }

  getEvictionPriority(entry: CacheEntryMetadata): number {
    // LFU: Higher priority for least frequently used
    return entry.hits;
  }

  shouldEvict(entry: CacheEntryMetadata): boolean {
    if (entry.expiresAt && entry.expiresAt <= new Date()) {
      return true;
    }
    
    // Evict entries with very low hit counts
    return entry.hits < 2;
  }
}

