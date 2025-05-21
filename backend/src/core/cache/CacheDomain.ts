/**
 * Defined domains for cache partitioning
 */
export enum CacheDomain {
  /**
   * Authentication-related cache (tokens, sessions)
   */
  AUTH = 'auth',
  
  /**
   * User-related cache (profiles, preferences)
   */
  USER = 'user',
  
  /**
   * Permission-related cache (roles, access control)
   */
  PERMISSION = 'permission',
  
  /**
   * Organization-related cache
   */
  ORGANIZATION = 'organization',
  
  /**
   * API-related cache (responses, rate limiting)
   */
  API = 'api',
  
  /**
   * System-level cache (configuration, constants)
   */
  SYSTEM = 'system',
  
  /**
   * Default domain for general caching
   */
  DEFAULT = 'default'
}