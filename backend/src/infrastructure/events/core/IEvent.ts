import { EventType } from '../../../types/core/enums';

export interface IEvent {
  readonly id: string;
  readonly type: EventType;
  readonly timestamp: Date;
  readonly source: string;
  readonly payload: unknown;
  readonly originUserId?: string;
  readonly sessionId?: string;
  readonly traceId?: string;
  readonly context?: string;
  readonly handledBy?: readonly string[];
  readonly metadata?: Record<string, unknown>;
}

