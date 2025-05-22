import { LoggerFacade } from "@/core/logging";
import { EventHandler, AuditLogger, AuditEventHandlerConfig, AuditRecord } from "@/types/events";
import { AuthEvent } from "../models/AuthEvent";
import { DomainEvent } from "../models/DomainEvent";
import { Event } from "../models/Event";

/**
 * Handles audit logging based on system events
 */
export class AuditEventHandler implements EventHandler {
  private readonly auditLogger: AuditLogger;
  
  /* TODO: Change type upon implementation */
  private readonly userService: any;

  private readonly logger: LoggerFacade;
  private readonly config: AuditEventHandlerConfig;
  private readonly pendingRecords: AuditRecord[] = [];
  private batchTimer: NodeJS.Timeout | null = null;

  /**
   * Create a new AuditEventHandler
   * 
   * @param auditLogger Audit logger instance
   * @param userService User service instance
   * @param logger Logger instance
   * @param config Configuration options
   */
  constructor(
    auditLogger: AuditLogger,
    userService: any,
    logger: LoggerFacade,
    config?: Partial<AuditEventHandlerConfig>
  ) {
    this.auditLogger = auditLogger;
    this.userService = userService;
    this.logger = logger.withComponent('AuditEventHandler');
    
    // Default configuration
    this.config = {
      alwaysAuditEventTypes: [
        'auth.login',
        'auth.logout',
        'auth.password.changed',
        'auth.password.reset',
        'user.created',
        'user.deleted',
        'organization.created',
        'organization.deleted',
        'permission.granted',
        'permission.revoked',
        'role.changed',
        'system.config.changed'
      ],
      neverAuditEventTypes: [
        'cache.*',
        'metrics.*',
        'system.heartbeat'
      ],
      auditAllAuthEvents: true,
      auditSensitiveDataOperations: true,
      includePayloads: true,
      maxPayloadSize: 10 * 1024, // 10 KB
      sensitiveFields: [
        'password',
        'passwordHash',
        'token',
        'refreshToken',
        'secret',
        'key',
        'creditCard',
        'ssn',
        'socialSecurity'
      ],
      ...config
    };
    
    // Start batch processing
    this.startBatchProcessing();
  }

  /**
   * Handle an event by creating audit records when needed
   * 
   * @param event The event to handle
   */
  public async handleEvent(event: Event): Promise<void> {
    try {
      // Check if this event should be audited
      if (!this.shouldAudit(event)) {
        return;
      }
      
      // Create audit record from event
      const auditRecord = await this.createAuditRecord(event);
      
      // Add to pending batch
      this.addToBatch(auditRecord);
    } catch (error) {
      this.logger.error(`Error handling audit for event: ${event.type}`, error as Error, {
        eventId: event.id,
        eventType: event.type
      });
      
      // Don't rethrow - audit logging shouldn't block other event handlers
    }
  }

  /**
   * Determine if an event should be audited
   * 
   * @param event The event to check
   * @returns True if the event should be audited
   */
  private shouldAudit(event: Event): boolean {
    const eventType = event.type;
    
    // Check never audit list
    for (const pattern of this.config.neverAuditEventTypes) {
      if (this.matchesPattern(eventType, pattern)) {
        return false;
      }
    }
    
    // Check always audit list
    for (const pattern of this.config.alwaysAuditEventTypes) {
      if (this.matchesPattern(eventType, pattern)) {
        return true;
      }
    }
    
    // Audit all auth events if configured
    if (this.config.auditAllAuthEvents && eventType.startsWith('auth.')) {
      return true;
    }
    
    // Audit sensitive data operations if configured
    if (this.config.auditSensitiveDataOperations) {
      if (
        eventType.includes('.deleted') ||
        eventType.includes('.sensitive') ||
        eventType.includes('.permission') ||
        eventType.includes('.role')
      ) {
        return true;
      }
    }
    
    // Default: don't audit
    return false;
  }

  /**
   * Check if an event type matches a pattern
   * 
   * @param eventType The event type to check
   * @param pattern The pattern to match against
   * @returns True if the event type matches the pattern
   */
  private matchesPattern(eventType: string, pattern: string): boolean {
    // Exact match
    if (pattern === eventType) {
      return true;
    }
    
    // Wildcard pattern (e.g., "auth.*")
    if (pattern.endsWith('.*') && eventType.startsWith(pattern.slice(0, -1))) {
      return true;
    }
    
    return false;
  }

