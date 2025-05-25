import { IQueryHandler } from '@/application/iam/handlers/queries/GetIdentityQueryHandler';
import { GetIdentityQuery, CheckAccessQuery } from '@/types/iam/interfaces';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/LoggerFactory';

export class IAMQueryBus {
  private readonly logger = LoggerFactory.getContextualLogger('IAMQueryBus');
  private readonly handlers = new Map<string, IQueryHandler<any, any>>();
  private readonly cache = new Map<string, { data: any; expiry: number }>();

  registerHandler<TQuery, TResult>(
    queryType: string,
    handler: IQueryHandler<TQuery, TResult>
  ): void {
    this.handlers.set(queryType, handler);
    this.logger.debug('Query handler registered', { queryType });
  }

  async dispatch<TResult>(queryType: string, query: any, useCache = false): Promise<TResult> {
    const contextLogger = this.logger.withData({ queryType });

    try {
      contextLogger.debug('Dispatching query', { useCache });

      // Check cache first if requested
      if (useCache) {
        const cacheKey = this.getCacheKey(queryType, query);
        const cached = this.cache.get(cacheKey);
        
        if (cached && cached.expiry > Date.now()) {
          contextLogger.debug('Returning cached query result');
          return cached.data;
        }
      }

      const handler = this.handlers.get(queryType);
      if (!handler) {
        throw new Error(`No handler registered for query type: ${queryType}`);
      }

      const result = await handler.handle(query);

      // Cache result if requested
      if (useCache) {
        const cacheKey = this.getCacheKey(queryType, query);
        this.cache.set(cacheKey, {
          data: result,
          expiry: Date.now() + 5 * 60 * 1000 // 5 minutes
        });
      }

      contextLogger.debug('Query dispatched successfully');
      return result;

    } catch (error) {
      contextLogger.error('Failed to dispatch query', error as Error);
      throw error;
    }
  }

  // Strongly typed dispatch methods
  async getIdentity(query: GetIdentityQuery) {
    return this.dispatch('GetIdentityQuery', query, true);
  }

  async checkAccess(query: CheckAccessQuery) {
    return this.dispatch('CheckAccessQuery', query, false); // Don't cache access checks
  }

  invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      this.logger.debug('All query cache cleared');
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }

    this.logger.debug('Query cache invalidated', { pattern });
  }

  private getCacheKey(queryType: string, query: any): string {
    return `${queryType}:${JSON.stringify(query)}`;
  }
}

