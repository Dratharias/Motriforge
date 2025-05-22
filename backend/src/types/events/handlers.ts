import { Event as DomainEvent } from "@/core/events/models/Event";

/**
 * Interface for event handlers that can process events
 */
export interface EventHandler<T = any> {
  /**
   * Handle an event
   * 
   * @param event The event to handle
   * @returns A promise if async processing, void if sync
   */
  handleEvent(event: DomainEvent): void | Promise<void>;
}

/**
 * Configuration for the audit event handler
 */
export interface AuditEventHandlerConfig {
  alwaysAuditEventTypes: string[];
  neverAuditEventTypes: string[];
  auditAllAuthEvents: boolean;
  auditSensitiveDataOperations: boolean;
  includePayloads: boolean;
  maxPayloadSize: number;
  sensitiveFields: string[];
}

/**
 * Audit record entry structure
 */
export interface AuditRecord {
  id: string;
  timestamp: Date;
  eventType: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  result: 'success' | 'failure';
  context?: Record<string, any>;
  payload?: any;
  correlationId?: string;
}

/**
 * Interface for the audit logger service
 */
export interface AuditLogger {
  /**
   * Log an audit record
   * 
   * @param record The audit record to log
   */
  log(record: AuditRecord): Promise<void>;
  
  /**
   * Log multiple audit records in batch
   * 
   * @param records The audit records to log
   */
  logBatch(records: AuditRecord[]): Promise<void>;
}

/**
 * Cache invalidation pattern defining how to invalidate cache entries
 * when certain events occur
 */
export interface InvalidationPattern {
  domain: string;
  keyPattern: string;
  eventTypes: string[];
  condition?: (event: DomainEvent) => boolean;
  priority: number;
  cascade?: boolean;
  dependencies?: string[];
}

/**
 * Notification data structure
 */
export interface NotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
  scheduledFor: Date;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  data?: Record<string, any>;
  action?: {
    url?: string;
    type?: string;
    data?: Record<string, any>;
  };
  category?: string;
  ttl?: number;
  media?: Array<{
    type: string;
    url: string;
    alt?: string;
  }>;
}

/**
 * Configuration for notification mappings from events to notifications
 */
export interface NotificationMapping {
  eventType: string;
  notificationTypes: string[];
  forRole?: string;
  titleTemplate: string;
  messageTemplate: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category?: string;
  actionTemplate?: string;
  condition?: (event: DomainEvent) => boolean;
}

/**
 * Interface for the notification service
 */
export interface NotificationService {
  /**
   * Send a notification
   * 
   * @param notification The notification to send
   */
  sendNotification(notification: NotificationData): Promise<void>;
  
  /**
   * Schedule a notification for later delivery
   * 
   * @param notification The notification to schedule
   */
  scheduleNotification(notification: NotificationData): Promise<void>;
  
  /**
   * Cancel a scheduled notification
   * 
   * @param userId ID of the user
   * @param category Category of notifications to cancel
   */
  cancelNotification(userId: string, category: string): Promise<void>;
  
  /**
   * Send a batch of notifications
   * 
   * @param notifications The notifications to send
   */
  sendBatchNotifications(notifications: NotificationData[]): Promise<void>;
}