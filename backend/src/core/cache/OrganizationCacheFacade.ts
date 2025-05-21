import { CacheFacade } from './facade/CacheFacade';
import { CacheOptions } from './CacheOptions';
import { CacheDomain } from './CacheManager';

/**
 * Member info stored in cache
 */
export interface MemberInfo {
  userId: string;
  role: string;
  joinedAt: Date;
  permissions?: string[];
  status: string;
}

/**
 * Facade for organization-related caching
 */
export class OrganizationCacheFacade {
  /**
   * Parent cache facade
   */
  private readonly cacheFacade: CacheFacade;
  
  /**
   * Cache domain
   */
  private readonly domain: string = CacheDomain.ORGANIZATION;

  constructor(cacheFacade: CacheFacade) {
    this.cacheFacade = cacheFacade;
  }

  /**
   * Get an organization by ID
   */
  public async getOrganization(organizationId: string): Promise<any | undefined> {
    return this.cacheFacade.get(`org:${organizationId}`, this.domain);
  }

  /**
   * Set an organization in the cache
   */
  public async setOrganization(organizationId: string, organization: any, options?: CacheOptions): Promise<void> {
    await this.cacheFacade.set(`org:${organizationId}`, organization, options, this.domain);
  }

  /**
   * Get organization members
   */
  public async getMembers(organizationId: string): Promise<MemberInfo[] | undefined> {
    return this.cacheFacade.get(`members:${organizationId}`, this.domain);
  }

  /**
   * Set organization members in the cache
   */
  public async setMembers(organizationId: string, members: MemberInfo[], options?: CacheOptions): Promise<void> {
    await this.cacheFacade.set(`members:${organizationId}`, members, options, this.domain);
  }

  /**
   * Get user's organizations
   */
  public async getUserOrganizations(userId: string): Promise<string[] | undefined> {
    return this.cacheFacade.get(`user_orgs:${userId}`, this.domain);
  }

  /**
   * Set user's organizations in the cache
   */
  public async setUserOrganizations(userId: string, organizationIds: string[], options?: CacheOptions): Promise<void> {
    await this.cacheFacade.set(`user_orgs:${userId}`, organizationIds, options, this.domain);
  }

  /**
   * Get organization stats
   */
  public async getStats(organizationId: string): Promise<any | undefined> {
    return this.cacheFacade.get(`stats:${organizationId}`, this.domain);
  }

  /**
   * Set organization stats in the cache
   */
  public async setStats(organizationId: string, stats: any, options?: CacheOptions): Promise<void> {
    await this.cacheFacade.set(`stats:${organizationId}`, stats, options, this.domain);
  }

  /**
   * Invalidate organization cache
   */
  public async invalidateOrganization(organizationId: string): Promise<void> {
    const keys = await this.cacheFacade.keys(`*:${organizationId}`, this.domain);
    
    for (const key of keys) {
      await this.cacheFacade.remove(key, this.domain);
    }
  }

  /**
   * Invalidate user's organization cache
   */
  public async invalidateUserOrganizations(userId: string): Promise<void> {
    await this.cacheFacade.remove(`user_orgs:${userId}`, this.domain);
  }

  /**
   * Clear all organization cache
   */
  public async clear(): Promise<void> {
    await this.cacheFacade.clear(this.domain);
  }
}