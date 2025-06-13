import { pgTable, text, timestamp, boolean, jsonb, integer, inet, index } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

/**
 * Centralized severity classification system
 */
export const severityClassification = pgTable(
  'severity_classification',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    level: text('level'), // nullable - can be null for type-only classifications
    type: text('type').notNull(), // debug, info, warn, error, audit, lifecycle
    requiresNotification: boolean('requires_notification').notNull().default(false),
    priorityOrder: integer('priority_order').notNull().default(1),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    isActive: boolean('is_active').notNull().default(true)
  },
  (table) => [
    index('idx_severity_level_type').on(table.level, table.type),
    index('idx_severity_priority').on(table.priorityOrder)
  ]
);

/**
 * Actor.Action.Scope.Target pattern tables
 */
export const eventActorType = pgTable('event_actor_type', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull().unique(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true)
});

export const eventActionType = pgTable('event_action_type', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull().unique(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true)
});

export const eventScopeType = pgTable('event_scope_type', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull().unique(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true)
});

export const eventTargetType = pgTable('event_target_type', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull().unique(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true)
});

/**
 * Main event log table
 */
export const eventLog = pgTable(
  'event_log',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    eventActorId: text('event_actor_id').notNull().references(() => eventActorType.id),
    eventActionId: text('event_action_id').notNull().references(() => eventActionType.id),
    eventScopeId: text('event_scope_id').notNull().references(() => eventScopeType.id),
    eventTargetId: text('event_target_id').notNull().references(() => eventTargetType.id),
    severityId: text('severity_id').notNull().references(() => severityClassification.id),
    userId: text('user_id'),
    sessionId: text('session_id'),
    traceId: text('trace_id'),
    parentEventId: text('parent_event_id'),
    eventData: jsonb('event_data').notNull(),
    contextData: jsonb('context_data'),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    status: text('status', { enum: ['pending', 'processing', 'completed', 'failed', 'retrying'] }).notNull().default('completed'),
    errorDetails: text('error_details'),
    createdBy: text('created_by').notNull(),
    occurredAt: timestamp('occurred_at').notNull().defaultNow(),
    isActive: boolean('is_active').notNull().default(true)
  },
  (table) => [
    index('idx_event_log_occurred_at').on(table.occurredAt.desc()),
    index('idx_event_log_trace').on(table.traceId),
    index('idx_event_log_user').on(table.userId),
    index('idx_event_log_pattern').on(table.eventActorId, table.eventActionId, table.eventScopeId, table.eventTargetId)
  ]
);

/**
 * Audit log table
 */
export const auditLog = pgTable('audit_log', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  reason: text('reason'),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true)
});

/**
 * Error log table
 */
export const errorLog = pgTable('error_log', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  errorCode: text('error_code'),
  errorMessage: text('error_message').notNull(),
  errorDescription: text('error_description'),
  severityId: text('severity_id').notNull().references(() => severityClassification.id),
  sourceComponent: text('source_component').notNull(),
  sourceMethod: text('source_method'),
  stackTrace: text('stack_trace'),
  contextData: jsonb('context_data'),
  status: text('status', { enum: ['new', 'acknowledged', 'resolved', 'ignored'] }).notNull().default('new'),
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: text('resolved_by'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true)
});

// Type exports for use in services
export type SeverityClassification = typeof severityClassification.$inferSelect;
export type EventActorType = typeof eventActorType.$inferSelect;
export type EventActionType = typeof eventActionType.$inferSelect;
export type EventScopeType = typeof eventScopeType.$inferSelect;
export type EventTargetType = typeof eventTargetType.$inferSelect;
export type EventLog = typeof eventLog.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;
export type ErrorLog = typeof errorLog.$inferSelect;