import { CacheFacade } from './CacheFacade';
import { CacheOptions } from '../CacheOptions';
import { CacheDomain } from '../CacheManager';

/**
 * Permission role stored in cache
 */
export interface RoleInfo {
  id: string;
  name: string;
  permissions: string[];
  isSystem?: boolean;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Facade for permission-related caching
 */
export class PermissionCacheFacade {
  /**
   * Parent cache facade
   */
  private readonly cacheFacade: CacheFacade;
  
  /**
   * Cache domain
   */
  private readonly domain: string = CacheDomain.PERMISSION;

  constructor(cacheFacade: CacheFacade) {
    this.cacheFacade = cacheFacade;
  }

  /**
   * Get user permissions
   */
  public async getUserPermissions(userId: string): Promise<string[] | undefined> {
    return this.cacheFacade.get(`user_permissions:${userId}`, this.domain);
  }

  /**
   * Set user permissions in the cache
   */
  public async setUserPermissions(userId: string, permissions: string[], options?: CacheOptions): Promise<void> {
    await this.cacheFacade.set(`user_permissions:${userId}`, permissions, options, this.domain);
  }

  /**
   * Get a role by ID
   */
  public async getRole(roleId: string): Promise<RoleInfo | undefined> {
    return this.cacheFacade.get(`role:${roleId}`, this.domain);
  }

  /**
   * Set a role in the cache
   */
  public async setRole(roleId: string, role: RoleInfo, options?: CacheOptions): Promise<void> {
    await this.cacheFacade.set(`role:${roleId}`, role, options, this.domain);
  }

  /**
   * Get user roles
   */
  public async getUserRoles(userId: string): Promise<string[] | undefined> {
    return this.cacheFacade.get(`user_roles:${userId}`, this.domain);
  }

  /**
   * Set user roles in the cache
   */
  public async setUserRoles(userId: string, roles: string[], options?: CacheOptions): Promise<void> {
    await this.cacheFacade.set(`user_roles:${userId}`, roles, options, this.domain);
  }

  /**
   * Get organization roles
   */
  public async getOrganizationRoles(organizationId: string): Promise<RoleInfo[] | undefined> {
    return this.cacheFacade.get(`org_roles:${organizationId}`, this.domain);
  }

  /**
   * Set organization roles in the cache
   */
  public async setOrganizationRoles(organizationId: string, roles: RoleInfo[], options?: CacheOptions): Promise<void> {
    await this.cacheFacade.set(`org_roles:${organizationId}`, roles, options, this.domain);
  }

  /**
   * Invalidate permission cache for a user
   */
  public async invalidateUserPermissions(userId: string): Promise<void> {
    await this.cacheFacade.remove(`user_permissions:${userId}`, this.domain);
    await this.cacheFacade.remove(`user_roles:${userId}`, this.domain);
  }

  /**
   * Invalidate all permission cache for an organization
   */
  public async invalidateOrganizationPermissions(organizationId: string): Promise<void> {
    await this.cacheFacade.remove(`org_roles:${organizationId}`, this.domain);
    
    // Also invalidate related keys
    const keys = await this.cacheFacade.keys(`org_*:${organizationId}`, this.domain);
    for (const key of keys) {
      await this.cacheFacade.remove(key, this.domain);
    }
  }

  /**
   * Clear all permission cache
   */
  public async clear(): Promise<void> {
    await this.cacheFacade.clear(this.domain);
  }
}