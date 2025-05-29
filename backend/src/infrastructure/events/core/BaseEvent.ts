import { EventType } from '../../../types/core/enums';
import { IEvent } from './IEvent';

export class BaseEvent implements IEvent {
  public readonly id: string;
  public readonly type: EventType;
  public readonly timestamp: Date;
  public readonly source: string;
  public readonly payload: unknown;
  public readonly originUserId?: string;
  public readonly sessionId?: string;
  public readonly traceId?: string;
  public readonly context?: string;
  public readonly handledBy: string[];
  public readonly metadata: Record<string, unknown>;

  constructor(data: {
    type: EventType;
    source: string;
    payload: unknown;
    originUserId?: string;
    sessionId?: string;
    traceId?: string;
    context?: string;
    metadata?: Record<string, unknown>;
  }) {
    this.id = this.generateEventId();
    this.type = data.type;
    this.timestamp = new Date();
    this.source = data.source;
    this.payload = data.payload;
    this.originUserId = data.originUserId;
    this.sessionId = data.sessionId;
    this.traceId = data.traceId;
    this.context = data.context;
    this.handledBy = [];
    this.metadata = data.metadata ?? {};
  }

  addHandler(handlerName: string): void {
    if (!this.handledBy.includes(handlerName)) {
      this.handledBy.push(handlerName);
    }
  }

  isHandledBy(handlerName: string): boolean {
    return this.handledBy.includes(handlerName);
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

