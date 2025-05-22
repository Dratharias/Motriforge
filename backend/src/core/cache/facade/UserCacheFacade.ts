import { CacheDomain, CacheOptions, UserPreferences } from '@/types/cache';
import { CacheFacade } from './CacheFacade';


/**
 * Facade for user-related caching
 */
export class UserCacheFacade {
  private readonly cacheFacade: CacheFacade;
  private readonly domain: string = CacheDomain.USER;

  constructor(cacheFacade: CacheFacade) {
    this.cacheFacade = cacheFacade;
  }

  /**
   * Get a user profile by ID
   */
  public async getProfile(userId: string): Promise<any> {
    return this.cacheFacade.get(`profile:${userId}`, this.domain);
  }

  /**
   * Set a user profile in the cache
   */
  public async setProfile(userId: string, profile: any, options?: CacheOptions): Promise<void> {
    await this.cacheFacade.set(`profile:${userId}`, profile, options, this.domain);
  }

  /**
   * Get user preferences by ID
   */
  public async getPreferences(userId: string): Promise<UserPreferences | undefined> {
    return this.cacheFacade.get(`preferences:${userId}`, this.domain);
  }

  /**
   * Set user preferences in the cache
   */
  public async setPreferences(userId: string, preferences: UserPreferences, options?: CacheOptions): Promise<void> {
    await this.cacheFacade.set(`preferences:${userId}`, preferences, options, this.domain);
  }

  /**
   * Get user's organization memberships
   */
  public async getMemberships(userId: string): Promise<any[] | undefined> {
    return this.cacheFacade.get(`memberships:${userId}`, this.domain);
  }

  /**
   * Set user's organization memberships in the cache
   */
  public async setMemberships(userId: string, memberships: any[], options?: CacheOptions): Promise<void> {
    await this.cacheFacade.set(`memberships:${userId}`, memberships, options, this.domain);
  }

  /**
   * Get user activity summary
   */
  public async getActivitySummary(userId: string): Promise<any> {
    return this.cacheFacade.get(`activity:${userId}`, this.domain);
  }

  /**
   * Set user activity summary in the cache
   */
  public async setActivitySummary(userId: string, activitySummary: any, options?: CacheOptions): Promise<void> {
    await this.cacheFacade.set(`activity:${userId}`, activitySummary, options, this.domain);
  }

  /**
   * Invalidate all user-related cache for a specific user
   */
  public async invalidateUser(userId: string): Promise<void> {
    const keys = await this.cacheFacade.keys(`*:${userId}`, this.domain);
    
    for (const key of keys) {
      await this.cacheFacade.remove(key, this.domain);
    }
  }

  /**
   * Clear all user cache
   */
  public async clear(): Promise<void> {
    await this.cacheFacade.clear(this.domain);
  }
}