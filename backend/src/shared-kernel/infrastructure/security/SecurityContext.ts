import { ObjectId } from 'mongodb';
import { ISecurityContext } from '@/types/shared/base-types';
import { UserRole, Permission } from '@/types/shared/enums/common';

/**
 * Client type for different application platforms
 */
export type ClientType = 'web' | 'mobile' | 'api' | 'desktop';

/**
 * Authentication method types
 */
export type AuthenticationMethod = 'password' | 'oauth' | 'sso' | 'biometric' | 'token';

/**
 * Security clearance levels
 */
export type SecurityLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Extended security context with additional metadata
 */
export interface ExtendedSecurityContext extends ISecurityContext {
  readonly deviceId?: string;
  readonly applicationVersion?: string;
  readonly clientType?: ClientType;
  readonly geolocation?: {
    readonly country?: string;
    readonly region?: string;
    readonly city?: string;
    readonly latitude?: number;
    readonly longitude?: number;
  };
  readonly requestMetadata?: Record<string, any>;
  readonly authenticationMethod?: AuthenticationMethod;
  readonly mfaVerified?: boolean;
  readonly lastActivity?: Date;
  readonly securityLevel?: SecurityLevel;
}

/**
 * Security context builder for fluent construction
 */
export class SecurityContextBuilder {
  private userId?: ObjectId;
  private organizationId?: ObjectId;
  private roles: UserRole[] = [];
  private permissions: Permission[] = [];
  private sessionId?: string;
  private ipAddress?: string;
  private userAgent?: string;
  private deviceId?: string;
  private applicationVersion?: string;
  private clientType?: ClientType;
  private geolocation?: {
    readonly country?: string;
    readonly region?: string;
    readonly city?: string;
    readonly latitude?: number;
    readonly longitude?: number;
  };
  private requestMetadata?: Record<string, any>;
  private authenticationMethod?: AuthenticationMethod;
  private mfaVerified?: boolean;
  private lastActivity?: Date;
  private securityLevel?: SecurityLevel;

  withUser(userId: ObjectId): this {
    this.userId = userId;
    return this;
  }

  withOrganization(organizationId: ObjectId): this {
    this.organizationId = organizationId;
    return this;
  }

  withRoles(roles: readonly UserRole[]): this {
    this.roles = [...roles];
    return this;
  }

  withRole(role: UserRole): this {
    if (!this.roles.includes(role)) {
      this.roles.push(role);
    }
    return this;
  }

  withPermissions(permissions: readonly Permission[]): this {
    this.permissions = [...permissions];
    return this;
  }

  withPermission(permission: Permission): this {
    if (!this.permissions.includes(permission)) {
      this.permissions.push(permission);
    }
    return this;
  }

  withSession(sessionId: string): this {
    this.sessionId = sessionId;
    return this;
  }

  withIpAddress(ipAddress: string): this {
    this.ipAddress = ipAddress;
    return this;
  }

  withUserAgent(userAgent: string): this {
    this.userAgent = userAgent;
    return this;
  }

  withDevice(deviceId: string): this {
    this.deviceId = deviceId;
    return this;
  }

  withApplicationVersion(version: string): this {
    this.applicationVersion = version;
    return this;
  }

  withClientType(clientType: ClientType): this {
    this.clientType = clientType;
    return this;
  }

  withGeolocation(geolocation: {
    readonly country?: string;
    readonly region?: string;
    readonly city?: string;
    readonly latitude?: number;
    readonly longitude?: number;
  }): this {
    this.geolocation = geolocation;
    return this;
  }

  withRequestMetadata(metadata: Record<string, any>): this {
    this.requestMetadata = { ...metadata };
    return this;
  }

  withAuthenticationMethod(method: AuthenticationMethod): this {
    this.authenticationMethod = method;
    return this;
  }

  withMfaVerified(verified: boolean): this {
    this.mfaVerified = verified;
    return this;
  }

  withLastActivity(lastActivity: Date): this {
    this.lastActivity = lastActivity;
    return this;
  }

  withSecurityLevel(level: SecurityLevel): this {
    this.securityLevel = level;
    return this;
  }

  build(): SecurityContext {
    return new SecurityContext({
      userId: this.userId,
      organizationId: this.organizationId,
      roles: this.roles,
      permissions: this.permissions,
      sessionId: this.sessionId,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      deviceId: this.deviceId,
      applicationVersion: this.applicationVersion,
      clientType: this.clientType,
      geolocation: this.geolocation,
      requestMetadata: this.requestMetadata,
      authenticationMethod: this.authenticationMethod,
      mfaVerified: this.mfaVerified,
      lastActivity: this.lastActivity,
      securityLevel: this.securityLevel
    });
  }
}

/**
 * Security context implementation
 */
