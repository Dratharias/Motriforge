import { z } from 'zod';

/**
 * Actor.Action.Scope.Target pattern types
 */
export interface ActorActionPattern {
  actor: string;
  action: string;
  scope: string;
  target: string;
}

export const actorActionPatternSchema = z.object({
  actor: z.string().min(1).max(50),
  action: z.string().min(1).max(50),
  scope: z.string().min(1).max(50),
  target: z.string().min(1).max(50)
});

/**
 * Severity system types
 */
export type SeverityLevel =
  | 'negligeable'
  | 'lowest'
  | 'low'
  | 'medium'
  | 'high'
  | 'highest'
  | 'critical';

export type SeverityType =
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'
  | 'audit'
  | 'lifecycle';

export interface SeverityClassification {
  id: string;
  level: string;
  type: string;
  requiresNotification: boolean;
  priorityOrder: number;
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
}

/**
 * Event processing types
 */
export interface EventProcessingContext {
  traceId: string;
  sessionId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  parentEventId?: string;
}

export interface EventMetadata {
  sourceComponent?: string;
  sourceMethod?: string;
  correlationId?: string;
  tags?: string[];
  environment?: string;
}

export const eventRequestSchema = z.object({
  actor: z.string().min(1).max(50),
  action: z.string().min(1).max(50),
  scope: z.string().min(1).max(50),
  target: z.string().min(1).max(50),
  severityType: z.enum(['debug', 'info', 'warn', 'error', 'audit', 'lifecycle']),
  severityLevel: z.enum(['negligeable', 'lowest', 'low', 'medium', 'high', 'highest', 'critical']).optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  traceId: z.string().optional(),
  parentEventId: z.string().optional(),
  eventData: z.record(z.any()),
  contextData: z.record(z.any()).optional(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().max(500).optional(),
  createdBy: z.string()
});

export type EventRequest = z.infer<typeof eventRequestSchema>;

/**
 * Repository interfaces
 */
export interface RepositoryOptions {
  includeInactive?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface BaseEntity {
  id: string;
  createdAt: Date;
  isActive: boolean;
}

/**
 * Service response types
 */
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
  correlationId?: string;
}

export interface ProcessedEvent {
  id: string;
  pattern: string;
  eventData: Record<string, any>;
  processedAt: Date;
  status: 'success' | 'failed';
  errorDetails?: string;
  processingTimeMs?: number;
}

/**
 * Event filtering and querying
 */
export interface EventFilters {
  userId?: string;
  sessionId?: string;
  traceId?: string;
  severityType?: SeverityType;
  severityLevel?: SeverityLevel;
  actor?: string;
  action?: string;
  scope?: string;
  target?: string;
  startDate?: Date;
  endDate?: Date;
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
}

export const eventFiltersSchema = z.object({
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  traceId: z.string().optional(),
  severityType: z.enum(['debug', 'info', 'warn', 'error', 'audit', 'lifecycle']).optional(),
  severityLevel: z.enum(['negligeable', 'lowest', 'low', 'medium', 'high', 'highest', 'critical']).optional(),
  actor: z.string().optional(),
  action: z.string().optional(),
  scope: z.string().optional(),
  target: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'retrying']).optional()
});

/**
 * Configuration types
 */
export interface ObservabilityConfig {
  database: {
    connectionString: string;
    poolSize: number;
    timeout: number;
  };
  event: {
    defaultSeverityLevels: Record<SeverityType, SeverityLevel>;
    maxEventDataSize: number;
    maxContextDataSize: number;
    batchProcessingSize: number;
    retentionDays: number;
  };
  tracing: {
    enableDistributedTracing: boolean;
    maxTraceDepth: number;
    traceRetentionDays: number;
  };
  performance: {
    enableMetrics: boolean;
    slowEventThresholdMs: number;
    maxConcurrentEvents: number;
  };
  monitoring: {
    healthCheckInterval: number;
    alertingEnabled: boolean;
    notificationThresholds: {
      errorRate: number;
      responseTime: number;
      failureCount: number;
    };
  };
}

/**
 * Error types for observability services
 */
export interface ObservabilityError {
  code: string;
  message: string;
  component: string;
  details?: any;
  timestamp: Date;
}

export class EventProcessingError extends Error {
  constructor(
    message: string,
    public code: string,
    public component: string,
    public details?: any
  ) {
    super(message);
    this.name = 'EventProcessingError';
  }
}

export class PatternValidationError extends Error {
  constructor(
    pattern: string,
    public invalidComponent: 'actor' | 'action' | 'scope' | 'target',
    public value: string
  ) {
    super(`Invalid ${invalidComponent} '${value}' in pattern '${pattern}'`);
    this.name = 'PatternValidationError';
  }
}

/**
 * Utility types for type safety
 */
export type RequiredEventContext = Required<Pick<EventProcessingContext, 'traceId'>>;
export type OptionalEventContext = Partial<Omit<EventProcessingContext, 'traceId'>>;
export type CompleteEventContext = RequiredEventContext & OptionalEventContext;

export type EventStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
export type ProcessingResult = 'success' | 'failed' | 'retry';

/**
 * Database entity types matching schema
 */
export interface EventLogEntry {
  id: string;
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
  status: EventStatus;
  errorDetails: string | null;
  createdBy: string;
  occurredAt: Date;
  isActive: boolean;
}

export interface ActorType extends BaseEntity {
  name: string;
  displayName: string;
  description: string | null;
  createdBy: string;
}

export interface ActionType extends BaseEntity {
  name: string;
  displayName: string;
  description: string | null;
  createdBy: string;
}

export interface ScopeType extends BaseEntity {
  name: string;
  displayName: string;
  description: string | null;
  createdBy: string;
}

export interface TargetType extends BaseEntity {
  name: string;
  displayName: string;
  description: string | null;
  createdBy: string;
}