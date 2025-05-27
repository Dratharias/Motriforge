/**
 * User roles within the fitness application
 */
export enum Role {
  ADMIN = 'ADMIN',
  TRAINER = 'TRAINER', 
  CLIENT = 'CLIENT',
  MANAGER = 'MANAGER',
  GUEST = 'GUEST'
}

/**
 * General status for entities in the system
 */
export enum Status {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
  ARCHIVED = 'ARCHIVED'
}

/**
 * Available actions that can be performed on resources
 */
export enum Action {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  SHARE = 'SHARE',
  ACCESS = 'ACCESS',
  EXPORT = 'EXPORT',
  ASSIGN = 'ASSIGN'
}

/**
 * Types of resources in the fitness domain
 */
export enum ResourceType {
  EXERCISE = 'EXERCISE',
  WORKOUT = 'WORKOUT',
  PROGRAM = 'PROGRAM',
  PROFILE = 'PROFILE',
  DASHBOARD = 'DASHBOARD',
  PROGRESS = 'PROGRESS',
  ACTIVITY = 'ACTIVITY',
  NUTRITION = 'NUTRITION',
  SCHEDULE = 'SCHEDULE'
}

/**
 * Severity levels for logging and error handling
 */
export enum Severity {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

/**
 * Types of events that can occur in the system
 */
export enum EventType {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  SYSTEM = 'SYSTEM',
  ACCESS = 'ACCESS',
  USER_ACTION = 'USER_ACTION',
  SECURITY = 'SECURITY',
  AUDIT = 'AUDIT'
}

/**
 * Categories of errors that can occur
 */
export enum ErrorType {
  MIDDLEWARE = 'MIDDLEWARE',
  EVENT = 'EVENT',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  DATABASE = 'DATABASE',
  NETWORK = 'NETWORK',
  GENERIC = 'GENERIC'
}