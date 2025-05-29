import { EventType } from '../../../types/core/enums';
import { IEvent } from './IEvent';

export interface IEventHandler {
  supports(eventType: EventType): boolean;
  handle(event: IEvent): Promise<void>;
  readonly priority?: number;
}

