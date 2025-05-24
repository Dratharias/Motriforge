/**
 * Middleware category enumeration
 */
export enum MiddlewareCategory {
  SECURITY = 'security',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  LOGGING = 'logging',
  MONITORING = 'monitoring',
  CACHING = 'caching',
  RATE_LIMITING = 'rate_limiting',
  TRANSFORMATION = 'transformation',
  INTEGRATION = 'integration',
  CUSTOM = 'custom'
}

/**
 * Registry event types
 */
export enum RegistryEventType {
  MIDDLEWARE_REGISTERED = 'middleware_registered',
  MIDDLEWARE_UNREGISTERED = 'middleware_unregistered',
  MIDDLEWARE_UPDATED = 'middleware_updated',
  MIDDLEWARE_ENABLED = 'middleware_enabled',
  MIDDLEWARE_DISABLED = 'middleware_disabled',
  HEALTH_CHECK_COMPLETED = 'health_check_completed'
}


/**
 * Validation error types for middleware registry
 */
export enum ValidationErrorType {
  INVALID_NAME = 'INVALID_NAME',
  DUPLICATE_NAME = 'DUPLICATE_NAME',
  MISSING_DEPENDENCY = 'MISSING_DEPENDENCY',
  CIRCULAR_DEPENDENCY = 'CIRCULAR_DEPENDENCY',
  PRIORITY_CONFLICT = 'PRIORITY_CONFLICT',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  PERFORMANCE_CONCERN = 'PERFORMANCE_CONCERN'
}