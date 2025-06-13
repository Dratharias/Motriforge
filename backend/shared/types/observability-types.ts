import { z } from 'zod';

// =====================================
// ACTOR.ACTION.SCOPE.TARGET TYPES
// =====================================

export interface ActorActionPattern {
  actor: string;
  action: string;
  scope: string;
  target: string;
}

export interface EventPatternRequest {
  actorId: string;
  actionId: string;
  scopeId: string;
  targetId: string;
  pattern: string;
  description?: string;
  isSystemPattern?: boolean;
  validationSchema?: Record<string, any>;
}

// =====================================
// SEVERITY SYSTEM TYPES
// =====================================

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
  level: SeverityLevel | null;
  type: SeverityType;
  requiresNotification: boolean;
  priorityOrder: number;
  displayName: string;
  description?: string;
  alertThresholdMinutes?: number;
}

// =====================================
// EVENT SERVICE TYPES
// =====================================

export interface EventRequest {
  patternId: string;
  actorId: string;
  actionId: string;
  scopeId: string;
  targetId: string;
  severityId: string;
  correlationId?: string;
  eventData?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ProcessedEvent {
  id: string;
  pattern: string;
  eventData: Record<string, any>;
  processedAt: Date;
  processingTimeMs: number;
  handlerResults: HandlerResult[];
}

export interface HandlerResult {
  handlerName: string;
  status: 'success' | 'failed' | 'retry';
  processingTimeMs: number;
  errorDetails?: string;
}

// =====================================
// LOGGING SERVICE TYPES
// =====================================

export interface LogRequest {
  severityId: string;
  actorId: string;
  actionId: string;
  scopeId: string;
  targetId: string;
  message: string;
  context?: Record<string, any>;
  correlationId?: string;
  sourceFile?: string;
  lineNumber?: number;
  stackTrace?: string;
}

export interface LogEntry {
  id: string;
  severity: SeverityClassification;
  message: string;
  context?: Record<string, any>;
  correlationId?: string;
  createdAt: Date;
  sourceInfo?: {
    file: string;
    line: number;
  };
}

// Zod validation schemas
export const logRequestSchema = z.object({
  severityId: z.string().cuid(),
  actorId: z.string().cuid(),
  actionId: z.string().cuid(),
  scopeId: z.string().cuid(),
  targetId: z.string().cuid(),
  message: z.string().min(1).max(2000),
  context: z.record(z.any()).optional(),
  correlationId: z.string().uuid().optional(),
  sourceFile: z.string().max(255).optional(),
  lineNumber: z.number().int().positive().optional(),
  stackTrace: z.string().optional(),
});

// =====================================
// AUDIT SERVICE TYPES
// =====================================

export type AuditType =
  | 'security'
  | 'compliance'
  | 'data_access'
  | 'permission'
  | 'financial'
  | 'user_action';

export interface AuditRequest {
  severityId: string;
  actorId: string;
  actionId: string;
  scopeId: string;
  targetId: string;
  auditType: AuditType;
  resourceId?: string;
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  riskScore?: number;
  complianceFlags?: Record<string, any>;
}

export interface AuditEntry {
  id: string;
  severity: SeverityClassification;
  auditType: AuditType;
  resourceId?: string;
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  riskScore?: number;
  complianceFlags?: Record<string, any>;
  createdAt: Date;
}

export const auditRequestSchema = z.object({
  severityId: z.string().cuid(),
  actorId: z.string().cuid(),
  actionId: z.string().cuid(),
  scopeId: z.string().cuid(),
  targetId: z.string().cuid(),
  auditType: z.enum(['security', 'compliance', 'data_access', 'permission', 'financial', 'user_action']),
  resourceId: z.string().cuid().optional(),
  beforeState: z.record(z.any()).optional(),
  afterState: z.record(z.any()).optional(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  riskScore: z.number().int().min(0).max(100).optional(),
  complianceFlags: z.record(z.any()).optional(),
});

// =====================================
// ERROR SERVICE TYPES
// =====================================

export type ErrorType =
  | 'validation'
  | 'system'
  | 'network'
  | 'database'
  | 'business'
  | 'authentication'
  | 'authorization';

export interface ErrorRequest {
  severityId: string;
  actorId: string;
  actionId: string;
  scopeId: string;
  targetId: string;
  errorType: ErrorType;
  errorCode?: string;
  message: string;
  stackTrace?: string;
  context?: Record<string, any>;
  correlationId?: string;
}

export interface ErrorEntry {
  id: string;
  severity: SeverityClassification;
  errorType: ErrorType;
  errorCode?: string;
  message: string;
  stackTrace?: string;
  context?: Record<string, any>;
  occurrenceCount: number;
  firstOccurredAt: Date;
  lastOccurredAt: Date;
  resolvedAt?: Date;
  resolution?: string;
}

export const errorRequestSchema = z.object({
  severityId: z.string().cuid(),
  actorId: z.string().cuid(),
  actionId: z.string().cuid(),
  scopeId: z.string().cuid(),
  targetId: z.string().cuid(),
  errorType: z.enum(['validation', 'system', 'network', 'database', 'business', 'authentication', 'authorization']),
  errorCode: z.string().max(50).optional(),
  message: z.string().min(1).max(2000),
  stackTrace: z.string().optional(),
  context: z.record(z.any()).optional(),
  correlationId: z.string().uuid().optional(),
});

// =====================================
// LIFECYCLE SERVICE TYPES
// =====================================

export type LifecycleType =
  | 'retention'
  | 'deletion'
  | 'archival'
  | 'compliance'
  | 'migration'
  | 'backup';

export type ResourceType =
  | 'user_data'
  | 'workout_data'
  | 'media_files'
  | 'financial_data'
  | 'system_logs'
  | 'audit_trails';

export type RetentionPolicy =
  | '30_days'
  | '90_days'
  | '1_year'
  | '3_years'
  | '7_years'
  | 'indefinite';

export interface LifecycleRequest {
  severityId: string;
  actorId: string;
  actionId: string;
  scopeId: string;
  targetId: string;
  lifecycleType: LifecycleType;
  resourceType: ResourceType;
  resourceId: string;
  retentionPolicy: RetentionPolicy;
  scheduledDate?: Date;
  complianceReason?: string;
  dataSize?: number;
}

export interface LifecycleEntry {
  id: string;
  severity: SeverityClassification;
  lifecycleType: LifecycleType;
  resourceType: ResourceType;
  resourceId: string;
  retentionPolicy: RetentionPolicy;
  scheduledDate?: Date;
  executedDate?: Date;
  complianceReason?: string;
  dataSize?: number;
  archivedLocation?: string;
  deletionConfirmed: boolean;
  createdAt: Date;
}

export const lifecycleRequestSchema = z.object({
  severityId: z.string().cuid(),
  actorId: z.string().cuid(),
  actionId: z.string().cuid(),
  scopeId: z.string().cuid(),
  targetId: z.string().cuid(),
  lifecycleType: z.enum(['retention', 'deletion', 'archival', 'compliance', 'migration', 'backup']),
  resourceType: z.enum(['user_data', 'workout_data', 'media_files', 'financial_data', 'system_logs', 'audit_trails']),
  resourceId: z.string().cuid(),
  retentionPolicy: z.enum(['30_days', '90_days', '1_year', '3_years', '7_years', 'indefinite']),
  scheduledDate: z.date().optional(),
  complianceReason: z.string().max(255).optional(),
  dataSize: z.number().int().positive().optional(),
});

// =====================================
// SHARED VALIDATION AND UTILITY TYPES
// =====================================

export interface ValidationResult<T = any> {
  isValid: boolean;
  data?: T;
  errors?: string[];
}

export interface RepositoryOptions {
  includeInactive?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
  correlationId?: string;
}

// =====================================
// CONFIGURATION TYPES
// =====================================

export interface ObservabilityConfig {
  database: {
    connectionString: string;
    poolSize: number;
    timeout: number;
  };
  elasticsearch: {
    endpoint: string;
    apiKey: string;
    indexPattern: string;
    batchSize: number;
    flushInterval: number;
  };
  caching: {
    enabled: boolean;
    ttlSeconds: number;
    maxEntries: number;
    strategy: 'memory' | 'redis';
  };
  alerting: {
    enabled: boolean;
    channels: ('email' | 'slack' | 'webhook')[];
    thresholds: {
      errorRate: number;
      responseTime: number;
      failureCount: number;
    };
  };
  retention: {
    defaultPolicy: RetentionPolicy;
    policies: Record<ResourceType, RetentionPolicy>;
    archivalEnabled: boolean;
    compressionEnabled: boolean;
  };
  monitoring: {
    metricsEnabled: boolean;
    healthCheckInterval: number;
    performanceTracking: boolean;
  };
}