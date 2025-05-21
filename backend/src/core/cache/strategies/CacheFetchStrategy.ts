import { CacheStrategy } from './CacheStrategy';
import { CacheAdapter } from '../adapters/CacheAdapter';
import { CacheOptions } from '../CacheOptions';
import { LoggerFacade } from '../../logging/LoggerFacade';

/**
 * Options for the cache fetch strategy
 */
export interface CacheFetchOptions {
  /**
   * Whether to cache errors
   */
  cacheErrors?: boolean;
  
  /**
   * TTL for cached errors (ms)
   */
  errorTtl?: number;
  
  /**
   * Whether to throw errors from the fetcher
   */
  throwErrors?: boolean;
  
  /**
   * Predicate to determine if a value should be cached
   */
  shouldCache?: (value: any) => boolean;
}

/**
 * Basic cache strategy that fetches data if not in cache
 */
export class CacheFetchStrategy implements CacheStrategy {
  /**
   * Cache adapter to use
   */
  private readonly cacheAdapter: CacheAdapter;
  
  /**
   * Logger instance
   */
  private readonly logger: LoggerFacade;
  
  /**
   * Strategy options
   */
  private readonly options: CacheFetchOptions;

  constructor(
    cacheAdapter: CacheAdapter,
    logger: LoggerFacade,
    options: CacheFetchOptions = {}
  ) {
    this.cacheAdapter = cacheAdapter;
    this.logger = logger.withComponent('CacheFetchStrategy');
    this.options = {
      cacheErrors: false,
      errorTtl: 60 * 1000, // 1 minute
      throwErrors: true,
      shouldCache: () => true,
      ...options
    };
  }

  /**
   * Get a value from the cache or compute it if not available
   */
  public async get<T>(key: string, fetcher: () => Promise<T>, options?: CacheOptions): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.cacheAdapter.get<T>(key);
      
      // If found in cache and not forcing refresh, return it
      if (cached !== undefined && !options?.forceRefresh) {
        return cached;
      }
      
      // Otherwise, fetch the value
      const value = await fetcher();
      
      // Cache the value if it meets criteria
      if (this.shouldCache(value)) {
        await this.cacheAdapter.set(key, value, options);
      }
      
      return value;
    } catch (error) {
      this.logger.error(`Error fetching value for key ${key}`, error as Error);
      
      // Cache the error if configured to do so
      if (this.options.cacheErrors) {
        const errorValue = {
          __error__: true,
          message: (error as Error).message,
          name: (error as Error).name,
          stack: (error as Error).stack
        };
        
        await this.cacheAdapter.set(key, errorValue as unknown as T, {
          ttl: this.options.errorTtl,
          ...options
        });
      }
      
      // Re-throw the error if configured to do so
      if (this.options.throwErrors) {
        throw error;
      }
      
      // Return undefined if not throwing
      return undefined as unknown as T;
    }
  }

  /**
   * Determine if a value should be cached
   */
  private shouldCache(value: any): boolean {
    // Don't cache undefined or null
    if (value === undefined || value === null) {
      return false;
    }
    
    // Use custom predicate if provided
    if (this.options.shouldCache) {
      return this.options.shouldCache(value);
    }
    
    return true;
  }
}