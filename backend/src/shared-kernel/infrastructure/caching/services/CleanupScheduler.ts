
import { ICacheCore, ICacheMetricsCollector } from '../interfaces/ICache';
import { IEvictionStrategy } from '../strategies/eviction/IEvictionStrategy';

/**
 * Cleanup scheduler - handles background cleanup tasks
 */
export class CleanupScheduler {
  private cleanupInterval?: NodeJS.Timeout;
  private evictionInterval?: NodeJS.Timeout;
  private isRunning = false;

  constructor(
    private readonly core: ICacheCore,
    private readonly evictionStrategy: IEvictionStrategy,
    private readonly metricsCollector: ICacheMetricsCollector,
    private readonly options: {
      cleanupIntervalMs: number;
      evictionIntervalMs: number;
      maxCapacity: number;
      evictionBatchSize: number;
    }
  ) {}

  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Schedule expired entry cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries().catch(error =>
        console.error('Cleanup expired entries failed:', error)
      );
    }, this.options.cleanupIntervalMs);

    // Schedule capacity-based eviction
    this.evictionInterval = setInterval(() => {
      this.performEviction().catch(error =>
        console.error('Cache eviction failed:', error)
      );
    }, this.options.evictionIntervalMs);
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    if (this.evictionInterval) {
      clearInterval(this.evictionInterval);
      this.evictionInterval = undefined;
    }
  }

  async performCleanup(): Promise<{ expiredRemoved: number; evicted: number }> {
    const expiredRemoved = await this.cleanupExpiredEntries();
    const evicted = await this.performEviction();

    return { expiredRemoved, evicted };
  }

  private async cleanupExpiredEntries(): Promise<number> {
    try {
      const expiredKeys = await this.core.getExpiredKeys();
      
      if (expiredKeys.length === 0) {
        return 0;
      }

      const removed = await this.core.evictKeys(expiredKeys);
      
      // Record evictions in metrics
      for (const key of expiredKeys) {
        this.metricsCollector.recordEviction(key, 'expired');
      }

      return removed;
    } catch (error) {
      console.error('Failed to cleanup expired entries:', error);
      return 0;
    }
  }

  private async performEviction(): Promise<number> {
    try {
      const currentSize = await this.core.size();
      
      if (currentSize <= this.options.maxCapacity) {
        return 0;
      }

      const targetEvictions = Math.min(
        this.options.evictionBatchSize,
        currentSize - this.options.maxCapacity
      );

      const entries = await this.core.getEntriesByPriority();
      const keysToEvict = this.evictionStrategy.selectKeysToEvict(entries, targetEvictions);
      
      if (keysToEvict.length === 0) {
        return 0;
      }

      const evicted = await this.core.evictKeys(keysToEvict);
      
      // Record evictions in metrics
      for (const key of keysToEvict) {
        this.metricsCollector.recordEviction(key, 'capacity');
      }

      return evicted;
    } catch (error) {
      console.error('Failed to perform eviction:', error);
      return 0;
    }
  }

  isActive(): boolean {
    return this.isRunning;
  }

  getStatus(): {
    running: boolean;
    nextCleanup: Date | null;
    nextEviction: Date | null;
  } {
    return {
      running: this.isRunning,
      nextCleanup: this.cleanupInterval ? new Date(Date.now() + this.options.cleanupIntervalMs) : null,
      nextEviction: this.evictionInterval ? new Date(Date.now() + this.options.evictionIntervalMs) : null
    };
  }
}

