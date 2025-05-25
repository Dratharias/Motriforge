import { Types } from 'mongoose';
import { LogLevel, ApplicationContext } from '../enums/common';

/**
 * Core log entry structure
 */
export interface LogEntry {
  readonly id: Types.ObjectId;
  readonly timestamp: Date;
  readonly level: LogLevel;
  readonly message: string;
  readonly context: ApplicationContext;
  readonly correlationId?: string;
  readonly userId?: Types.ObjectId;
  readonly organizationId?: Types.ObjectId;
  readonly sessionId?: string;
  readonly requestId?: string;
  readonly data?: Record<string, any>;
  readonly error?: LogError;
  readonly metadata: LogMetadata;
}

/**
 * Log context for contextual logging
 */
export interface LogContext {
  applicationContext: ApplicationContext;
  correlationId?: string;
  userId?: Types.ObjectId;
  organizationId?: Types.ObjectId;
  sessionId?: string;
  requestId?: string;
}

/**
 * Log error structure
 */
export interface LogError {
  readonly name: string;
  readonly message: string;
  readonly stack?: string;
  readonly code?: string;
  readonly details?: Record<string, any>;
}

/**
 * Log metadata structure
 */
export interface LogMetadata {
  readonly source: string;
  readonly version: string;
  readonly environment: string;
  readonly hostname: string;
  readonly pid: number;
  readonly builtAt?: Date;
}

/**
 * Audit log entry extending base log entry
 */
export interface AuditLogEntry extends Omit<LogEntry, 'metadata'> {
  readonly auditType: AuditLogType;
  readonly resourceType?: string;
  readonly resourceId?: Types.ObjectId;
  readonly action: string;
  readonly result: AuditResult;
  readonly riskLevel: AuditRiskLevel;
  readonly complianceFrameworks: string[];
  readonly sensitiveData: boolean;
  readonly retention: AuditRetentionPolicy;
}

/**
 * Performance log entry extending base log entry
 */
export interface PerformanceLogEntry extends Omit<LogEntry, 'metadata'> {
  readonly operationName: string;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly duration: number;
  readonly memoryUsage?: MemoryUsage;
  readonly cpuUsage?: CpuUsage;
  readonly ioOperations?: number;
  readonly networkOperations?: number;
}

/**
 * Memory usage information
 */
export interface MemoryUsage {
  readonly heapUsed: number;
  readonly heapTotal: number;
  readonly external: number;
  readonly rss: number;
}

/**
 * CPU usage information
 */
export interface CpuUsage {
  readonly user: number;
  readonly system: number;
}

/**
 * Audit log types
 */
export enum AuditLogType {
  SYSTEM_ACCESS = 'system_access',
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  SECURITY_EVENT = 'security_event',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  CONFIGURATION_CHANGE = 'configuration_change',
  USER_ACTION = 'user_action'
}

/**
 * Audit results
 */
export enum AuditResult {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PARTIAL = 'partial',
  DENIED = 'denied'
}

/**
 * Audit risk levels
 */
export enum AuditRiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Audit retention policy
 */
export interface AuditRetentionPolicy {
  readonly days: number;
  readonly archiveAfterDays: number;
  readonly deleteAfterDays: number;
  readonly immutable: boolean;
}

/**
 * Log configuration structure
 */
export interface LogConfiguration {
  readonly level: LogLevel;
  readonly enableConsole: boolean;
  readonly enableFile: boolean;
  readonly enableRemote: boolean;
  readonly enableAudit: boolean;
  readonly enableMetrics: boolean;
  readonly enableContext: boolean;
  readonly formats: LogFormat[];
  readonly outputs: LogOutput[];
  readonly filters: LogFilter[];
  readonly bufferSize?: number;
  readonly flushInterval?: number;
  readonly samplingRate?: number;
}

/**
 * Log format configuration
 */
export interface LogFormat {
  readonly name: string;
  readonly template: string;
  readonly dateFormat: string;
  readonly includeStack: boolean;
  readonly includeContext: boolean;
  readonly colorize: boolean;
  readonly compress: boolean;
}

/**
 * Log output configuration
 */
