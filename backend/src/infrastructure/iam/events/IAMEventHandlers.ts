import { IEventHandler } from '../../events/core/IEventHandler';
import { IEvent } from '../../events/core/IEvent';
import { EventType } from '../../../types/core/enums';
import { AccessEvent } from './AccessEvent';

export class AccessLogHandler implements IEventHandler {
  readonly priority = 100;

  supports(eventType: EventType): boolean {
    return eventType === EventType.ACCESS || eventType === EventType.SECURITY;
  }

  async handle(event: IEvent): Promise<void> {
    if (event instanceof AccessEvent) {
      const payload = event.getAccessPayload();
      const logLevel = payload.granted ? 'info' : 'warn';
      
      console.log(`[IAM ${logLevel.toUpperCase()}] User ${payload.userId} ${payload.action} on ${payload.resource}: ${payload.granted ? 'GRANTED' : 'DENIED'}${payload.reason ? "(" + payload.reason : ''}`);
    }
  }
}

export class SecurityAlertHandler implements IEventHandler {
  readonly priority = 50;

  supports(eventType: EventType): boolean {
    return eventType === EventType.SECURITY;
  }

  async handle(event: IEvent): Promise<void> {
    if (event instanceof AccessEvent && !event.isAccessGranted()) {
      const payload = event.getAccessPayload();
      
      // Log security violations
      console.warn(`[SECURITY ALERT] Access denied for user ${payload.userId} on ${payload.resource}:${payload.action}`);
      
      // TODO: Implement alerting logic (email, Slack, etc.)
    }
  }
}

