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

/**
 * Possible auth actions
 */
export enum AuthAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  REGISTER = 'register',
  PASSWORD_RESET = 'password.reset',
  PASSWORD_CHANGE = 'password.changed',
  MFA_ENABLED = 'mfa.enabled',
  MFA_DISABLED = 'mfa.disabled',
  MFA_CHALLENGE = 'mfa.challenge',
  TOKEN_REFRESH = 'token.refresh',
  TOKEN_REVOKED = 'token.revoked',
  FAILED_ATTEMPT = 'failed.attempt',
  ACCOUNT_LOCKED = 'account.locked',
  ACCOUNT_UNLOCKED = 'account.unlocked'
}