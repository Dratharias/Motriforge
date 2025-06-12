import { Database } from '~/database/connection';
import { eventLog } from '~/database/schema';
import { BaseRepository, RepositoryOptions } from '../base-repository';
import { eq, and, desc, between, asc } from 'drizzle-orm';

export interface EventLogEntry {
  id: string;
  createdAt: Date;
  eventActorId: string;
  eventActionId: string;
  eventScopeId: string;
  eventTargetId: string;
  severityId: string;
  userId: string | null;
  sessionId: string | null;
  traceId: string | null;
  parentEventId: string | null;
  eventData: Record<string, any>;
  contextData: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  errorDetails: string | null;
  createdBy: string;
  occurredAt: Date;
  isActive: boolean;
}

export interface EventLogFilters {
  userId?: string;
  sessionId?: string;
  traceId?: string;
  severityId?: string;
  status?: string;
  actorId?: string;
  actionId?: string;
  scopeId?: string;
  targetId?: string;
  startDate?: Date;
  endDate?: Date;
}

export class EventLogRepository extends BaseRepository<EventLogEntry, typeof eventLog> {
  constructor(db: Database) {
    super(db, eventLog, 'occurredAt');
  }

  /**
   * Find events by filters with advanced querying
   */
  async findByFilters(filters: EventLogFilters, options: RepositoryOptions = {}): Promise<EventLogEntry[]> {
    const conditions = this.buildFilterConditions(filters, options);

    const {
      limit = 50,
      offset = 0,
      orderDirection = 'desc'
    } = options;

    const orderFn = orderDirection === 'asc' ? asc : desc;
    
    const result = await this.db
      .select()
      .from(eventLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(orderFn(eventLog.occurredAt))
      .limit(limit)
      .offset(offset);

    return result as EventLogEntry[];
  }

  /**
   * Helper to build filter conditions for findByFilters
   */
  private buildFilterConditions(filters: EventLogFilters, options: RepositoryOptions = {}): any[] {
    const conditions = [];

    if (filters.userId) {
      conditions.push(eq(eventLog.userId, filters.userId));
    }
    if (filters.sessionId) {
      conditions.push(eq(eventLog.sessionId, filters.sessionId));
    }
    if (filters.traceId) {
      conditions.push(eq(eventLog.traceId, filters.traceId));
    }
    if (filters.severityId) {
      conditions.push(eq(eventLog.severityId, filters.severityId));
    }
    if (filters.status) {
      // Ensure status is one of the allowed enum values
      const allowedStatuses = ['pending', 'processing', 'completed', 'failed', 'retrying'] as const;
      if (allowedStatuses.includes(filters.status as any)) {
        conditions.push(eq(eventLog.status, filters.status as typeof allowedStatuses[number]));
      }
    }
    if (filters.actorId) {
      conditions.push(eq(eventLog.eventActorId, filters.actorId));
    }
    if (filters.actionId) {
      conditions.push(eq(eventLog.eventActionId, filters.actionId));
    }
    if (filters.scopeId) {
      conditions.push(eq(eventLog.eventScopeId, filters.scopeId));
    }
    if (filters.targetId) {
      conditions.push(eq(eventLog.eventTargetId, filters.targetId));
    }
    if (filters.startDate && filters.endDate) {
      conditions.push(between(eventLog.occurredAt, filters.startDate, filters.endDate));
    }

    if (!options.includeInactive) {
      conditions.push(eq(eventLog.isActive, true));
    }

    return conditions;
  }

  /**
   * Find events by trace ID (distributed tracing)
   */
  async findByTraceId(traceId: string): Promise<EventLogEntry[]> {
    const result = await this.db
      .select()
      .from(eventLog)
      .where(and(
        eq(eventLog.traceId, traceId),
        eq(eventLog.isActive, true)
      ))
      .orderBy(eventLog.occurredAt);

    return result as EventLogEntry[];
  }

  /**
   * Find child events by parent event ID
   */
  async findChildEvents(parentEventId: string): Promise<EventLogEntry[]> {
    const result = await this.db
      .select()
      .from(eventLog)
      .where(and(
        eq(eventLog.parentEventId, parentEventId),
        eq(eventLog.isActive, true)
      ))
      .orderBy(eventLog.occurredAt);

    return result as EventLogEntry[];
  }
}