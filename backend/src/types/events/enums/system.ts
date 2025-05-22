/**
 * Severity levels for system events
 */
export enum SeverityLevel {
  DEBUG = 'debug',
  INFO = 'info',
  NOTICE = 'notice',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
  ALERT = 'alert',
  EMERGENCY = 'emergency'
}

/**
 * System component types
 */
export enum SystemComponent {
  API = 'api',
  DATABASE = 'database',
  CACHE = 'cache',
  AUTH = 'auth',
  QUEUE = 'queue',
  SCHEDULER = 'scheduler',
  FILE_STORAGE = 'file-storage',
  SEARCH = 'search',
  NOTIFICATION = 'notification',
  WORKER = 'worker',
  MONITORING = 'monitoring',
  CONFIG = 'config'
}

