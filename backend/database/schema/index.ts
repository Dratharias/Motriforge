import { pgTable, text, varchar, timestamp, boolean, jsonb, smallint, inet, integer, pgEnum } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

// Enums for type safety
export const severityLevelEnum = pgEnum('severity_level', ['negligeable', 'lowest', 'low', 'medium', 'high', 'highest', 'critical']);
export const severityTypeEnum = pgEnum('severity_type', ['debug', 'info', 'warn', 'error', 'audit', 'lifecycle']);
export const eventStatusEnum = pgEnum('event_status', ['pending', 'processing', 'completed', 'failed', 'retrying']);
export const entityTypeEnum = pgEnum('entity_type', ['user', 'institution', 'resource', 'system', 'service']);
export const actionEnum = pgEnum('action', ['create', 'read', 'update', 'delete', 'login', 'logout', 'access', 'modify']);

// Core Observability Tables

/**
 * Unified severity system for all observability services
 * Renamed to avoid conflict with severity_type enum
 */
export const severityClassification = pgTable('severity_classification', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  level: varchar('level', { length: 20 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  requiresNotification: boolean('requires_notification').notNull().default(false),
  priorityOrder: integer('priority_order').notNull().default(1),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true)
});

/**
 * Actor.Action.Scope.Target pattern for events
 * Consistent with permission system architecture
 */
export const eventActorType = pgTable('event_actor_type', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: varchar('name', { length: 50 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true)
});

export const eventActionType = pgTable('event_action_type', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: varchar('name', { length: 50 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true)
});

export const eventScopeType = pgTable('event_scope_type', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: varchar('name', { length: 50 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true)
});

export const eventTargetType = pgTable('event_target_type', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: varchar('name', { length: 50 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true)
});

/**
 * Main event log for all observability services
 * Uses Actor.Action.Scope.Target pattern
 */
export const eventLog = pgTable('event_log', {
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
  status: eventStatusEnum('status').notNull().default('completed'),
  errorDetails: text('error_details'),
  createdBy: text('created_by').notNull(),
  occurredAt: timestamp('occurred_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true),
});

/**
 * Audit trail for data changes
 * Tracks old/new values for compliance
 */
export const auditLog = pgTable('audit_log', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id'),
  entityType: entityTypeEnum('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  action: actionEnum('action').notNull(),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  changedFields: jsonb('changed_fields'),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  sessionId: text('session_id'),
  reason: text('reason'),
  auditBatchId: text('audit_batch_id'),
  createdBy: text('created_by').notNull(),
  occurredAt: timestamp('occurred_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true)
});

/**
 * Error tracking with categorization and severity
 */
export const errorLog = pgTable('error_log', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  errorCode: varchar('error_code', { length: 100 }).notNull(),
  errorMessage: varchar('error_message', { length: 500 }).notNull(),
  errorDescription: text('error_description'),
  severityId: text('severity_id').notNull().references(() => severityClassification.id),
  userId: text('user_id'),
  sourceComponent: varchar('source_component', { length: 100 }).notNull(),
  sourceMethod: varchar('source_method', { length: 200 }),
  stackTrace: text('stack_trace'),
  contextData: jsonb('context_data'),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  sessionId: text('session_id'),
  status: varchar('status', { length: 50 }).notNull().default('new'),
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: text('resolved_by'),
  resolutionNotes: text('resolution_notes'),
  createdBy: text('created_by').notNull(),
  occurredAt: timestamp('occurred_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true)
});

/**
 * Data lifecycle tracking for compliance
 * Tracks data retention, archival, and deletion
 */
export const dataLifecycleLog = pgTable('data_lifecycle_log', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  entityType: entityTypeEnum('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  operation: varchar('operation', { length: 50 }).notNull(), // archive, delete, anonymize
  reason: text('reason').notNull(),
  policyId: text('policy_id'),
  executedBy: text('executed_by').notNull(),
  executedAt: timestamp('executed_at').notNull().defaultNow(),
  dataSize: integer('data_size_bytes'),
  affectedRecords: integer('affected_records').notNull().default(1),
  operationDetails: text('operation_details'),
  success: boolean('success').notNull().default(true),
  errorMessage: text('error_message'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true)
});

/**
 * Cache performance and invalidation tracking
 */
export const cacheLog = pgTable('cache_log', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  cacheKey: varchar('cache_key', { length: 255 }).notNull(),
  operation: varchar('operation', { length: 50 }).notNull(), // hit, miss, set, invalidate
  strategy: varchar('strategy', { length: 50 }).notNull(), // hot, warm, cold, stream
  hitRate: smallint('hit_rate'),
  responseTime: integer('response_time_ms'),
  dataSize: integer('data_size_bytes'),
  ttl: integer('ttl_seconds'),
  userId: text('user_id'),
  sessionId: text('session_id'),
  contextData: jsonb('context_data'),
  createdBy: text('created_by').notNull(),
  occurredAt: timestamp('occurred_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true)
});