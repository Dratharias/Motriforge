import { Database } from '~/database/connection';
import { EventBus, ObservabilityEvent, EventHandler } from '~/shared/event-bus/event-bus';
import { auditLog } from '~/database/schema';
import { createId } from '@paralleldrive/cuid2';
import { eq, and, gte, lte } from 'drizzle-orm';

// =====================================
// TYPES ALIGNED WITH ACTUAL SCHEMA
// =====================================

export interface AuditRequest {
  entityType: string;
  entityId: string;
  action: string;
  oldValues?: Record<string, any> | undefined;
  newValues?: Record<string, any> | undefined;
  reason?: string | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  createdBy: string;
  // Additional context for internal use (not stored)
  userId?: string | undefined;
  sessionId?: string | undefined;
  traceId?: string | undefined;
}

export interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
}

export type AuditType = 'security' | 'compliance' | 'data_access' | 'permission' | 'financial' | 'user_action';

// =====================================
// AUDIT CONFIGURATION
// =====================================

export interface AuditConfig {
  enableRiskAssessment: boolean;
  riskThresholds: {
    low: number;
    medium: number;
    high: number;
  };
  retentionYears: number;
  complianceRules: {
    gdpr: boolean;
    hipaa: boolean;
  };
  enableRealTimeAlerts: boolean;
}

// =====================================
// HELPER CLASSES
// =====================================

class RiskCalculator {
  private static readonly RISK_FACTORS = {
    action: {
      'delete': 25,
      'update': 15,
      'create': 10,
      'read': 5,
      'login': 10,
      'logout': 5
    } as Record<string, number>,
    entityType: {
      'payment_method': 30,
      'user_data': 25,
      'subscription': 20,
      'user_session': 15,
      'workout_data': 10
    } as Record<string, number>
  };

  static calculateRiskScore(request: AuditRequest): number {
    let score = 0;

    // Action-based risk
    const actionName = request.action.includes('-') 
      ? request.action.split('-').pop() ?? request.action
      : request.action;
    score += this.RISK_FACTORS.action[actionName] ?? 5;

    // Entity type risk
    score += this.RISK_FACTORS.entityType[request.entityType] ?? 5;

    // IP-based risk
    if (request.ipAddress && !this.isPrivateIP(request.ipAddress)) {
      score += 15;
    }

    // State change risk
    if (request.oldValues && request.newValues) {
      score += 10; // Modification adds risk
    } else if (request.oldValues && !request.newValues) {
      score += 20; // Deletion adds more risk
    }

    return Math.min(score, 100);
  }

  private static isPrivateIP(ip: string): boolean {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2\d|3[0-1])\./,
      /^192\.168\./,
      /^127\./
    ];
    return privateRanges.some(range => range.test(ip));
  }
}

class AuditEventBuilder {
  static buildFromRequest(request: AuditRequest, auditEntry: AuditEntry): ObservabilityEvent {
    // Determine audit type from context
    const auditType = this.determineAuditType(request);
    const riskScore = RiskCalculator.calculateRiskScore(request);

    // Extract severity level from riskScore
    let severityLevel: string;
    if (riskScore > 70) {
      severityLevel = 'high';
    } else if (riskScore > 30) {
      severityLevel = 'medium';
    } else {
      severityLevel = 'low';
    }

    return {
      id: createId(),
      type: 'observability.audit',
      pattern: `audit.${auditType}.${request.entityType}.${request.action}`,
      payload: {
        auditId: auditEntry.id,
        auditType,
        entityType: request.entityType,
        entityId: request.entityId,
        action: request.action,
        userId: request.userId,
        riskScore,
        reason: request.reason
      },
      metadata: {
        timestamp: new Date(),
        correlationId: request.traceId ?? createId(),
        source: 'audit-service',
        severity: {
          type: 'audit',
          level: severityLevel
        }
      }
    };
  }

