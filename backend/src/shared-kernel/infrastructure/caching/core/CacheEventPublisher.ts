import { CacheEvent } from "@/types/shared/infrastructure/caching";
import { ICacheEventListener } from "../interfaces/ICache";

/**
 * Cache event publisher - single responsibility for event management
 */
export class CacheEventPublisher {
  private readonly listeners: Set<ICacheEventListener> = new Set();

  subscribe(listener: ICacheEventListener): void {
    this.listeners.add(listener);
  }

  unsubscribe(listener: ICacheEventListener): void {
    this.listeners.delete(listener);
  }

  async publish(event: CacheEvent): Promise<void> {
    const promises = Array.from(this.listeners).map(listener =>
      listener.onCacheEvent(event).catch(error =>
        console.error('Cache event listener error:', error)
      )
    );

    await Promise.allSettled(promises);
  }

  getListenerCount(): number {
    return this.listeners.size;
  }

  clear(): void {
    this.listeners.clear();
  }
}

