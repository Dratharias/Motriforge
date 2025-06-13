import { pgTable, text, timestamp, boolean, jsonb, integer, inet, index } from 'drizzle-orm/pg-core';
import { isNotNull } from 'drizzle-orm/sql';
import { createId } from '@paralleldrive/cuid2';
import { severityClassification, eventActorType, eventActionType, eventScopeType, eventTargetType } from './observability';

/**
 * Enhanced log storage table
 * NOTE: search_vector is managed by PostgreSQL trigger, not included in Drizzle schema
 */
export const logEntry = pgTable('log_entry', {
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
  parentEventId: text('parent_event_id'),
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
  
  // Metadata
  createdBy: text('created_by').notNull(),
  loggedAt: timestamp('logged_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true)
}, (table) => [
  // Performance indexes (matching SQL migration)
  index('idx_log_entry_logged_at').on(table.loggedAt.desc()),
  index('idx_log_entry_trace').on(table.traceId).where(isNotNull(table.traceId)),
  index('idx_log_entry_correlation').on(table.correlationId).where(isNotNull(table.correlationId)),
  index('idx_log_entry_user').on(table.userId).where(isNotNull(table.userId)),
  index('idx_log_entry_session').on(table.sessionId).where(isNotNull(table.sessionId)),
  index('idx_log_entry_source').on(table.sourceComponent),
  index('idx_log_entry_pattern').on(table.eventActorId, table.eventActionId, table.eventScopeId, table.eventTargetId),
  index('idx_log_entry_user_time').on(table.userId, table.loggedAt.desc()).where(isNotNull(table.userId))
]);

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
}, (table) => [
  index('idx_log_summary_hour').on(table.hour.desc()),
  index('idx_log_summary_severity').on(table.severityId)
]);

// Type exports
export type LogEntry = typeof logEntry.$inferSelect;
export type LogSummary = typeof logSummary.$inferSelect;