export interface LogOutput {
  readonly name: string;
  readonly type: LogOutputType;
  readonly enabled: boolean;
  readonly level: LogLevel;
  readonly format: string;
  readonly destination: string;
}

/**
 * Log output types
 */
export enum LogOutputType {
  CONSOLE = 'console',
  FILE = 'file',
  DATABASE = 'database',
  REMOTE = 'remote'
}

/**
 * Log filter configuration
 */
export interface LogFilter {
  readonly name: string;
  readonly enabled: boolean;
  readonly conditions: LogFilterCondition[];
  readonly action: LogFilterAction;
}

/**
 * Log filter condition
 */
export interface LogFilterCondition {
  readonly field: string;
  readonly operator: LogFilterOperator;
  readonly value: any;
}

/**
 * Log filter operators
 */
export enum LogFilterOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  IN = 'in',
  NOT_IN = 'not_in'
}

/**
 * Log filter actions
 */
export enum LogFilterAction {
  INCLUDE = 'include',
  EXCLUDE = 'exclude',
  SAMPLE = 'sample',
  TRANSFORM = 'transform'
}

/**
 * Fluent log builder interface
 */
export interface IFluentLogBuilder<T = any> {
  withLevel(level: LogLevel): T;
  withMessage(message: string): T;
  withContext(context: LogContext): T;
  withData(data: Record<string, any>): T;
  withError(error: Error): T;
  withCorrelationId(correlationId: string): T;
  withUserId(userId: Types.ObjectId): T;
  withTags(tags: Record<string, string>): T;
  withDuration(duration: number): T;
  withMetric(name: string, value: number): T;
  withHttpStatus(status: number): T;
  withUserAgent(userAgent: string): T;
  withIpAddress(ipAddress: string): T;
  debug(message: string): T;
  info(message: string): T;
  warn(message: string): T;
  error(message: string, error?: Error): T;
  fatal(message: string, error?: Error): T;
  build(): LogEntry;
  log(): Promise<void>;
  reset(): T;
  clone(): T;
}

/**
 * Core logger interface - single responsibility for logging operations
 */
export interface ILogger {
  readonly name: string;
  log(level: LogLevel, message: string, data?: any, context?: LogContext): Promise<void>;
  debug(message: string, data?: any, context?: LogContext): Promise<void>;
  info(message: string, data?: any, context?: LogContext): Promise<void>;
  warn(message: string, data?: any, context?: LogContext): Promise<void>;
  error(message: string, error?: Error, data?: any, context?: LogContext): Promise<void>;
  fatal(message: string, error?: Error, data?: any, context?: LogContext): Promise<void>;
}

/**
 * Log strategy interface for different output destinations
 */
export interface ILogStrategy {
  readonly name: string;
  readonly outputType: string;
  write(entry: LogEntry): Promise<void>;
  flush(): Promise<void>;
  close(): Promise<void>;
  isHealthy(): Promise<boolean>;
}

/**
 * Log formatter interface for different output formats
 */
export interface ILogFormatter {
  readonly name: string;
  format(entry: LogEntry): string | Buffer;
  parse(data: string | Buffer): LogEntry;
}

/**
 * Log filter interface for selective logging
 */
export interface ILogFilter {
  readonly name: string;
  shouldLog(entry: LogEntry): boolean;
  transform?(entry: LogEntry): LogEntry;
}

/**
 * Log event listener interface
 */
export interface ILogEventListener {
  onLogEntry(entry: LogEntry): Promise<void>;
  onError(error: Error, entry?: LogEntry): Promise<void>;
  onFlush(): Promise<void>;
}

/**
 * Contextual logger interface for context-aware logging
 */
export interface IContextualLogger extends ILogger {
  withContext(context: Partial<LogContext>): IContextualLogger;
  withCorrelationId(correlationId: string): IContextualLogger;
  withUserId(userId: Types.ObjectId): IContextualLogger;
  withOrganizationId(organizationId: Types.ObjectId): IContextualLogger;
  withSessionId(sessionId: string): IContextualLogger;
  withRequestId(requestId: string): IContextualLogger;
  withApplicationContext(context: ApplicationContext): IContextualLogger;
  getContext(): LogContext;
}

