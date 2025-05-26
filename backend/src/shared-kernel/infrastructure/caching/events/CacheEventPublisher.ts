
import { CacheEvent } from '@/types/shared/infrastructure/caching';
import { ICacheEventListener, ICacheEventPublisher } from '../interfaces/ICache';

/**
 * Cache event publisher - observer pattern for cache events
 */
export class CacheEventPublisher implements ICacheEventPublisher {
  private readonly listeners = new Set<ICacheEventListener>();
  private readonly eventHistory: CacheEvent[] = [];
  private readonly maxHistorySize: number;

  constructor(maxHistorySize: number = 1000) {
    this.maxHistorySize = maxHistorySize;
  }

  subscribe(listener: ICacheEventListener): void {
    this.listeners.add(listener);
  }

  unsubscribe(listener: ICacheEventListener): void {
    this.listeners.delete(listener);
  }

  async publish(event: CacheEvent): Promise<void> {
    // Add to history
    this.eventHistory.push(event);
    
    // Trim history if needed
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Notify listeners
    const promises = Array.from(this.listeners).map(listener =>
      listener.onCacheEvent(event).catch(error =>
        console.error('Cache event listener error:', error)
      )
    );

    await Promise.allSettled(promises);
  }

  getEventHistory(limit?: number): CacheEvent[] {
    const events = [...this.eventHistory];
    return limit ? events.slice(-limit) : events;
  }

  getListenerCount(): number {
    return this.listeners.size;
  }

  clear(): void {
    this.listeners.clear();
    this.eventHistory.length = 0;
  }

  clearHistory(): void {
    this.eventHistory.length = 0;
  }
}

