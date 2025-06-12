import { Database } from '~/database/connection';
import { 
  SeverityRepository, 
  EventActorRepository, 
  EventActionRepository, 
  EventScopeRepository, 
  EventTargetRepository 
} from '~/repositories/observability';
import { LogSearchService, LogSearchQuery } from './log-search-service';
import { EventBus, ObservabilityEvent, EventHandler } from '~/shared/event-bus/event-bus';
import { EventFactory } from '~/shared/factories/event-factory';
import { sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

export interface LoggingConfig {
  maxMessageLength: number;
  maxContextSize: number;
  enableFileLogging: boolean;
  logFilePath?: string;
  batchSize: number;
  flushIntervalMs: number;
  enableSearch: boolean;
  retentionDays: number;
}

export interface LogRequest {
  actor: string;
  action: string;
  scope: string;
  target: string;
  severityType: string;
  severityLevel?: string;
  message: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  traceId?: string;
  parentEventId?: string;
  sourceComponent: string;
  sourceFile?: string;
  lineNumber?: number;
  stackTrace?: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

export interface LogEntry {
  id: string;
  pattern: string;
  message: string;
  severityType: string;
  severityLevel: string;
  sourceComponent: string;
  context?: Record<string, any>;
  loggedAt: Date;
  correlationId: string;
}

export class LoggingService implements EventHandler {
  name = 'LoggingService';
  
  private readonly severityRepo: SeverityRepository;
  private readonly actorRepo: EventActorRepository;
  private readonly actionRepo: EventActionRepository;
  private readonly scopeRepo: EventScopeRepository;
  private readonly targetRepo: EventTargetRepository;
  private readonly searchService: LogSearchService;
  private readonly eventFactory: EventFactory;
  
  private logBuffer: LogRequest[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  
  constructor(
    private readonly db: Database,
    private readonly eventBus: EventBus,
    private readonly config: LoggingConfig
  ) {
    this.severityRepo = new SeverityRepository(db);
    this.actorRepo = new EventActorRepository(db);
    this.actionRepo = new EventActionRepository(db);
    this.scopeRepo = new EventScopeRepository(db);
    this.targetRepo = new EventTargetRepository(db);
    this.searchService = new LogSearchService(db);
    this.eventFactory = EventFactory.getInstance('logging-service');
    
    this.setupEventHandlers();
    this.setupBatchProcessor();
  }

  /**
   * Log a message with Actor.Action.Scope.Target pattern
   */
  async log(request: LogRequest): Promise<LogEntry> {
    try {
      // Validate message length
      if (request.message.length > this.config.maxMessageLength) {
        request.message = request.message.substring(0, this.config.maxMessageLength) + '...';
      }

      // Validate context size
      if (request.context && JSON.stringify(request.context).length > this.config.maxContextSize) {
        request.context = { 
          ...request.context, 
          _truncated: true,
          _originalSize: JSON.stringify(request.context).length 
        };
      }

      // Create log event for EventBus
      const logEvent = this.eventFactory.createLogEvent({
        actor: request.actor,
        action: request.action,
        scope: request.scope,
        target: request.target,
        severityType: request.severityType,
        severityLevel: request.severityLevel ?? this.getDefaultLevelForType(request.severityType),
        userId: request.userId ?? '',
        sessionId: request.sessionId ?? '',
        traceId: request.traceId ?? '',
        parentEventId: request.parentEventId ?? '',
        payload: {
          message: request.message,
          context: request.context ?? {},
          sourceComponent: request.sourceComponent,
          sourceFile: request.sourceFile ?? '',
          lineNumber: request.lineNumber ?? 0,
          stackTrace: request.stackTrace ?? '',
          ipAddress: request.ipAddress,
          userAgent: request.userAgent
        },
        message: request.message,
        context: request.context ?? {},
        sourceFile: request.sourceFile ?? '',
        lineNumber: request.lineNumber ?? 0,
        stackTrace: request.stackTrace ?? '',
        correlationId: request.correlationId ?? ''
      });

      // Publish to EventBus for other services
      await this.eventBus.publish(logEvent);

      // Store in database
      const logEntry = await this.storeLogEntry(request);

      // Add to batch for file logging if enabled
      if (this.config.enableFileLogging) {
        this.logBuffer.push(request);
      }

      return logEntry;

    } catch (error) {
      console.error('Failed to log message:', error);
      throw error;
    }
  }

  /**
   * Convenience methods for different log levels
   */
  async debug(
    actor: string, action: string, scope: string, target: string,
    message: string, context?: Record<string, any>, sourceComponent: string = 'system'
  ): Promise<LogEntry> {
    return this.log({
      actor, action, scope, target,
      severityType: 'debug',
      severityLevel: 'low',
      message,
      ...(context !== undefined ? { context } : {}),
      sourceComponent
    });
  }

  async info(
    actor: string, action: string, scope: string, target: string,
    message: string, context?: Record<string, any>, sourceComponent: string = 'system'
  ): Promise<LogEntry> {
    return this.log({
      actor, action, scope, target,
      severityType: 'info',
      severityLevel: 'medium',
      message,
      ...(context !== undefined ? { context } : {}),
      sourceComponent
    });
  }

  async warn(
    actor: string, action: string, scope: string, target: string,
    message: string, context?: Record<string, any>, sourceComponent: string = 'system'
  ): Promise<LogEntry> {
    return this.log({
      actor, action, scope, target,
      severityType: 'warn',
      severityLevel: 'high',
      message,
      ...(context !== undefined ? { context } : {}),
      sourceComponent
    });
  }

  async error(
    actor: string, 
    action: string, 
    scope: string, 
    target: string,
    message: string, 
    options?: { context?: Record<string, any>; sourceComponent?: string; stackTrace?: string }
  ): Promise<LogEntry> {
    const { context, sourceComponent = 'system', stackTrace } = options ?? {};
    return this.log({
      actor, 
      action, 
      scope, 
      target,
      severityType: 'error',
      severityLevel: 'highest',
      message,
      ...(context !== undefined ? { context } : {}),
      sourceComponent,
      ...(stackTrace !== undefined ? { stackTrace } : {})
    });
  }

  /**
   * Log with automatic pattern detection
   */
  async logFromSource(
    source: string,
    action: string,
    severityType: string,
    message: string,
    context?: Record<string, any>
  ): Promise<LogEntry> {
    const { actor, scope, target } = this.detectPatternFromSource(source);
    
    return this.log({
      actor,
      action,
      scope,
      target,
      severityType,
      message,
      ...(context !== undefined ? { context } : {}),
      sourceComponent: source
    });
  }

  /**
   * Search logs using the search service
   */
  async searchLogs(query: LogSearchQuery) {
    if (!this.config.enableSearch) {
      throw new Error('Log search is disabled');
    }
    
    return this.searchService.searchLogs(query);
  }

  /**
   * Get log patterns analysis
   */
  async analyzePatterns(hoursBack: number = 24) {
    return this.searchService.analyzePatterns(hoursBack);
  }

  /**
   * Get logs by trace for distributed tracing
   */
  async getLogsByTrace(traceId: string) {
    return this.searchService.getLogsByTrace(traceId);
  }

  /**
   * Get filter options for UI
   */
  async getFilterOptions() {
    return this.searchService.getFilterOptions();
  }

  /**
   * EventHandler implementation - handle log events from EventBus
   */
  async handle(event: ObservabilityEvent): Promise<void> {
    if (event.type === 'observability.log') {
      // This event was already processed by this service, skip to avoid loops
      return;
    }

    // Convert other events to log entries
    const logRequest: LogRequest = {
      actor: (event.pattern ?? '').split('.')[0] ?? '',
      action: (event.pattern ?? '').split('.')[1] ?? '',
      scope: (event.pattern ?? '').split('.')[2] ?? '',
      target: (event.pattern ?? '').split('.')[3] ?? '',
      severityType: event.metadata.severity?.type ?? 'info',
      severityLevel: event.metadata.severity?.level ?? 'medium',
      message: `Event: ${event.type}`,
      context: event.payload,
      sourceComponent: event.metadata.source,
      correlationId: event.metadata.correlationId,
      traceId: event.payload.traceId,
      userId: event.payload.userId,
      sessionId: event.payload.sessionId
    };

    await this.storeLogEntry(logRequest);
  }

  /**
   * Check if this handler can process the event
   */
  canHandle(eventType: string, pattern: string): boolean {
    // Handle all observability events except our own logs
    return eventType.startsWith('observability.') && eventType !== 'observability.log';
  }

  /**
   * Store log entry in database
   */
  private async storeLogEntry(request: LogRequest): Promise<LogEntry> {
    // Resolve Actor.Action.Scope.Target components
    const [actor, action, scope, target, severity] = await Promise.all([
      this.resolveActor(request.actor),
      this.resolveAction(request.action),
      this.resolveScope(request.scope),
      this.resolveTarget(request.target),
      this.resolveSeverity(request.severityType, request.severityLevel)
    ]);

    const correlationId = request.correlationId ?? createId();
    const pattern = `${request.actor}.${request.action}.${request.scope}.${request.target}`;

    // Insert into log_entry table
    const result = await this.db.execute(sql`
      INSERT INTO log_entry (
        event_actor_id, event_action_id, event_scope_id, event_target_id,
        severity_id, message, context, correlation_id, trace_id, parent_event_id,
        user_id, session_id, source_component, source_file, line_number,
        stack_trace, ip_address, user_agent, created_by
      ) VALUES (
        ${actor.id}, ${action.id}, ${scope.id}, ${target.id},
        ${severity.id}, ${request.message}, ${JSON.stringify(request.context ?? {})},
        ${correlationId}, ${request.traceId}, ${request.parentEventId},
        ${request.userId}, ${request.sessionId}, ${request.sourceComponent},
        ${request.sourceFile}, ${request.lineNumber}, ${request.stackTrace},
        ${request.ipAddress}, ${request.userAgent}, 'logging-service'
      ) RETURNING id, logged_at
    `) as any;

    return {
      id: result[0].id,
      pattern,
      message: request.message,
      severityType: request.severityType,
      severityLevel: request.severityLevel ?? this.getDefaultLevelForType(request.severityType),
      sourceComponent: request.sourceComponent,
      context: request.context ?? {},
      loggedAt: new Date(result[0].logged_at),
      correlationId
    };
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.eventBus.registerHandler('observability.audit', this);
    this.eventBus.registerHandler('observability.error', this);
    this.eventBus.registerHandler('observability.lifecycle', this);
    this.eventBus.registerHandler('observability.event', this);
  }

  /**
   * Setup batch processor for file logging
   */
  private setupBatchProcessor(): void {
    if (!this.config.enableFileLogging) return;

    this.flushTimer = setInterval(async () => {
      if (this.logBuffer.length > 0) {
        await this.flushLogBuffer();
      }
    }, this.config.flushIntervalMs);
  }

  /**
   * Flush log buffer to file
   */
  private async flushLogBuffer(): Promise<void> {
    if (!this.config.enableFileLogging || this.logBuffer.length === 0) return;

    const logs = [...this.logBuffer];
    this.logBuffer = [];

    try {
      const fs = await import('fs/promises');
      const logLines = logs.map(log => 
        JSON.stringify({
          timestamp: new Date().toISOString(),
          pattern: `${log.actor}.${log.action}.${log.scope}.${log.target}`,
          severity: `${log.severityType}.${log.severityLevel ?? this.getDefaultLevelForType(log.severityType)}`,
          message: log.message,
          context: log.context,
          source: log.sourceComponent,
          correlationId: log.correlationId
        })
      ).join('\n') + '\n';

      await fs.appendFile(this.config.logFilePath ?? 'logs/application.log', logLines);
    } catch (error) {
      console.error('Failed to write logs to file:', error);
    }
  }

  /**
   * Pattern detection helpers
   */
  private detectPatternFromSource(source: string): { actor: string; scope: string; target: string } {
    if (source.includes('user')) {
      return { actor: 'user', scope: 'domain', target: 'resource' };
    } else if (source.includes('system')) {
      return { actor: 'system', scope: 'system', target: 'service' };
    } else if (source.includes('service')) {
      return { actor: 'service', scope: 'api', target: 'endpoint' };
    } else {
      return { actor: 'system', scope: 'system', target: 'component' };
    }
  }

  /**
   * Repository resolution methods
   */
  private async resolveActor(name: string) {
    const actor = await this.actorRepo.findByName(name);
    if (!actor) throw new Error(`Unknown actor: ${name}`);
    return actor;
  }

  private async resolveAction(name: string) {
    const action = await this.actionRepo.findByName(name);
    if (!action) throw new Error(`Unknown action: ${name}`);
    return action;
  }

  private async resolveScope(name: string) {
    const scope = await this.scopeRepo.findByName(name);
    if (!scope) throw new Error(`Unknown scope: ${name}`);
    return scope;
  }

  private async resolveTarget(name: string) {
    const target = await this.targetRepo.findByName(name);
    if (!target) throw new Error(`Unknown target: ${name}`);
    return target;
  }

  private async resolveSeverity(type: string, level?: string) {
    const effectiveLevel = level ?? this.getDefaultLevelForType(type);
    const severity = await this.severityRepo.findByTypeAndLevel(type, effectiveLevel);
    if (!severity) throw new Error(`Unknown severity: ${type}.${effectiveLevel}`);
    return severity;
  }

  private getDefaultLevelForType(type: string): string {
    const defaults: Record<string, string> = {
      'debug': 'low',
      'info': 'medium',
      'warn': 'medium',
      'error': 'high',
      'audit': 'medium',
      'lifecycle': 'low'
    };
    return defaults[type] ?? 'medium';
  }

  /**
   * Cleanup resources
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Flush remaining logs
    await this.flushLogBuffer();
    
    console.log('LoggingService shutdown complete');
  }
}