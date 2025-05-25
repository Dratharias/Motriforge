import { Types } from 'mongoose';
import { LogLevel, ApplicationContext } from '@/types/shared/enums/common';
import { 
  LogEntry, 
  LogContext, 
  LogConfiguration, 
  AuditLogEntry, 
  PerformanceLogEntry,
  LogHealthStatus,
  LogHealthReport
} from '@/types/shared/infrastructure/logging';

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