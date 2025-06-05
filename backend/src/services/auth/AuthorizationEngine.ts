import type { AuthorizationContext, AuthzResult, Permission } from '@/shared/types/auth.js';
import { RoleManager } from './RoleManager.js';

export class AuthorizationEngine {
  private readonly permissionCache = new Map<string, { permissions: Permission[]; timestamp: number }>();
  private readonly cacheExpiry = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly roleManager: RoleManager) {}

  async authorize(context: AuthorizationContext): Promise<AuthzResult> {
    try {
      const permissions = await this.getUserPermissions(context.userId);
      const matchedPermissions = permissions.filter(p => 
        p.resource === context.resource && p.action === context.action
      );

      if (matchedPermissions.length > 0) {
        return {
          allowed: true,
          matchedPermissions,
        };
      }

      // Check for wildcard permissions
      const wildcardPermissions = permissions.filter(p => 
        (p.resource === '*' || p.resource === context.resource) &&
        (p.action === '*' || p.action === context.action)
      );

      if (wildcardPermissions.length > 0) {
        return {
          allowed: true,
          matchedPermissions: wildcardPermissions,
        };
      }

      return {
        allowed: false,
        reason: `No permission found for ${context.resource}:${context.action}`,
        matchedPermissions: [],
      };
    } catch (error) {
      return {
        allowed: false,
        reason: `Authorization error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        matchedPermissions: [],
      };
    }
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    const cacheKey = userId;
    const cached = this.permissionCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.permissions;
    }

    const permissions = await this.roleManager.getUserPermissions(userId);
    this.permissionCache.set(cacheKey, {
      permissions,
      timestamp: Date.now(),
    });

    return permissions;
  }

  invalidatePermissionCache(userId?: string): void {
    if (userId) {
      this.permissionCache.delete(userId);
    } else {
      this.permissionCache.clear();
    }
  }

  async checkPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const result = await this.authorize({ userId, resource, action });
    return result.allowed;
  }
}