  private static determineAuditType(request: AuditRequest): AuditType {
    const { entityType, action } = request;

    // Security-related
    if (entityType.includes('session') || action.includes('login') || action.includes('auth')) {
      return 'security';
    }

    // Financial
    if (entityType.includes('payment') || entityType.includes('subscription') || entityType.includes('billing')) {
      return 'financial';
    }

    // Compliance
    if (action.includes('delete') && entityType.includes('user')) {
      return 'compliance';
    }

    // Data access
    if (action === 'read' || action === 'view') {
      return 'data_access';
    }

    // Permission changes
    if (entityType.includes('permission') || entityType.includes('role')) {
      return 'permission';
    }

    return 'user_action';
  }
}

// =====================================
// MAIN AUDIT SERVICE
// =====================================

export class AuditService implements EventHandler {
  public readonly name = 'audit-service';

  constructor(
    private readonly db: Database,
    private readonly eventBus: EventBus,
    private readonly config: AuditConfig
  ) {
    this.setupEventHandlers();
  }

  // =====================================
  // CONVENIENCE METHODS
  // =====================================

  async auditSecurity(request: Omit<AuditRequest, 'action'> & { action?: string }): Promise<AuditEntry> {
    return this.audit({
      ...request,
      action: request.action ?? 'security_event',
      reason: request.reason ?? 'Security-related audit event'
    });
  }

  async auditCompliance(request: Omit<AuditRequest, 'action'> & { action?: string }): Promise<AuditEntry> {
    return this.audit({
      ...request,
      action: request.action ?? 'compliance_event',
      reason: request.reason ?? 'Compliance-related audit event'
    });
  }

  async auditFinancial(request: Omit<AuditRequest, 'action'> & { action?: string }): Promise<AuditEntry> {
    return this.audit({
      ...request,
      action: request.action ?? 'financial_event',
      reason: request.reason ?? 'Financial-related audit event'
    });
  }

  async auditDataAccess(request: Omit<AuditRequest, 'action'> & { action?: string }): Promise<AuditEntry> {
    return this.audit({
      ...request,
      action: request.action ?? 'data_access',
      reason: request.reason ?? 'Data access audit event'
    });
  }

  async auditPermission(request: Omit<AuditRequest, 'action'> & { action?: string }): Promise<AuditEntry> {
    return this.audit({
      ...request,
      action: request.action ?? 'permission_change',
      reason: request.reason ?? 'Permission-related audit event'
    });
  }

  async auditUserAction(request: Omit<AuditRequest, 'action'> & { action?: string }): Promise<AuditEntry> {
    return this.audit({
      ...request,
      action: request.action ?? 'user_action',
      reason: request.reason ?? 'User action audit event'
    });
  }

  // =====================================
  // CORE AUDIT METHOD
  // =====================================

  async audit(request: AuditRequest): Promise<AuditEntry> {
    try {
      // Create audit entry data matching the actual schema
      const auditEntryData = {
        id: createId(),
        entityType: request.entityType,
        entityId: request.entityId,
        action: request.action,
        oldValues: request.oldValues ?? null,
        newValues: request.newValues ?? null,
        reason: request.reason ?? null,
        ipAddress: request.ipAddress ?? null,
        userAgent: request.userAgent ?? null,
        createdBy: request.createdBy,
        createdAt: new Date(),
        isActive: true
      };

      await this.db.insert(auditLog).values(auditEntryData);

      // Create return object
      const auditEntry: AuditEntry = {
        id: auditEntryData.id,
        entityType: auditEntryData.entityType,
        entityId: auditEntryData.entityId,
        action: auditEntryData.action,
        oldValues: request.oldValues ?? null,
        newValues: request.newValues ?? null,
        reason: request.reason ?? null,
        ipAddress: request.ipAddress ?? null,
        userAgent: request.userAgent ?? null,
        createdBy: auditEntryData.createdBy,
        createdAt: auditEntryData.createdAt,
        isActive: auditEntryData.isActive
      };

      // Publish audit event
      const auditEvent = AuditEventBuilder.buildFromRequest(request, auditEntry);
      await this.eventBus.publish(auditEvent);

      return auditEntry;
    } catch (error) {
      console.error('Audit creation failed:', error);
      throw error;
    }
  }

