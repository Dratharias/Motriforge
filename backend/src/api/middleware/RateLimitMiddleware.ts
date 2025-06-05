import type { Middleware, RequestContext, NextFunction } from '@/shared/types/api';
import { ApiConfigFactory } from '@/config/api.config';
import { Logger } from '@/utils/Logger';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class RateLimitMiddleware implements Middleware {
  private readonly rateLimitStore: Map<string, RateLimitEntry> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly logger: Logger;

  constructor() {
    const config = ApiConfigFactory.createForEnvironment();
    this.windowMs = config.rateLimiting.windowMs;
    this.maxRequests = config.rateLimiting.maxRequests;
    this.logger = new Logger('RateLimitMiddleware');
    
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  public async execute(context: RequestContext, next: NextFunction): Promise<void> {
    const clientId = this.getClientId(context.request);
    const now = Date.now();
    
    let entry = this.rateLimitStore.get(clientId);
    
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + this.windowMs
      };
    }
    
    entry.count++;
    this.rateLimitStore.set(clientId, entry);
    
    if (entry.count > this.maxRequests) {
      this.logger.warn('Rate limit exceeded', { clientId, count: entry.count });
      throw new Error('Rate limit exceeded. Too many requests.');
    }
    
    // Add rate limit headers
    const remaining = Math.max(0, this.maxRequests - entry.count);
    const resetTime = Math.ceil(entry.resetTime / 1000);
    
    context.metadata.set('rateLimitHeaders', {
      'X-RateLimit-Limit': this.maxRequests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': resetTime.toString()
    });
    
    await next();
  }

  private getClientId(request: Request): string {
    // Try to get IP from various headers
    const ip = request.headers.get('CF-Connecting-IP') ??
              request.headers.get('X-Forwarded-For') ??
              request.headers.get('X-Real-IP') ??
              'unknown';
    
    return ip.split(',')[0].trim();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitStore.delete(key);
      }
    }
  }
}