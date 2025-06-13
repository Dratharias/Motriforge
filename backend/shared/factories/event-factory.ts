import { createId } from '@paralleldrive/cuid2';
import { ObservabilityEvent } from '../event-bus/event-bus';

export interface EventCreationRequest {
  actor: string;
  action: string;
  scope: string;
  target: string;
  severityType?: string;
  severityLevel?: string;
  userId?: string;
  sessionId?: string;
  traceId?: string;
  parentEventId?: string;
  payload: Record<string, any>;
  source?: string;
  correlationId?: string;
}

export interface LogEventRequest extends EventCreationRequest {
  message: string;
  context?: Record<string, any>;
  sourceFile?: string;
  lineNumber?: number;
  stackTrace?: string;
}

export interface AuditEventRequest extends EventCreationRequest {
  auditType: 'security' | 'compliance' | 'data_access' | 'permission' | 'financial' | 'user_action';
  resourceId?: string;
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  riskScore?: number;
}

export interface ErrorEventRequest extends EventCreationRequest {
  errorType: 'validation' | 'system' | 'network' | 'database' | 'business' | 'authentication' | 'authorization';
  errorCode?: string;
  message: string;
  stackTrace?: string;
  context?: Record<string, any>;
}

export interface LifecycleEventRequest extends EventCreationRequest {
  lifecycleType: 'retention' | 'deletion' | 'archival' | 'compliance' | 'migration' | 'backup';
  resourceType: 'user_data' | 'workout_data' | 'media_files' | 'financial_data' | 'system_logs' | 'audit_trails';
  resourceId: string;
  retentionPolicy?: string;
  dataSize?: number;
}

export class EventFactory {
  private static instance: EventFactory;

  constructor(private readonly defaultSource: string = 'observability-system') { }

  static getInstance(defaultSource?: string): EventFactory {
    if (!EventFactory.instance) {
      EventFactory.instance = new EventFactory(defaultSource);
    }
    return EventFactory.instance;
  }

  /**
   * Create a generic observability event
   */
  createEvent(request: EventCreationRequest): ObservabilityEvent {
    const pattern = `${request.actor}.${request.action}.${request.scope}.${request.target}`;
    const correlationId = request.correlationId ?? createId();

    return {
      id: createId(),
      type: 'observability.event',
      pattern,
      payload: {
        ...request.payload,
        userId: request.userId,
        sessionId: request.sessionId,
        traceId: request.traceId ?? correlationId,
        parentEventId: request.parentEventId
      },
      metadata: {
        timestamp: new Date(),
        correlationId,
        source: request.source ?? this.defaultSource,
        ...(request.severityType
          ? {
            severity: {
              type: request.severityType,
              level: request.severityLevel ?? this.getDefaultLevelForType(request.severityType)
            }
          }
          : {})
      }
    };
  }

  /**
   * Create a logging event
   */
  createLogEvent(request: LogEventRequest): ObservabilityEvent {
    const baseEvent = this.createEvent(request);

    return {
      ...baseEvent,
      type: 'observability.log',
      payload: {
        ...baseEvent.payload,
        message: request.message,
        context: request.context,
        sourceFile: request.sourceFile,
        lineNumber: request.lineNumber,
        stackTrace: request.stackTrace
      }
    };
  }

  /**
   * Create an audit event
   */
  createAuditEvent(request: AuditEventRequest): ObservabilityEvent {
    const baseEvent = this.createEvent(request);

    return {
      ...baseEvent,
      type: 'observability.audit',
      payload: {
        ...baseEvent.payload,
        auditType: request.auditType,
        resourceId: request.resourceId,
        beforeState: request.beforeState,
        afterState: request.afterState,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        riskScore: request.riskScore
      }
    };
  }

  /**
   * Create an error event
   */
  createErrorEvent(request: ErrorEventRequest): ObservabilityEvent {
    const baseEvent = this.createEvent({
      ...request,
      severityType: request.severityType ?? 'error',
      severityLevel: request.severityLevel ?? 'high'
    });

    return {
      ...baseEvent,
      type: 'observability.error',
      payload: {
        ...baseEvent.payload,
        errorType: request.errorType,
        errorCode: request.errorCode,
        message: request.message,
        stackTrace: request.stackTrace,
        context: request.context
      }
    };
  }

  /**
   * Create a lifecycle event
   */
  createLifecycleEvent(request: LifecycleEventRequest): ObservabilityEvent {
    const baseEvent = this.createEvent({
      ...request,
      severityType: request.severityType ?? 'lifecycle',
      severityLevel: request.severityLevel ?? 'medium'
    });

    return {
      ...baseEvent,
      type: 'observability.lifecycle',
      payload: {
        ...baseEvent.payload,
        lifecycleType: request.lifecycleType,
        resourceType: request.resourceType,
        resourceId: request.resourceId,
        retentionPolicy: request.retentionPolicy,
        dataSize: request.dataSize
      }
    };
  }

  /**
   * Create a batch of events efficiently
   */
  createEventBatch(requests: EventCreationRequest[]): ObservabilityEvent[] {
    const correlationId = createId();

    return requests.map(request =>
      this.createEvent({
        ...request,
        correlationId: request.correlationId ?? correlationId
      })
    );
  }

  /**
   * Create event from existing pattern for chaining
   */
  createChildEvent(
    parentEvent: ObservabilityEvent,
    request: Partial<EventCreationRequest>
  ): ObservabilityEvent {
    const [actor, action, scope, target] = parentEvent.pattern ? parentEvent.pattern.split('.') : [undefined, undefined, undefined, undefined];

    return this.createEvent({
      actor: actor ?? 'unknown',
      action: action ?? 'unknown',
      scope: scope ?? 'unknown',
      target: target ?? 'unknown',
      ...request,
      parentEventId: parentEvent.id,
      traceId: parentEvent.payload.traceId,
      correlationId: parentEvent.metadata.correlationId,
      payload: {
        ...parentEvent.payload,
        ...request.payload
      }
    });
  }

  /**
   * Validate event pattern
   */
  validatePattern(actor: string, action: string, scope: string, target: string): boolean {
    const isValidComponent = (component: string) =>
      typeof component === 'string' &&
      component.length > 0 &&
      component.length <= 50 &&
      /^[a-z][a-z0-9_]*$/.test(component);

    return [actor, action, scope, target].every(isValidComponent);
  }

  /**
   * Get default severity level for type
   */
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
   * Create event with automatic pattern detection from source
   */
  createEventFromSource(
    source: string,
    action: string,
    payload: Record<string, any>,
    options: Partial<EventCreationRequest> = {}
  ): ObservabilityEvent {
    // Auto-detect pattern components from source
    const { actor, scope, target } = this.detectPatternFromSource(source);

    return this.createEvent({
      actor,
      action,
      scope,
      target,
      payload,
      source,
      ...options
    });
  }

  /**
   * Detect pattern components from source string
   */
  private detectPatternFromSource(source: string): { actor: string; scope: string; target: string } {
    // Simple heuristics for pattern detection
    if (source.includes('user')) {
      return { actor: 'user', scope: 'domain', target: 'resource' };
    } else if (source.includes('system')) {
      return { actor: 'system', scope: 'system', target: 'service' };
    } else if (source.includes('service')) {
      return { actor: 'service', scope: 'api', target: 'endpoint' };
    } else {
      return { actor: 'system', scope: 'system', target: 'unknown' };
    }
  }
}

// Export singleton instance
export const eventFactory = EventFactory.getInstance();