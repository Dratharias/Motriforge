import { ObjectId } from 'mongodb';
import { Logger, LogContext } from './Logger';
import { ApplicationContext } from '@/types/shared/enums/common';
import { ILogger } from '@/types/shared/base-types';

/**
 * Enhanced log context for bounded contexts
 */
export interface ContextualLogContext extends LogContext {
  readonly boundedContext: ApplicationContext;
  readonly aggregateId?: ObjectId;
  readonly aggregateType?: string;
  readonly commandId?: ObjectId;
  readonly queryId?: ObjectId;
  readonly eventId?: ObjectId;
  readonly sagaId?: ObjectId;
  readonly traceId?: string;
  readonly spanId?: string;
}

/**
 * Contextual logger that adds bounded context information
 */
export class ContextualLogger implements ILogger {
  private readonly baseLogger: Logger;
  private readonly context: ContextualLogContext;

  constructor(baseLogger: Logger, context: ContextualLogContext) {
    this.baseLogger = baseLogger;
    this.context = context;
  }

  /**
   * Creates a child logger with additional context
   */
  child(additionalContext: Partial<ContextualLogContext>): ContextualLogger {
    const mergedContext = { ...this.context, ...additionalContext };
    return new ContextualLogger(this.baseLogger, mergedContext);
  }

  /**
   * Creates a logger for a specific aggregate
   */
  forAggregate(aggregateId: ObjectId, aggregateType: string): ContextualLogger {
    return this.child({ aggregateId, aggregateType });
  }

  /**
   * Creates a logger for a command execution
   */
  forCommand(commandId: ObjectId, commandType: string): ContextualLogger {
    return this.child({ 
      commandId, 
      operation: commandType,
      traceId: this.generateTraceId()
    });
  }

  /**
   * Creates a logger for a query execution
   */
  forQuery(queryId: ObjectId, queryType: string): ContextualLogger {
    return this.child({ 
      queryId, 
      operation: queryType,
      traceId: this.generateTraceId()
    });
  }

  /**
   * Creates a logger for an event
   */
  forEvent(eventId: ObjectId, eventType: string): ContextualLogger {
    return this.child({ eventId, operation: eventType });
  }

  /**
   * Creates a logger for a saga
   */
  forSaga(sagaId: ObjectId, sagaType: string): ContextualLogger {
    return this.child({ 
      sagaId, 
      operation: sagaType,
      traceId: this.generateTraceId()
    });
  }

  /**
   * Creates a logger with distributed tracing information
   */
  withTracing(traceId: string, spanId: string): ContextualLogger {
    return this.child({ traceId, spanId });
  }

  /**
   * Logs a debug message with context
   */
  debug(message: string, data?: any): void {
    this.baseLogger.child(this.context).debug(this.formatMessage(message), data);
  }

  /**
   * Logs an info message with context
   */
  info(message: string, data?: any): void {
    this.baseLogger.child(this.context).info(this.formatMessage(message), data);
  }

  /**
   * Logs a warning message with context
   */
  warn(message: string, data?: any): void {
    this.baseLogger.child(this.context).warn(this.formatMessage(message), data);
  }

  /**
   * Logs an error message with context
   */
  error(message: string, error?: Error, data?: any): void {
    this.baseLogger.child(this.context).error(this.formatMessage(message), error, data);
  }

  /**
   * Logs a fatal message with context
   */
  fatal(message: string, error?: Error, data?: any): void {
    this.baseLogger.child(this.context).fatal(this.formatMessage(message), error, data);
  }

  /**
   * Logs the start of an operation
   */
  startOperation(operationName: string, data?: any): void {
    this.info(`Starting ${operationName}`, { 
      operationType: 'start',
      operationName,
      ...data 
    });
  }

  /**
   * Logs the completion of an operation
   */
  completeOperation(operationName: string, duration: number, data?: any): void {
    this.info(`Completed ${operationName}`, { 
      operationType: 'complete',
      operationName,
      duration,
      ...data 
    });
  }

  /**
   * Logs the failure of an operation
   */
  failOperation(operationName: string, error: Error, duration?: number, data?: any): void {
    this.error(`Failed ${operationName}`, error, { 
      operationType: 'fail',
      operationName,
      duration,
      ...data 
    });
  }

  /**
   * Logs domain event publication
   */
  eventPublished(eventType: string, aggregateId: ObjectId, data?: any): void {
    this.info(`Event published: ${eventType}`, {
      eventType,
      aggregateId: aggregateId.toHexString(),
      ...data
    });
  }

  /**
   * Logs domain event handling
   */
  eventHandled(eventType: string, handlerName: string, duration: number, data?: any): void {
    this.info(`Event handled: ${eventType}`, {
      eventType,
      handlerName,
      duration,
      ...data
    });
  }

  /**
   * Logs command execution
   */
  commandExecuted(commandType: string, aggregateId: ObjectId, duration: number, data?: any): void {
    this.info(`Command executed: ${commandType}`, {
      commandType,
      aggregateId: aggregateId.toHexString(),
      duration,
      ...data
    });
  }

