/**
 * User preferences stored in cache
 */
export interface UserPreferences {
  theme?: string;
  language?: string;
  notifications?: Record<string, boolean>;
  [key: string]: any;
}

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
 * Token info stored in cache
 */
export interface TokenInfo {
  userId: string;
  tokenId: string;
  expiresAt: Date;
  scopes?: string[];
  issuedAt: Date;
  clientId?: string;
  refreshToken?: string;
}

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