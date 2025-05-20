import { Types  } from 'mongoose';

/**
 * Represents the context for permission checks.
 * Contains information about the user, organization, and resource.
 * 
 * Used in both frontend and backend.
 */
export interface PermissionContext {
  /**
   * Information about the user requesting the permission check
   */
  user: {
    id?: Types.ObjectId;
    roles?: string[];
    permissions?: string[];
    isAuthenticated: boolean;
    isAdmin?: boolean;
  };
  
  /**
   * Information about the organization context
   */
  organization?: {
    id?: Types.ObjectId;
    role?: string;
    permissions?: string[];
    isOwner?: boolean;
    isAdmin?: boolean;
  };
  
  /**
   * Information about the resource being accessed
   */
  resource?: {
    id?: Types.ObjectId;
    type?: string;
    ownerId?: Types.ObjectId;
    organizationId?: Types.ObjectId;
    visibility?: string;
    metadata?: Record<string, any>;
  };
  
  /**
   * Additional metadata for the permission check
   */
  metadata?: Record<string, any>;
  
  /**
   * Get the user ID
   */
  getUserId(): Types.ObjectId | undefined;
  
  /**
   * Check if the user is authenticated
   */
  isAuthenticated(): boolean;
  
  /**
   * Check if the user is a system admin
   */
  isSystemAdmin(): boolean;
  
  /**
   * Check if the user has a specific role
   */
  hasRole(role: string): boolean;
  
  /**
   * Check if the user has a specific permission
   */
  hasPermission(permission: string): boolean;
  
  /**
   * Check if the user is the owner of the resource
   */
  isResourceOwner(): boolean;
  
  /**
   * Check if the user is an organization admin
   */
  isOrganizationAdmin(): boolean;
  
  /**
   * Check if the user is an organization owner
   */
  isOrganizationOwner(): boolean;
  
  /**
   * Get a key for caching permission results
   */
  getCacheKey(): string;
}

/**
 * Implementation of the PermissionContext interface
 */
export class PermissionContextImpl implements PermissionContext {
  user: {
    id?: Types.ObjectId;
    roles?: string[];
    permissions?: string[];
    isAuthenticated: boolean;
    isAdmin?: boolean;
  };
  
  organization?: {
    id?: Types.ObjectId;
    role?: string;
    permissions?: string[];
    isOwner?: boolean;
    isAdmin?: boolean;
  };

  resource?: {
    id?: Types.ObjectId;
    type?: string;
    ownerId?: Types.ObjectId;
    organizationId?: Types.ObjectId;
    visibility?: string;
    metadata?: Record<string, any>;
  };
  
  metadata?: Record<string, any>;
  
  constructor(
    user: {
      id?: Types.ObjectId;
      roles?: string[];
      permissions?: string[];
      isAuthenticated: boolean;
      isAdmin?: boolean;
    },
    organization?: {
      id?: Types.ObjectId;
      role?: string;
      permissions?: string[];
      isOwner?: boolean;
      isAdmin?: boolean;
    },
    resource?: {
      id?: Types.ObjectId;
      type?: string;
      ownerId?: Types.ObjectId;
      organizationId?: Types.ObjectId;
      visibility?: string;
      metadata?: Record<string, any>;
    },
    metadata?: Record<string, any>
  ) {
    this.user = user;
    this.organization = organization;
    this.resource = resource;
    this.metadata = metadata;
  }
  
  /**
   * Get the user ID
   */
  getUserId(): Types.ObjectId | undefined {
    return this.user.id;
  }
  
  /**
   * Check if the user is authenticated
   */
  isAuthenticated(): boolean {
    return this.user.isAuthenticated;
  }
  
  /**
   * Check if the user is a system admin
   */
  isSystemAdmin(): boolean {
    return !!this.user.isAdmin;
  }
  
  /**
   * Check if the user has a specific role
   */
  hasRole(role: string): boolean {
    return !!this.user.roles?.includes(role);
  }
  
  /**
   * Check if the user has a specific permission
   */
  hasPermission(permission: string): boolean {
    return !!this.user.permissions?.includes(permission);
  }
  
  /**
   * Check if the user is the owner of the resource
   */
  isResourceOwner(): boolean {
    if (!this.resource?.ownerId || !this.user?.id) {
      return false;
    }
    
    return this.resource.ownerId === this.user.id;
  }
  
  /**
   * Check if the user is an organization admin
   */
  isOrganizationAdmin(): boolean {
    return !!this.organization?.isAdmin;
  }
  
  /**
   * Check if the user is an organization owner
   */
  isOrganizationOwner(): boolean {
    return !!this.organization?.isOwner;
  }
  
  /**
   * Get a key for caching permission results
   */
  getCacheKey(): string {
    // Create a unique key based on context data
    const parts = [
      `user:${this.user.id ?? 'anonymous'}`,
      `resource:${this.resource?.type ?? 'none'}:${this.resource?.id ?? 'none'}`,
      `org:${this.organization?.id ?? 'none'}`
    ];
    
    return parts.join(':');
  }
  
  /**
   * Creates a permission context for an anonymous user
   */
  static anonymous(): PermissionContext {
    return new PermissionContextImpl({
      isAuthenticated: false
    });
  }
  
  /**
   * Creates a permission context for an authenticated user
   */
  static forUser(
    userId: Types.ObjectId, 
    permissions: string[] = [], 
    roles: string[] = [], 
    isAdmin: boolean = false
  ): PermissionContext {
    return new PermissionContextImpl({
      id: userId,
      roles,
      permissions,
      isAuthenticated: true,
      isAdmin
    });
  }
  
  /**
   * Creates a permission context for a resource
   */
  static forResource(
    userId: Types.ObjectId,
    resourceType: string,
    resourceId: Types.ObjectId,
    ownerId: Types.ObjectId,
    visibility: string = 'private',
    permissions: string[] = []
  ): PermissionContext {
    return new PermissionContextImpl(
      {
        id: userId,
        permissions,
        isAuthenticated: true
      },
      undefined,
      {
        id: resourceId,
        type: resourceType,
        ownerId,
        visibility
      }
    );
  }
}