/**
 * Audit logger interface for compliance logging
 */
export interface IAuditLogger {
  readonly name: string;
  audit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void>;
  auditSuccess(action: string, resourceId?: Types.ObjectId, data?: any): Promise<void>;
  auditFailure(action: string, error: Error, resourceId?: Types.ObjectId, data?: any): Promise<void>;
  auditAccess(resourceType: string, resourceId: Types.ObjectId, action: string): Promise<void>;
  auditDataChange(resourceType: string, resourceId: Types.ObjectId, changes: Record<string, any>): Promise<void>;
  auditSecurityEvent(eventType: string, severity: string, details: any): Promise<void>;
}

/**
 * Performance logger interface for performance monitoring
 */
export interface IPerformanceLogger {
  readonly name: string;
  startTimer(operationName: string, context?: LogContext): IPerformanceTimer;
  logPerformance(entry: Omit<PerformanceLogEntry, 'id' | 'timestamp'>): Promise<void>;
  measureAsync<T>(operationName: string, operation: () => Promise<T>, context?: LogContext): Promise<T>;
  measureSync<T>(operationName: string, operation: () => T, context?: LogContext): T;
}

/**
 * Performance timer interface
 */
export interface IPerformanceTimer {
  readonly operationName: string;
  readonly startTime: Date;
  stop(data?: any): Promise<void>;
  addData(key: string, value: any): void;
  addMemoryUsage(): void;
  addCpuUsage(): void;
}

/**
 * Log builder interface for constructing complex log entries
 */
export interface ILogBuilder {
  withLevel(level: LogLevel): this;
  withMessage(message: string): this;
  withContext(context: LogContext): this;
  withData(data: Record<string, any>): this;
  withError(error: Error): this;
  withCorrelationId(correlationId: string): this;
  withUserId(userId: Types.ObjectId): this;
  withTags(tags: Record<string, string>): this;
  build(): LogEntry;
  log(): Promise<void>;
}

/**
 * Log configuration manager interface
 */
export interface ILogConfigurationManager {
  getConfiguration(): LogConfiguration;
  updateConfiguration(config: Partial<LogConfiguration>): Promise<void>;
  validateConfiguration(config: LogConfiguration): boolean;
  getStrategies(): string[];
  getFormatters(): string[];
  getFilters(): string[];
}

/**
 * Log health checker interface
 */
export interface ILogHealthChecker {
  checkHealth(): Promise<LogHealthStatus>;
  checkStrategyHealth(strategyName: string): Promise<boolean>;
  getHealthReport(): Promise<LogHealthReport>;
}

/**
 * Log health status
 */
export interface LogHealthStatus {
  readonly healthy: boolean;
  readonly strategies: Record<string, boolean>;
  readonly errors: string[];
  readonly timestamp: Date;
}

/**
 * Log health report
 */
export interface LogHealthReport {
  readonly overall: LogHealthStatus;
  readonly strategies: Record<string, StrategyHealthDetail>;
  readonly performance: LogPerformanceMetrics;
}

/**
 * Strategy health detail
 */
export interface StrategyHealthDetail {
  readonly healthy: boolean;
  readonly lastWrite: Date;
  readonly errorCount: number;
  readonly latency: number;
}

/**
 * Log performance metrics
 */
export interface LogPerformanceMetrics {
  readonly logsPerSecond: number;
  readonly averageLatency: number;
  readonly queueSize: number;
  readonly memoryUsage: number;
}

/**
 * Log command interface for operations
 */
export interface ILogCommand {
  readonly commandId: Types.ObjectId;
  readonly commandType: string;
  execute(): Promise<void>;
  undo?(): Promise<void>;
  validate(): boolean;
}

/**
 * Log event publisher interface
 */
export interface ILogEventPublisher {
  subscribe(listener: ILogEventListener): void;
  unsubscribe(listener: ILogEventListener): void;
  publishLogEntry(entry: LogEntry): Promise<void>;
  publishError(error: Error, entry?: LogEntry): Promise<void>;
  publishFlush(): Promise<void>;
}