  /**
   * Create an audit record from an event
   * 
   * @param event The event to create a record from
   * @returns The created audit record
   */
  private async createAuditRecord(event: Event): Promise<AuditRecord> {
    const record: AuditRecord = {
      id: crypto.randomUUID(),
      timestamp: event.timestamp,
      eventType: event.type,
      action: this.getActionFromEvent(event),
      result: 'success', // Assume success unless specified otherwise
      correlationId: event.correlationId
    };
    
    // Extract entity info for domain events
    if (event instanceof DomainEvent) {
      record.entityType = event.entityType;
      record.entityId = event.entityId;
      record.userId = event.userId;
    }
    
    // Extract additional context
    if (event.context) {
      record.userId = record.userId ?? event.context.userId;
      record.ipAddress = event.context.ipAddress;
      record.userAgent = event.context.userAgent;
      
      // Add custom context if present
      if (event.context.custom && Object.keys(event.context.custom).length > 0) {
        record.context = { ...event.context.custom };
      }
    }
    
    // For auth events, extract the result
    if (event instanceof AuthEvent && event.authMetadata) {
      record.result = event.authMetadata.success ? 'success' : 'failure';
      
      if (event.authMetadata.error) {
        record.context = {
          ...record.context,
          error: event.authMetadata.error
        };
      }
    }
    
    // Include payload if configured
    if (this.config.includePayloads && event.payload) {
      record.payload = this.sanitizePayload(event.payload);
    }
    
    // Enrich with additional user info if needed
    await this.enrichAuditData(record);
    
    return record;
  }

  /**
   * Extract the action from an event
   * 
   * @param event The event to extract from
   * @returns The extracted action
   */
  private getActionFromEvent(event: Event): string {
    // For domain events, use the action property
    if (event instanceof DomainEvent) {
      return event.action;
    }
    
    // Otherwise, extract from event type
    const parts = event.type.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : parts[0];
  }

  /**
   * Sanitize an event payload to remove sensitive information
   * 
   * @param payload The payload to sanitize
   * @returns The sanitized payload
   */
  private sanitizePayload(payload: any): any {
    if (!payload || typeof payload !== 'object') {
      return payload;
    }
    
    // Check payload size
    const payloadSize = JSON.stringify(payload).length;
    if (payloadSize > this.config.maxPayloadSize) {
      return {
        _note: `Payload too large (${payloadSize} bytes)`,
        _size: payloadSize
      };
    }
    
    // Create a deep copy to avoid modifying the original
    const sanitized = JSON.parse(JSON.stringify(payload));
    
    // Recursively sanitize object properties
    this.redactSensitiveFields(sanitized, this.config.sensitiveFields);
    
    return sanitized;
  }

  /**
   * Redact sensitive fields from an object
   * 
   * @param obj The object to redact fields from
   * @param sensitiveFields List of sensitive field names
   */
  private redactSensitiveFields(obj: any, sensitiveFields: string[]): void {
    if (!obj || typeof obj !== 'object') {
      return;
    }
    
    if (Array.isArray(obj)) {
      for (const item of obj) {
        this.redactSensitiveFields(item, sensitiveFields);
      }
      return;
    }
    
    for (const [key, value] of Object.entries(obj)) {
      // Check if this is a sensitive field
      const isSensitive = sensitiveFields.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      );
      
      if (isSensitive) {
        obj[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        // Recurse into nested objects
        this.redactSensitiveFields(value, sensitiveFields);
      }
    }
  }

  /**
   * Enrich audit data with additional information
   * 
   * @param record The audit record to enrich
   */
  private async enrichAuditData(record: AuditRecord): Promise<void> {
    // If we have a user ID but no additional user info, fetch it
    if (record.userId && !record.context?.userName) {
      try {
        const user = await this.userService.getUserBasicInfo(record.userId);
        if (user) {
          record.context = {
            ...record.context,
            userName: user.name ?? `${user.firstName} ${user.lastName}`.trim(),
            userEmail: user.email
          };
        }
      } catch (error) {
        this.logger.debug(`Could not fetch user info for audit record: ${record.id}`, {
          userId: record.userId,
          error: (error as Error).message
        });
      }
    }
  }

  /**
   * Add an audit record to the pending batch
   * 
   * @param record The record to add
   */
  private addToBatch(record: AuditRecord): void {
    this.pendingRecords.push(record);
    
    // Process immediately if batch is large enough
    if (this.pendingRecords.length >= 100) {
      this.processBatch();
    }
  }

  /**
   * Start batch processing timer
   */
  private startBatchProcessing(): void {
    // Process pending records every 5 seconds
    this.batchTimer = setInterval(() => {
      this.processBatch();
    }, 5000);
  }

  /**
   * Process pending audit records
   */
  private async processBatch(): Promise<void> {
    if (this.pendingRecords.length === 0) {
      return;
    }
    
    const records = [...this.pendingRecords];
    this.pendingRecords.length = 0;
    
    try {
      await this.auditLogger.logBatch(records);
      
      this.logger.debug(`Processed ${records.length} audit records`);
    } catch (error) {
      this.logger.error(`Failed to process audit records`, error as Error, {
        recordCount: records.length
      });
      
      // Put records back in queue
      this.pendingRecords.push(...records);
    }
  }

  /**
   * Stop batch processing and clean up
   */
  public dispose(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    
    // Process any remaining records
    this.processBatch().catch(error => {
      this.logger.error(`Error processing final audit batch`, error as Error);
    });
  }
}