import { CacheManager, CacheDomain } from '../CacheManager';
import { CacheOptions } from '../CacheOptions';
import { CacheEventMediator } from '../CacheEventMediator';
import { LoggerFacade } from '../../logging/LoggerFacade';
import { AuthCacheFacade } from './AuthCacheFacade';
import { UserCacheFacade } from './UserCacheFacade';
import { PermissionCacheFacade } from './PermissionCacheFacade';
import { OrganizationCacheFacade } from '../OrganizationCacheFacade';
import { ApiCacheFacade } from './ApiCacheFacade';
import { CacheStrategyFactory } from '../CacheStrategyFactory';
import { CacheStrategy } from '../strategies/CacheStrategy';

/**
 * Main entry point for the caching system
 */
export class CacheFacade {
  /**
   * Cache manager for storage operations
   */
  private readonly cacheManager: CacheManager;
  
  /**
   * Event mediator for cache events
   */
  private readonly cacheMediator: CacheEventMediator;
  
  /**
   * Logger instance
   */
  private readonly logger: LoggerFacade;
  
  /**
   * Strategy factory for creating cache strategies
   */
  private readonly strategyFactory: CacheStrategyFactory;
  
  /**
   * Domain-specific facades
   */
  private authCache?: AuthCacheFacade;
  private userCache?: UserCacheFacade;
  private permissionCache?: PermissionCacheFacade;
  private organizationCache?: OrganizationCacheFacade;
  private apiCache?: ApiCacheFacade;

  constructor(
    cacheManager: CacheManager,
    cacheMediator: CacheEventMediator,
    strategyFactory: CacheStrategyFactory,
    logger: LoggerFacade
  ) {
    this.cacheManager = cacheManager;
    this.cacheMediator = cacheMediator;
    this.strategyFactory = strategyFactory;
    this.logger = logger.withComponent('CacheFacade');
  }

  /**
   * Get a value from the cache
   */
  public async get<T>(key: string, domain: string = CacheDomain.DEFAULT): Promise<T | undefined> {
    return this.cacheManager.get<T>(key, domain);
  }

  /**
   * Get a value from the cache or compute it if not available
   */
  public async getOrCompute<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: CacheOptions,
    domain: string = CacheDomain.DEFAULT,
    strategyType: string = 'fetch'
  ): Promise<T> {
    // Create a strategy for this operation
    const strategy = this.strategyFactory.createStrategy(strategyType);
    
    // Use the strategy to get or compute the value
    return strategy.get<T>(key, fetcher, options);
  }

  /**
   * Set a value in the cache
   */
  public async set<T>(
    key: string,
    value: T,
    options?: CacheOptions,
    domain: string = CacheDomain.DEFAULT
  ): Promise<void> {
    await this.cacheManager.set<T>(key, value, options, domain);
  }

  /**
   * Remove a value from the cache
   */
  public async remove(key: string, domain: string = CacheDomain.DEFAULT): Promise<void> {
    await this.cacheManager.delete(key, domain);
  }

  /**
   * Clear all values from a domain or all domains
   */
  public async clear(domain?: string): Promise<void> {
    await this.cacheManager.clear(domain);
  }

  /**
   * Check if a key exists in the cache
   */
  public async has(key: string, domain: string = CacheDomain.DEFAULT): Promise<boolean> {
    return this.cacheManager.has(key, domain);
  }

  /**
   * Get all keys matching a pattern in a domain
   */
  public async keys(pattern: string, domain: string = CacheDomain.DEFAULT): Promise<string[]> {
    return this.cacheManager.keys(pattern, domain);
  }

  /**
   * Get cache statistics
   */
  public async getStatistics(): Promise<any> {
    return this.cacheManager.getStatistics();
  }

  /**
   * Get the auth cache facade
   */
  public getAuthCache(): AuthCacheFacade {
    this.authCache ??= new AuthCacheFacade(this);
    
    return this.authCache;
  }

  /**
   * Get the user cache facade
   */
  public getUserCache(): UserCacheFacade {
    this.userCache ??= new UserCacheFacade(this);
    
    return this.userCache;
  }

  /**
   * Get the permission cache facade
   */
  public getPermissionCache(): PermissionCacheFacade {
    this.permissionCache ??= new PermissionCacheFacade(this);
    
    return this.permissionCache;
  }

  /**
   * Get the organization cache facade
   */
  public getOrganizationCache(): OrganizationCacheFacade {
    this.organizationCache ??= new OrganizationCacheFacade(this);
    
    return this.organizationCache;
  }

  /**
   * Get the API cache facade
   */
  public getApiCache(): ApiCacheFacade {
    this.apiCache ??= new ApiCacheFacade(this);
    
    return this.apiCache;
  }

  /**
   * Create a cache strategy with the specified type
   */
  public createStrategy(type: string, options?: any): CacheStrategy {
    return this.strategyFactory.createStrategy(type, options);
  }
}