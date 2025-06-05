import type { RateLimitConfig, RateLimitResult } from '@/shared/types/auth';

interface RateLimitEntry {
  readonly count: number;
  readonly resetTime: Date;
}

export class RateLimitManager {
  private readonly store = new Map<string, RateLimitEntry>();
  private readonly cleanupInterval = 60 * 1000; // 1 minute
  private cleanupTimer?: NodeJS.Timeout | undefined;

  constructor() {
    this.startCleanupTimer();
  }

  checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
    const now = new Date();
    const entry = this.store.get(key);

    if (!entry || now >= entry.resetTime) {
      // Create new entry or reset expired entry
      const resetTime = new Date(now.getTime() + config.windowMs);
      this.store.set(key, { count: 1, resetTime });
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime,
      };
    }

    if (entry.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.resetTime.getTime() - now.getTime()) / 1000),
      };
    }

    // Increment counter
    this.store.set(key, { 
      count: entry.count + 1, 
      resetTime: entry.resetTime,
    });

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count - 1,
      resetTime: entry.resetTime,
    };
  }

  resetCounter(key: string): void {
    this.store.delete(key);
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      const now = new Date();
      for (const [key, entry] of this.store.entries()) {
        if (now >= entry.resetTime) {
          this.store.delete(key);
        }
      }
    }, this.cleanupInterval);
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }
}