  // =====================================
  // SEARCH AND QUERY METHODS
  // =====================================

  async searchAuditEntries(filters: {
    entityType?: string | undefined;
    action?: string | undefined;
    startDate?: Date | undefined;
    endDate?: Date | undefined;
    createdBy?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }) {
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    // Build query conditions
    const conditions = [];
    
    if (filters.entityType) {
      conditions.push(eq(auditLog.entityType, filters.entityType));
    }
    
    if (filters.action) {
      conditions.push(eq(auditLog.action, filters.action));
    }

    if (filters.createdBy) {
      conditions.push(eq(auditLog.createdBy, filters.createdBy));
    }

    if (filters.startDate) {
      conditions.push(gte(auditLog.createdAt, filters.startDate));
    }

    if (filters.endDate) {
      conditions.push(lte(auditLog.createdAt, filters.endDate));
    }

    // Add active filter
    conditions.push(eq(auditLog.isActive, true));

    // Build and execute query
    const queryBuilder = this.db.select().from(auditLog);
    
    const results = await queryBuilder
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(limit)
      .offset(offset)
      .orderBy(auditLog.createdAt);

    return {
      results: results.map(row => ({
        id: row.id,
        entityType: row.entityType,
        entityId: row.entityId,
        action: row.action,
        oldValues: row.oldValues,
        newValues: row.newValues,
        reason: row.reason,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        createdBy: row.createdBy,
        createdAt: row.createdAt,
        isActive: row.isActive
      })),
      total: results.length,
      hasMore: results.length === limit
    };
  }

  // =====================================
  // EVENT HANDLER IMPLEMENTATION
  // =====================================

  canHandle(eventType: string, pattern: string): boolean {
    return this.shouldAuditEvent({ type: eventType, pattern } as ObservabilityEvent);
  }

  async handle(event: ObservabilityEvent): Promise<void> {
    if (!this.shouldAuditEvent(event)) return;

    try {
      await this.audit({
        entityType: event.payload?.entityType ?? 'system_event',
        entityId: event.payload?.entityId ?? event.id,
        action: event.type,
        oldValues: event.payload?.oldValues,
        newValues: event.payload?.newValues,
        reason: `Automated audit from ${event.type}`,
        createdBy: 'audit-service',
        userId: event.payload?.userId,
        traceId: event.metadata?.correlationId
      });
    } catch (error) {
      console.error('Auto-audit failed for event:', event.id, error);
    }
  }

  private shouldAuditEvent(event: ObservabilityEvent): boolean {
    // Audit security-related events
    if (event.pattern?.includes('security') || event.pattern?.includes('login')) {
      return true;
    }

    // Audit financial events
    if (event.pattern?.includes('payment') || event.pattern?.includes('financial')) {
      return true;
    }

    // Audit data modification events
    if (event.pattern?.includes('delete') || event.pattern?.includes('modify')) {
      return true;
    }

    // Audit high-severity events
    if (event.metadata?.severity?.level === 'high' || event.metadata?.severity?.level === 'critical') {
      return true;
    }

    return false;
  }

  // =====================================
  // SETUP AND LIFECYCLE
  // =====================================

  private setupEventHandlers(): void {
    this.eventBus.registerHandler('observability.log', this);
    this.eventBus.registerHandler('observability.error', this);
    this.eventBus.registerHandler('user.login', this);
    this.eventBus.registerHandler('user.logout', this);
    this.eventBus.registerHandler('payment.process', this);
    this.eventBus.registerHandler('subscription.change', this);
  }

  async shutdown(): Promise<void> {
    console.log('AuditService shutdown complete');
  }
}