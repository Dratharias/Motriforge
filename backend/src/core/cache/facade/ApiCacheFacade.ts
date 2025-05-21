import { CacheFacade } from './CacheFacade';
import { CacheOptions } from '../CacheOptions';
import { CacheDomain } from '../CacheManager';

/**
 * Rate limit info stored in cache
 */
export interface RateLimitInfo {
  endpoint: string;
  method: string;
  limit: number;
  remaining: number;
  reset: Date;
  userId?: string;
  ipAddress?: string;
}

/**
 * Facade for API-related caching
 */
export class ApiCacheFacade {
  /**
   * Parent cache facade
   */
  private readonly cacheFacade: CacheFacade;
  
  /**
   * Cache domain
   */
  private readonly domain: string = CacheDomain.API;

  constructor(cacheFacade: CacheFacade) {
    this.cacheFacade = cacheFacade;
  }

  /**
   * Get an API response by key
   */
  public async getResponse(key: string): Promise<any> {
    return this.cacheFacade.get(`response:${key}`, this.domain);
  }

  /**
   * Set an API response in the cache
   */
  public async setResponse(key: string, response: any, options?: CacheOptions): Promise<void> {
    await this.cacheFacade.set(`response:${key}`, response, options, this.domain);
  }

  /**
   * Get rate limit info
   */
  public async getRateLimit(key: string): Promise<RateLimitInfo | undefined> {
    return this.cacheFacade.get(`ratelimit:${key}`, this.domain);
  }

  /**
   * Set rate limit info in the cache
   */
  public async setRateLimit(key: string, info: RateLimitInfo, options?: CacheOptions): Promise<void> {
    await this.cacheFacade.set(`ratelimit:${key}`, info, options, this.domain);
  }

  /**
   * Decrease remaining rate limit
   */
  public async decreaseRateLimit(key: string): Promise<number | undefined> {
    const info = await this.getRateLimit(key);
    
    if (!info) {
      return undefined;
    }
    
    info.remaining = Math.max(0, info.remaining - 1);
    
    await this.setRateLimit(key, info);
    
    return info.remaining;
  }

  /**
   * Clear API response cache by pattern
   */
  public async clearResponses(pattern: string): Promise<void> {
    const keys = await this.cacheFacade.keys(`response:${pattern}`, this.domain);
    
    for (const key of keys) {
      await this.cacheFacade.remove(key, this.domain);
    }
  }

  /**
   * Clear all API cache
   */
  public async clear(): Promise<void> {
    await this.cacheFacade.clear(this.domain);
  }
}