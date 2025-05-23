/**
 * Application environments
 */
export enum Environment {
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  STAGING = 'staging',
  PRODUCTION = 'production'
}

/**
 * Logging levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * Application contexts representing different bounded contexts
 */
export enum ApplicationContext {
  USER = 'user',
  ORGANIZATION = 'organization',
  AUTHENTICATION = 'authentication',
  IDENTITY = 'identity',
  WORKOUT = 'workout',
  EXERCISE = 'exercise',
  PROGRAM = 'program',
  PROGRESSION = 'progression',
  TRAINER = 'trainer',
  NOTIFICATION = 'notification',
  MEDICAL = 'medical',
  ANALYTICS = 'analytics',
  AUDIT = 'audit'
}

/**
 * User roles within the system
 */
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  ORGANIZATION_ADMIN = 'organization_admin',
  TRAINER = 'trainer',
  CLIENT = 'client',
  VIEWER = 'viewer'
}

/**
 * Permission types for authorization
 */
export enum Permission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  ADMIN = 'admin',
  EXECUTE = 'execute',
  APPROVE = 'approve',
  PUBLISH = 'publish'
}

/**
 * Entity status enumeration
 */
export enum EntityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

/**
 * Subscription status for organizations and users
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TRIAL = 'trial',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  PAST_DUE = 'past_due',
  SUSPENDED = 'suspended'
}

/**
 * Payment status enumeration
 */
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded'
}

/**
 * Notification types
 */
export enum NotificationType {
  EMAIL = 'email',
  PUSH = 'push',
  SMS = 'sms',
  IN_APP = 'in_app',
  WEBHOOK = 'webhook'
}

/**
 * Notification priority levels
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical'
}

/**
 * Data classification levels for security and compliance
 */
export enum DataClassification {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
  TOP_SECRET = 'top_secret'
}

/**
 * Compliance frameworks
 */
export enum ComplianceFramework {
  GDPR = 'gdpr',
  HIPAA = 'hipaa',
  SOX = 'sox',
  ISO27001 = 'iso27001',
  SOC2 = 'soc2',
  PCI_DSS = 'pci_dss'
}

/**
 * Audit event types
 */
export enum AuditEventType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  ACCESS_GRANTED = 'access_granted',
  ACCESS_DENIED = 'access_denied',
  DATA_CREATED = 'data_created',
  DATA_UPDATED = 'data_updated',
  DATA_DELETED = 'data_deleted',
  DATA_VIEWED = 'data_viewed',
  PERMISSION_CHANGED = 'permission_changed',
  SETTINGS_CHANGED = 'settings_changed',
  SECURITY_VIOLATION = 'security_violation',
  SYSTEM_ERROR = 'system_error'
}

/**
 * Integration event types for cross-context communication
 */
export enum IntegrationEventType {
  USER_REGISTERED = 'user_registered',
  USER_UPDATED = 'user_updated',
  USER_DEACTIVATED = 'user_deactivated',
  ORGANIZATION_CREATED = 'organization_created',
  WORKOUT_COMPLETED = 'workout_completed',
  GOAL_ACHIEVED = 'goal_achieved',
  PROGRESS_RECORDED = 'progress_recorded',
  SESSION_COMPLETED = 'session_completed',
  PAYMENT_PROCESSED = 'payment_processed',
  MEDICAL_CLEARANCE_ISSUED = 'medical_clearance_issued'
}

/**
 * Cache invalidation strategies
 */
export enum CacheStrategy {
  WRITE_THROUGH = 'write_through',
  WRITE_BEHIND = 'write_behind',
  WRITE_AROUND = 'write_around',
  REFRESH_AHEAD = 'refresh_ahead',
  TTL_BASED = 'ttl_based'
}

/**
 * Message queue priorities
 */
export enum QueuePriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  URGENT = 15,
  CRITICAL = 20
}

/**
 * Event sourcing event types
 */
export enum EventType {
  COMMAND = 'command',
  DOMAIN_EVENT = 'domain_event',
  INTEGRATION_EVENT = 'integration_event',
  SYSTEM_EVENT = 'system_event'
}

/**
 * Read model projection status
 */
export enum ProjectionStatus {
  ACTIVE = 'active',
  REBUILDING = 'rebuilding',
  PAUSED = 'paused',
  ERROR = 'error',
  OUTDATED = 'outdated'
}

/**
 * Plugin status enumeration
 */
export enum PluginStatus {
  AVAILABLE = 'available',
  INSTALLED = 'installed',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  UPDATING = 'updating',
  UNINSTALLING = 'uninstalling'
}

/**
 * Security threat levels
 */
export enum ThreatLevel {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * File upload status
 */
export enum UploadStatus {
  PENDING = 'pending',
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  VIRUS_DETECTED = 'virus_detected',
  REJECTED = 'rejected'
}

/**
 * Task or job status
 */
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying',
  TIMEOUT = 'timeout'
}

/**
 * API rate limiting strategies
 */
export enum RateLimitStrategy {
  FIXED_WINDOW = 'fixed_window',
  SLIDING_WINDOW = 'sliding_window',
  TOKEN_BUCKET = 'token_bucket',
  LEAKY_BUCKET = 'leaky_bucket'
}

/**
 * Content moderation status
 */
export enum ModerationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FLAGGED = 'flagged',
  UNDER_REVIEW = 'under_review',
  AUTO_APPROVED = 'auto_approved',
  AUTO_REJECTED = 'auto_rejected'
}