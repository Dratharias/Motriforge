import { Database } from '~/database/connection';
import {
  SeverityRepository,
  EventActorRepository,
  EventActionRepository,
  EventScopeRepository,
  EventTargetRepository,
  EventLogRepository
} from '../../repositories/observability';
import { createId } from '@paralleldrive/cuid2';

export interface EventRequest {
  actor: string;
  action: string;
  scope: string;
  target: string;
  severityType: string;
  severityLevel?: string;
  userId?: string;
  sessionId?: string;
  traceId?: string;
  parentEventId?: string;
  eventData: Record<string, any>;
  contextData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdBy: string;
}

export interface ProcessedEvent {
  id: string;
  pattern: string;
  eventData: Record<string, any>;
  processedAt: Date;
  status: 'success' | 'failed';
  errorDetails?: string;
}

export interface EventServiceError {
  code: string;
  message: string;
  details?: any;
}

export class EventService {
  private readonly severityRepo: SeverityRepository;
  private readonly actorRepo: EventActorRepository;
  private readonly actionRepo: EventActionRepository;
  private readonly scopeRepo: EventScopeRepository;
  private readonly targetRepo: EventTargetRepository;
  private readonly eventLogRepo: EventLogRepository;

  constructor(db: Database) {
    this.severityRepo = new SeverityRepository(db);
    this.actorRepo = new EventActorRepository(db);
    this.actionRepo = new EventActionRepository(db);
    this.scopeRepo = new EventScopeRepository(db);
    this.targetRepo = new EventTargetRepository(db);
    this.eventLogRepo = new EventLogRepository(db);
  }

  /**
   * Process and store an event following Actor.Action.Scope.Target pattern
   */
  async processEvent(request: EventRequest): Promise<ProcessedEvent> {
    try {
      // Validate and resolve Actor.Action.Scope.Target components
      const [actor, action, scope, target, severity] = await Promise.all([
        this.resolveActor(request.actor),
        this.resolveAction(request.action),
        this.resolveScope(request.scope),
        this.resolveTarget(request.target),
        this.resolveSeverity(request.severityType, request.severityLevel)
      ]);

      // Generate IDs if not provided
      const traceId = request.traceId ?? createId();
      const pattern = `${request.actor}.${request.action}.${request.scope}.${request.target}`;

      // Create event log entry
      const eventLogEntry = await this.eventLogRepo.create({
        eventActorId: actor.id,
        eventActionId: action.id,
        eventScopeId: scope.id,
        eventTargetId: target.id,
        severityId: severity.id,
        userId: request.userId ?? null,
        sessionId: request.sessionId ?? null,
        traceId,
        parentEventId: request.parentEventId ?? null,
        eventData: request.eventData,
        contextData: request.contextData ?? null,
        ipAddress: request.ipAddress ?? null,
        userAgent: request.userAgent ?? null,
        status: 'completed',
        errorDetails: null,
        createdBy: request.createdBy,
        occurredAt: new Date(),
        isActive: true
      });

      return {
        id: eventLogEntry.id,
        pattern,
        eventData: request.eventData,
        processedAt: new Date(),
        status: 'success'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        id: createId(),
        pattern: `${request.actor}.${request.action}.${request.scope}.${request.target}`,
        eventData: request.eventData,
        processedAt: new Date(),
        status: 'failed',
        errorDetails: errorMessage
      };
    }
  }

  /**
   * Validate Actor.Action.Scope.Target pattern
   */
  async validatePattern(actor: string, action: string, scope: string, target: string): Promise<boolean> {
    try {
      await Promise.all([
        this.resolveActor(actor),
        this.resolveAction(action),
        this.resolveScope(scope),
        this.resolveTarget(target)
      ]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get events by trace ID for distributed tracing
   */
  async getEventsByTrace(traceId: string): Promise<any[]> {
    return this.eventLogRepo.findByTraceId(traceId);
  }

  /**
   * Get child events for event hierarchy
   */
  async getChildEvents(parentEventId: string): Promise<any[]> {
    return this.eventLogRepo.findChildEvents(parentEventId);
  }

  /**
   * Get events by pattern with pagination
   */
  async getEventsByPattern(
    actor: string,
    action: string,
    scope: string,
    target: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<any[]> {
    try {
      const [actorType, actionType, scopeType, targetType] = await Promise.all([
        this.resolveActor(actor),
        this.resolveAction(action),
        this.resolveScope(scope),
        this.resolveTarget(target)
      ]);

      return this.eventLogRepo.findByFilters({
        actorId: actorType.id,
        actionId: actionType.id,
        scopeId: scopeType.id,
        targetId: targetType.id
      }, options);
    } catch (error) {
      console.error('Failed to resolve event pattern:', error);
      return [];
    }
  }

  private async resolveActor(name: string) {
    const actor = await this.actorRepo.findByName(name);
    if (!actor) {
      throw new Error(`Unknown actor: ${name}`);
    }
    return actor;
  }

  private async resolveAction(name: string) {
    const action = await this.actionRepo.findByName(name);
    if (!action) {
      throw new Error(`Unknown action: ${name}`);
    }
    return action;
  }

  private async resolveScope(name: string) {
    const scope = await this.scopeRepo.findByName(name);
    if (!scope) {
      throw new Error(`Unknown scope: ${name}`);
    }
    return scope;
  }

  private async resolveTarget(name: string) {
    const target = await this.targetRepo.findByName(name);
    if (!target) {
      throw new Error(`Unknown target: ${name}`);
    }
    return target;
  }

  private async resolveSeverity(type: string, level?: string) {
    // If level is not provided, use default for the type
    const effectiveLevel = level ?? this.getDefaultLevelForType(type);

    const severity = await this.severityRepo.findByTypeAndLevel(type, effectiveLevel);
    if (!severity) {
      throw new Error(`Unknown severity: ${type}.${effectiveLevel}`);
    }
    return severity;
  }

  private getDefaultLevelForType(type: string): string {
    const defaults = {
      'debug': 'low',
      'info': 'medium',
      'warn': 'medium',
      'error': 'high',
      'audit': 'medium',
      'lifecycle': 'low'
    };
    return defaults[type as keyof typeof defaults] ?? 'medium';
  }
}
