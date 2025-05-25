import { LogEntry } from "@/types/shared/infrastructure/logging";
import { ILogEventPublisher, ILogEventListener } from "../interfaces/ILogger";

/**
 * Event publisher for logging events - single responsibility for event management
 */
export class LogEventPublisher implements ILogEventPublisher {
  private readonly listeners: Set<ILogEventListener> = new Set();

  subscribe(listener: ILogEventListener): void {
    this.listeners.add(listener);
  }

  unsubscribe(listener: ILogEventListener): void {
    this.listeners.delete(listener);
  }

  async publishLogEntry(entry: LogEntry): Promise<void> {
    const promises = Array.from(this.listeners).map(listener =>
      listener.onLogEntry(entry).catch(error =>
        console.error('Log event listener error:', error)
      )
    );

    await Promise.allSettled(promises);
  }

  async publishError(error: Error, entry?: LogEntry): Promise<void> {
    const promises = Array.from(this.listeners).map(listener =>
      listener.onError(error, entry).catch(listenerError =>
        console.error('Log event listener error:', listenerError)
      )
    );

    await Promise.allSettled(promises);
  }

  async publishFlush(): Promise<void> {
    const promises = Array.from(this.listeners).map(listener =>
      listener.onFlush().catch(error =>
        console.error('Log event listener error:', error)
      )
    );

    await Promise.allSettled(promises);
  }
}