  /**
   * Logs query execution
   */
  queryExecuted(queryType: string, duration: number, resultCount?: number, data?: any): void {
    this.info(`Query executed: ${queryType}`, {
      queryType,
      duration,
      resultCount,
      ...data
    });
  }

  /**
   * Logs saga progression
   */
  sagaProgressed(sagaType: string, stepName: string, data?: any): void {
    this.info(`Saga progressed: ${sagaType}`, {
      sagaType,
      stepName,
      ...data
    });
  }

  /**
   * Logs performance metrics
   */
  performance(metricName: string, value: number, unit: string, data?: any): void {
    this.info(`Performance metric: ${metricName}`, {
      metricType: 'performance',
      metricName,
      value,
      unit,
      ...data
    });
  }

  /**
   * Logs security events
   */
  security(eventType: string, severity: 'low' | 'medium' | 'high' | 'critical', data?: any): void {
    this.warn(`Security event: ${eventType}`, {
      securityEvent: true,
      eventType,
      severity,
      ...data
    });
  }

  /**
   * Logs business rule violations
   */
  businessRuleViolation(ruleName: string, aggregateId: ObjectId, data?: any): void {
    this.warn(`Business rule violation: ${ruleName}`, {
      businessRuleViolation: true,
      ruleName,
      aggregateId: aggregateId.toHexString(),
      ...data
    });
  }

  /**
   * Formats the message with context information
   */
  private formatMessage(message: string): string {
    const contextPrefix = `[${this.context.boundedContext}]`;
    const operationPrefix = this.context.operation ? `[${this.context.operation}]` : '';
    const aggregatePrefix = this.context.aggregateType && this.context.aggregateId 
      ? `[${this.context.aggregateType}:${this.context.aggregateId.toHexString().substring(0, 8)}]` 
      : '';
    
    return `${contextPrefix}${operationPrefix}${aggregatePrefix} ${message}`;
  }

  /**
   * Generates a trace ID for distributed tracing
   */
  private generateTraceId(): string {
    return new ObjectId().toHexString();
  }
}

/**
 * Factory for creating contextual loggers
 */
export class ContextualLoggerFactory {
  private static baseLogger: Logger;

  /**
   * Sets the base logger to use for all contextual loggers
   */
  static setBaseLogger(logger: Logger): void {
    this.baseLogger = logger;
  }

  /**
   * Creates a contextual logger for a bounded context
   */
  static create(boundedContext: ApplicationContext, additionalContext?: Partial<ContextualLogContext>): ContextualLogger {
    if (!this.baseLogger) {
      throw new Error('Base logger not set. Call setBaseLogger() first.');
    }

    const context: ContextualLogContext = {
      boundedContext,
      service: boundedContext,
      ...additionalContext
    };

    return new ContextualLogger(this.baseLogger, context);
  }

  /**
   * Creates a logger for the User context
   */
  static createForUser(additionalContext?: Partial<ContextualLogContext>): ContextualLogger {
    return this.create(ApplicationContext.USER, additionalContext);
  }

  /**
   * Creates a logger for the Workout context
   */
  static createForWorkout(additionalContext?: Partial<ContextualLogContext>): ContextualLogger {
    return this.create(ApplicationContext.WORKOUT, additionalContext);
  }

  /**
   * Creates a logger for the Exercise context
   */
  static createForExercise(additionalContext?: Partial<ContextualLogContext>): ContextualLogger {
    return this.create(ApplicationContext.EXERCISE, additionalContext);
  }

  /**
   * Creates a logger for the Progression context
   */
  static createForProgression(additionalContext?: Partial<ContextualLogContext>): ContextualLogger {
    return this.create(ApplicationContext.PROGRESSION, additionalContext);
  }

  /**
   * Creates a logger for the Trainer context
   */
  static createForTrainer(additionalContext?: Partial<ContextualLogContext>): ContextualLogger {
    return this.create(ApplicationContext.TRAINER, additionalContext);
  }

  /**
   * Creates a logger for the Medical context
   */
  static createForMedical(additionalContext?: Partial<ContextualLogContext>): ContextualLogger {
    return this.create(ApplicationContext.MEDICAL, additionalContext);
  }

  /**
   * Creates a logger for the Organization context
   */
  static createForOrganization(additionalContext?: Partial<ContextualLogContext>): ContextualLogger {
    return this.create(ApplicationContext.ORGANIZATION, additionalContext);
  }

  /**
   * Creates a logger for the Analytics context
   */
  static createForAnalytics(additionalContext?: Partial<ContextualLogContext>): ContextualLogger {
    return this.create(ApplicationContext.ANALYTICS, additionalContext);
  }

  /**
   * Creates a logger for the Audit context
   */
  static createForAudit(additionalContext?: Partial<ContextualLogContext>): ContextualLogger {
    return this.create(ApplicationContext.AUDIT, additionalContext);
  }
}