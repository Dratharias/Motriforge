import { pgTable, text,  timestamp, boolean, jsonb, integer, inet, index } from 'drizzle-orm/pg-core';
import { isNotNull } from 'drizzle-orm/sql';
import { createId } from '@paralleldrive/cuid2';
import { severityClassification, eventActorType, eventActionType, eventScopeType, eventTargetType } from './index';

/**
 * Enhanced log storage with full-text search capabilities
 * Uses PostgreSQL's built-in FTS instead of external ElasticSearch
 */
// Extract fields to avoid circular reference
const logEntryFields = {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  
  // Actor.Action.Scope.Target pattern
  eventActorId: text('event_actor_id').notNull().references(() => eventActorType.id),
  eventActionId: text('event_action_id').notNull().references(() => eventActionType.id),
  eventScopeId: text('event_scope_id').notNull().references(() => eventScopeType.id),
  eventTargetId: text('event_target_id').notNull().references(() => eventTargetType.id),
  
  // Severity and classification
  severityId: text('severity_id').notNull().references(() => severityClassification.id),
  
  // Core log data
  message: text('message').notNull(),
  context: jsonb('context').default({}),
  
  // Tracing and correlation
  correlationId: text('correlation_id'),
  traceId: text('trace_id'),
  parentEventId: text('parent_event_id'), // Remove .references(() => logEntry.id) to break the circular reference
  userId: text('user_id'),
  sessionId: text('session_id'),
  
  // Source information
  sourceComponent: text('source_component').notNull(),
  sourceFile: text('source_file'),
  lineNumber: integer('line_number'),
  stackTrace: text('stack_trace'),
  
  // Request context
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  
  // Note: search_vector is handled by PostgreSQL trigger, not in TypeScript
  
  // Metadata
  createdBy: text('created_by').notNull(),
  loggedAt: timestamp('logged_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true)
};

export interface LogEntryFields {
    id: ReturnType<typeof text>;
    eventActorId: ReturnType<typeof text>;
    eventActionId: ReturnType<typeof text>;
    eventScopeId: ReturnType<typeof text>;
    eventTargetId: ReturnType<typeof text>;
    severityId: ReturnType<typeof text>;
    message: ReturnType<typeof text>;
    context: ReturnType<typeof jsonb>;
    correlationId: ReturnType<typeof text>;
    traceId: ReturnType<typeof text>;
    parentEventId: ReturnType<typeof text>;
    userId: ReturnType<typeof text>;
    sessionId: ReturnType<typeof text>;
    sourceComponent: ReturnType<typeof text>;
    sourceFile: ReturnType<typeof text>;
    lineNumber: ReturnType<typeof integer>;
    stackTrace: ReturnType<typeof text>;
    ipAddress: ReturnType<typeof inet>;
    userAgent: ReturnType<typeof text>;
    createdBy: ReturnType<typeof text>;
    loggedAt: ReturnType<typeof timestamp>;
    isActive: ReturnType<typeof boolean>;
}

export interface LogEntryTable {
    id: string;
    eventActorId: string;
    eventActionId: string;
    eventScopeId: string;
    eventTargetId: string;
    severityId: string;
    message: string;
    context?: Record<string, unknown>;
    correlationId?: string | null;
    traceId?: string | null;
    parentEventId?: string | null;
    userId?: string | null;
    sessionId?: string | null;
    sourceComponent: string;
    sourceFile?: string | null;
    lineNumber?: number | null;
    stackTrace?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    createdBy: string;
    loggedAt: Date;
    isActive: boolean;
}

export const logEntry = pgTable(
    'log_entry',
    {
        ...logEntryFields
    },
    (table) => ({
        // Performance indexes (matching SQL migration)
        loggedAtIdx: index('idx_log_entry_logged_at').on(table.loggedAt.desc()),
        traceIdx: index('idx_log_entry_trace').on(table.traceId).where(isNotNull(table.traceId)),
        correlationIdx: index('idx_log_entry_correlation').on(table.correlationId).where(isNotNull(table.correlationId)),
        userIdx: index('idx_log_entry_user').on(table.userId).where(isNotNull(table.userId)),
        sessionIdx: index('idx_log_entry_session').on(table.sessionId).where(isNotNull(table.sessionId)),
        sourceIdx: index('idx_log_entry_source').on(table.sourceComponent),
        patternIdx: index('idx_log_entry_pattern').on(table.eventActorId, table.eventActionId, table.eventScopeId, table.eventTargetId),
        userTimeIdx: index('idx_log_entry_user_time').on(table.userId, table.loggedAt.desc()).where(isNotNull(table.userId))
    })
);

/**
 * Materialized view for log aggregation (managed by SQL functions)
 * This is just for TypeScript typing - actual view is created by SQL
 */
export const logSummary = pgTable('log_summary', {
  hour: timestamp('hour').notNull(),
  severityId: text('severity_id').notNull(),
  sourceComponent: text('source_component').notNull(),
  logCount: integer('log_count').notNull(),
  uniqueUsers: integer('unique_users').notNull(),
  uniqueSessions: integer('unique_sessions').notNull()
}, (table) => ({
  hourIdx: index('idx_log_summary_hour').on(table.hour.desc()),
  severityIdx: index('idx_log_summary_severity').on(table.severityId)
}));