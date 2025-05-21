import { CacheStrategy } from './strategies/CacheStrategy';
import { CacheFetchStrategy, CacheFetchOptions } from './strategies/CacheFetchStrategy';
import { CacheStaleWhileRevalidateStrategy, StaleWhileRevalidateOptions } from './strategies/CacheStaleWhileRevalidateStrategy';
import { CacheAdapter } from './adapters/CacheAdapter';
import { LoggerFacade } from '../logging/LoggerFacade';

/**
 * Factory for creating cache strategies
 */
export class CacheStrategyFactory {
  /**
   * Logger instance
   */
  private readonly logger: LoggerFacade;
  
  /**
   * Default cache adapter
   */
  private readonly defaultAdapter: CacheAdapter;
  
  /**
   * Map of strategy names to constructor functions
   */
  private readonly strategies: Map<string, new (adapter: CacheAdapter, logger: LoggerFacade, options: any) => CacheStrategy> = new Map();

  constructor(defaultAdapter: CacheAdapter, logger: LoggerFacade) {
    this.defaultAdapter = defaultAdapter;
    this.logger = logger.withComponent('CacheStrategyFactory');
    
    // Register default strategies
    this.registerStrategy('fetch', CacheFetchStrategy);
    this.registerStrategy('stale-while-revalidate', CacheStaleWhileRevalidateStrategy);
  }

  /**
   * Create a strategy of the specified type
   */
  public createStrategy(
    type: string,
    options?: any,
    adapter?: CacheAdapter
  ): CacheStrategy {
    const StrategyConstructor = this.strategies.get(type);
    
    if (!StrategyConstructor) {
      this.logger.warn(`Unknown cache strategy type: ${type}, falling back to fetch strategy`);
      return new CacheFetchStrategy(adapter || this.defaultAdapter, this.logger, options);
    }
    
    return new StrategyConstructor(adapter || this.defaultAdapter, this.logger, options);
  }

  /**
   * Register a new strategy type
   */
  public registerStrategy<T>(
    type: string,
    strategyConstructor: new (adapter: CacheAdapter, logger: LoggerFacade, options: T) => CacheStrategy
  ): void {
    this.strategies.set(type, strategyConstructor);
    this.logger.debug(`Registered cache strategy: ${type}`);
  }

  /**
   * Get a list of available strategy types
   */
  public getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Create a fetch strategy
   */
  public createFetchStrategy(
    options?: CacheFetchOptions,
    adapter?: CacheAdapter
  ): CacheFetchStrategy {
    return new CacheFetchStrategy(
      adapter || this.defaultAdapter,
      this.logger,
      options
    );
  }

  /**
   * Create a stale-while-revalidate strategy
   */
  public createStaleWhileRevalidateStrategy(
    options?: StaleWhileRevalidateOptions,
    adapter?: CacheAdapter
  ): CacheStaleWhileRevalidateStrategy {
    return new CacheStaleWhileRevalidateStrategy(
      adapter || this.defaultAdapter,
      this.logger,
      options
    );
  }
}