export class SecurityContext implements ExtendedSecurityContext {
  public readonly userId?: ObjectId;
  public readonly organizationId?: ObjectId;
  public readonly roles: readonly UserRole[];
  public readonly permissions: readonly Permission[];
  public readonly sessionId?: string;
  public readonly ipAddress?: string;
  public readonly userAgent?: string;
  public readonly deviceId?: string;
  public readonly applicationVersion?: string;
  public readonly clientType?: ClientType;
  public readonly geolocation?: {
    readonly country?: string;
    readonly region?: string;
    readonly city?: string;
    readonly latitude?: number;
    readonly longitude?: number;
  };
  public readonly requestMetadata?: Record<string, any>;
  public readonly authenticationMethod?: AuthenticationMethod;
  public readonly mfaVerified?: boolean;
  public readonly lastActivity?: Date;
  public readonly securityLevel?: SecurityLevel;

  constructor(data: {
    readonly userId?: ObjectId;
    readonly organizationId?: ObjectId;
    readonly roles?: readonly UserRole[];
    readonly permissions?: readonly Permission[];
    readonly sessionId?: string;
    readonly ipAddress?: string;
    readonly userAgent?: string;
    readonly deviceId?: string;
    readonly applicationVersion?: string;
    readonly clientType?: ClientType;
    readonly geolocation?: {
      readonly country?: string;
      readonly region?: string;
      readonly city?: string;
      readonly latitude?: number;
      readonly longitude?: number;
    };
    readonly requestMetadata?: Record<string, any>;
    readonly authenticationMethod?: AuthenticationMethod;
    readonly mfaVerified?: boolean;
    readonly lastActivity?: Date;
    readonly securityLevel?: SecurityLevel;
  }) {
    this.userId = data.userId;
    this.organizationId = data.organizationId;
    this.roles = Object.freeze([...(data.roles || [])]);
    this.permissions = Object.freeze([...(data.permissions || [])]);
    this.sessionId = data.sessionId;
    this.ipAddress = data.ipAddress;
    this.userAgent = data.userAgent;
    this.deviceId = data.deviceId;
    this.applicationVersion = data.applicationVersion;
    this.clientType = data.clientType;
    this.geolocation = data.geolocation;
    this.requestMetadata = data.requestMetadata;
    this.authenticationMethod = data.authenticationMethod;
    this.mfaVerified = data.mfaVerified;
    this.lastActivity = data.lastActivity;
    this.securityLevel = data.securityLevel;
  }

  /**
   * Checks if the context has a specific role
   */
  hasRole(role: UserRole): boolean {
    return this.roles.includes(role);
  }

  /**
   * Checks if the context has a specific permission
   */
  hasPermission(permission: Permission): boolean {
    return this.permissions.includes(permission);
  }

  /**
   * Checks if the context has any of the specified roles
   */
  hasAnyRole(roles: readonly UserRole[]): boolean {
    return roles.some(role => this.hasRole(role));
  }

  /**
   * Checks if the context has any of the specified permissions
   */
  hasAnyPermission(permissions: readonly Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }

  /**
   * Checks if the context has all of the specified roles
   */
  hasAllRoles(roles: readonly UserRole[]): boolean {
    return roles.every(role => this.hasRole(role));
  }

