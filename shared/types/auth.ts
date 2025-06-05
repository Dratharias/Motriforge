export interface User {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly dateOfBirth?: Date;
  readonly notes?: string;
  readonly visibilityId: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lastLogin?: Date;
  readonly isActive: boolean;
}

export interface UserCredentials {
  readonly email: string;
  readonly password: string;
}

export interface UserRegistration {
  readonly email: string;
  readonly password: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly dateOfBirth?: Date;
  readonly notes?: string;
}

export interface AuthResult {
  readonly success: boolean;
  readonly user?: User;
  readonly tokens?: TokenPair;
  readonly error?: string;
}

export interface TokenPair {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
}

export interface TokenPayload {
  readonly sub: string;
  readonly email: string;
  readonly roles: string[];
  readonly permissions: string[];
  readonly iat: number;
  readonly exp: number;
  readonly jti: string;
}

export interface RefreshTokenPayload {
  readonly sub: string;
  readonly jti: string;
  readonly iat: number;
  readonly exp: number;
}

export interface Session {
  readonly id: string;
  readonly userId: string;
  readonly refreshTokenId: string;
  readonly userAgent?: string;
  readonly ipAddress?: string;
  readonly createdAt: Date;
  readonly lastActiveAt: Date;
  readonly expiresAt: Date;
  readonly isActive: boolean;
}

export interface Role {
  readonly id: string;
  readonly name: string;
  readonly displayName: string;
  readonly description?: string;
  readonly level: number;
  readonly isActive: boolean;
}

export interface Permission {
  readonly id: string;
  readonly name: string;
  readonly displayName: string;
  readonly description?: string;
  readonly resource: string;
  readonly action: string;
  readonly isActive: boolean;
}

export interface UserRole {
  readonly userId: string;
  readonly roleId: string;
  readonly scopeId?: string;
  readonly scopeType?: string;
  readonly assignedBy: string;
  readonly assignedAt: Date;
  readonly expiresAt?: Date;
  readonly isActive: boolean;
}

export interface UserPermission {
  readonly userId: string;
  readonly permissionId: string;
  readonly scopeId?: string;
  readonly scopeType?: string;
  readonly grantedBy: string;
  readonly grantedAt: Date;
  readonly expiresAt?: Date;
  readonly isActive: boolean;
}

export interface AuthorizationContext {
  readonly userId: string;
  readonly resource: string;
  readonly action: string;
  readonly scopeId?: string;
  readonly scopeType?: string;
}

export interface AuthzResult {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly matchedPermissions: Permission[];
}

export interface RateLimitConfig {
  readonly windowMs: number;
  readonly maxRequests: number;
  readonly skipSuccessfulRequests?: boolean;
  readonly skipFailedRequests?: boolean;
}

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly resetTime: Date;
  readonly retryAfter?: number;
}

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: string[];
}

export interface PasswordResetToken {
  readonly id: string;
  readonly userId: string;
  readonly token: string;
  readonly requestedAt: Date;
  readonly expiresAt: Date;
  readonly isUsed: boolean;
}