import { EventType } from '../../../types/core/enums';
import { IEvent } from './IEvent';
import { IEventHandler } from './IEventHandler';

export class EventBus {
  private readonly handlers: IEventHandler[] = [];
  private readonly eventHistory: IEvent[] = [];
  private readonly maxHistorySize: number;

  constructor(maxHistorySize: number = 1000) {
    this.maxHistorySize = maxHistorySize;
  }

  register(handler: IEventHandler): void {
    if (!this.handlers.includes(handler)) {
      this.handlers.push(handler);
      this.sortHandlersByPriority();
    }
  }

  unregister(handler: IEventHandler): void {
    const index = this.handlers.indexOf(handler);
    if (index > -1) {
      this.handlers.splice(index, 1);
    }
  }

  async emit(event: IEvent): Promise<void> {
    try {
      await this.processEvent(event);
      this.addToHistory(event);
    } catch (error) {
      this.handleEmitError(event, error);
    }
  }

  getHandlers(eventType: EventType): readonly IEventHandler[] {
    return this.handlers.filter(handler => handler.supports(eventType));
  }

  getEventHistory(limit?: number): readonly IEvent[] {
    const historyLimit = limit ?? this.eventHistory.length;
    return this.eventHistory.slice(-historyLimit);
  }

  clearHistory(): void {
    this.eventHistory.length = 0;
  }

  getHandlerCount(): number {
    return this.handlers.length;
  }

  private async processEvent(event: IEvent): Promise<void> {
    const applicableHandlers = this.getHandlers(event.type);
    
    if (applicableHandlers.length === 0) {
      return;
    }

    await this.executeHandlers(event, applicableHandlers);
  }

  private async executeHandlers(event: IEvent, handlers: readonly IEventHandler[]): Promise<void> {
    const handlerPromises = handlers.map(handler => this.executeHandler(event, handler));
    await Promise.allSettled(handlerPromises);
  }

  private async executeHandler(event: IEvent, handler: IEventHandler): Promise<void> {
    try {
      await handler.handle(event);
      this.markEventHandled(event, handler);
    } catch (error) {
      this.handleHandlerError(event, handler, error);
    }
  }

  private markEventHandled(event: IEvent, handler: IEventHandler): void {
    const handlerName = handler.constructor.name;
    if ('addHandler' in event && typeof event.addHandler === 'function') {
      (event as any).addHandler(handlerName);
    }
  }

  private sortHandlersByPriority(): void {
    this.handlers.sort((a, b) => {
      const priorityA = a.priority ?? 0;
      const priorityB = b.priority ?? 0;
      return priorityB - priorityA; // Higher priority first
    });
  }

  private addToHistory(event: IEvent): void {
    this.eventHistory.push(event);
    this.maintainHistorySize();
  }

  private maintainHistorySize(): void {
    if (this.eventHistory.length > this.maxHistorySize) {
      const excessCount = this.eventHistory.length - this.maxHistorySize;
      this.eventHistory.splice(0, excessCount);
    }
  }

  private handleEmitError(event: IEvent, error: unknown): void {
    console.error(`EventBus: Failed to emit event ${event.id}:`, error);
  }

  private handleHandlerError(event: IEvent, handler: IEventHandler, error: unknown): void {
    const handlerName = handler.constructor.name;
    console.error(`EventBus: Handler ${handlerName} failed for event ${event.id}:`, error);
  }
}