  /**
   * Checks if the context has all of the specified permissions
   */
  hasAllPermissions(permissions: readonly Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(permission));
  }

  /**
   * Checks if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.userId && !!this.sessionId;
  }

  /**
   * Checks if user belongs to an organization
   */
  hasOrganization(): boolean {
    return !!this.organizationId;
  }

  /**
   * Checks if user is an admin
   */
  isAdmin(): boolean {
    return this.hasAnyRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN]);
  }

  /**
   * Checks if user is a super admin
   */
  isSuperAdmin(): boolean {
    return this.hasRole(UserRole.SUPER_ADMIN);
  }

  /**
   * Checks if user has organization admin privileges
   */
  isOrganizationAdmin(): boolean {
    return this.hasAnyRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN]);
  }

  /**
   * Checks if MFA is verified
   */
  isMfaVerified(): boolean {
    return this.mfaVerified === true;
  }

  /**
   * Gets the security clearance level
   */
  getSecurityLevel(): SecurityLevel {
    return this.securityLevel || 'low';
  }

  /**
   * Checks if the security level meets minimum requirement
   */
  meetsSecurityLevel(requiredLevel: SecurityLevel): boolean {
    const levels = ['low', 'medium', 'high', 'critical'];
    const currentIndex = levels.indexOf(this.getSecurityLevel());
    const requiredIndex = levels.indexOf(requiredLevel);
    return currentIndex >= requiredIndex;
  }

  /**
   * Creates a new context with updated roles
   */
  withUpdatedRoles(roles: readonly UserRole[]): SecurityContext {
    return new SecurityContext({
      ...this.toPlainObject(),
      roles
    });
  }

  /**
   * Creates a new context with updated permissions
   */
  withUpdatedPermissions(permissions: readonly Permission[]): SecurityContext {
    return new SecurityContext({
      ...this.toPlainObject(),
      permissions
    });
  }

  /**
   * Creates a new context with updated metadata
   */
  withUpdatedMetadata(metadata: Record<string, any>): SecurityContext {
    return new SecurityContext({
      ...this.toPlainObject(),
      requestMetadata: { ...this.requestMetadata, ...metadata }
    });
  }

  /**
   * Converts to plain object for serialization
   */
  toPlainObject(): Record<string, any> {
    return {
      userId: this.userId,
      organizationId: this.organizationId,
      roles: this.roles,
      permissions: this.permissions,
      sessionId: this.sessionId,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      deviceId: this.deviceId,
      applicationVersion: this.applicationVersion,
      clientType: this.clientType,
      geolocation: this.geolocation,
      requestMetadata: this.requestMetadata,
      authenticationMethod: this.authenticationMethod,
      mfaVerified: this.mfaVerified,
      lastActivity: this.lastActivity,
      securityLevel: this.securityLevel
    };
  }

  /**
   * Converts to JSON for logging and auditing
   */
  toJSON(): Record<string, any> {
    return {
      userId: this.userId?.toHexString(),
      organizationId: this.organizationId?.toHexString(),
      roles: this.roles,
      permissions: this.permissions,
      sessionId: this.sessionId,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      deviceId: this.deviceId,
      applicationVersion: this.applicationVersion,
      clientType: this.clientType,
      geolocation: this.geolocation,
      authenticationMethod: this.authenticationMethod,
      mfaVerified: this.mfaVerified,
      lastActivity: this.lastActivity?.toISOString(),
      securityLevel: this.securityLevel
    };
  }

  /**
   * Creates a sanitized version for logging (removes sensitive data)
   */
  toSanitizedJSON(): Record<string, any> {
    return {
      userId: this.userId?.toHexString(),
      organizationId: this.organizationId?.toHexString(),
      roles: this.roles,
      permissions: this.permissions,
      sessionId: this.sessionId ? `${this.sessionId.substring(0, 8)}...` : undefined,
      ipAddress: this.ipAddress ? this.maskIpAddress(this.ipAddress) : undefined,
      deviceId: this.deviceId ? `${this.deviceId.substring(0, 8)}...` : undefined,
      applicationVersion: this.applicationVersion,
      clientType: this.clientType,
      authenticationMethod: this.authenticationMethod,
      mfaVerified: this.mfaVerified,
      securityLevel: this.securityLevel
    };
  }

  /**
   * Validates the security context
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation
    if (this.isAuthenticated() && !this.userId) {
      errors.push('Authenticated context must have a user ID');
    }

    if (this.hasOrganization() && !this.organizationId) {
      errors.push('Organization context must have an organization ID');
    }

    // Security level validation
    const validSecurityLevels: SecurityLevel[] = ['low', 'medium', 'high', 'critical'];
    if (this.securityLevel && !validSecurityLevels.includes(this.securityLevel)) {
      errors.push('Invalid security level');
    }

    // Role and permission validation
    if (this.roles.some(role => !Object.values(UserRole).includes(role))) {
      errors.push('Invalid role detected');
    }

    if (this.permissions.some(permission => !Object.values(Permission).includes(permission))) {
      errors.push('Invalid permission detected');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Masks IP address for privacy
   */
  private maskIpAddress(ip: string): string {
    if (ip.includes(':')) {
      // IPv6
      const parts = ip.split(':');
      return `${parts[0]}:${parts[1]}:****:****:****:****:****:****`;
    } else {
      // IPv4
      const parts = ip.split('.');
      return `${parts[0]}.${parts[1]}.***.**`;
    }
  }

  /**
   * Static factory methods
   */
  static anonymous(): SecurityContext {
    return new SecurityContext({
      roles: [],
      permissions: [],
      securityLevel: 'low'
    });
  }

  static system(): SecurityContext {
    return new SecurityContext({
      roles: [UserRole.SUPER_ADMIN],
      permissions: Object.values(Permission),
      securityLevel: 'critical',
      authenticationMethod: 'token'
    });
  }

  static fromToken(tokenPayload: {
    userId?: string;
    organizationId?: string;
    roles?: string[];
    permissions?: string[];
    sessionId?: string;
    [key: string]: any;
  }): SecurityContext {
    return new SecurityContext({
      userId: tokenPayload.userId ? new ObjectId(tokenPayload.userId) : undefined,
      organizationId: tokenPayload.organizationId ? new ObjectId(tokenPayload.organizationId) : undefined,
      roles: (tokenPayload.roles || []) as UserRole[],
      permissions: (tokenPayload.permissions || []) as Permission[],
      sessionId: tokenPayload.sessionId,
      authenticationMethod: 'token'
    });
  }

  static builder(): SecurityContextBuilder {
    return new SecurityContextBuilder();
  }
}