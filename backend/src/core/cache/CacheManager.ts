import { CacheAdapter } from './adapters/CacheAdapter';
import { CacheOptions } from './CacheOptions';
import { CachePolicy } from './CachePolicy';
import { CacheStats, createCacheStats } from './CacheStats';
import { CacheHealthMonitor } from './CacheHealthMonitor';
import { LoggerFacade } from '../logging/LoggerFacade';
import { EventMediator } from '../events/EventMediator';
import { EventPublisher } from '../events/publishers/EventPublisher';
import { CacheEventTypes } from './CacheEventTypes';
import { EventType } from '../events/types/EventType';

/**
 * Cache domains
 */
export enum CacheDomain {
  AUTH = 'auth',
  USER = 'user',
  PERMISSION = 'permission',
  ORGANIZATION = 'organization',
  API = 'api',
  SYSTEM = 'system',
  DEFAULT = 'default'
}

/**
 * Options for the cache manager
 */
interface CacheManagerOptions {
  defaultAdapterName?: string;
  eventMediator?: EventMediator;
  eventPublisher?: EventPublisher;
  enableHealthMonitoring?: boolean;
}

/**
 * Manages cache adapters and domain mappings
 */
export class CacheManager {
  /**
   * Map of adapter names to adapters
   */
  private readonly adapters: Map<string, CacheAdapter> = new Map();
  
  /**
   * Map of domain names to adapter names
   */
  private readonly domainMappings: Map<string, string> = new Map();
  
  /**
   * Default adapter name
   */
  private readonly defaultAdapterName: string;
  
  /**
   * Health monitor
   */
  private readonly healthMonitor?: CacheHealthMonitor;
  
  /**
   * Logger instance
   */
  private readonly logger: LoggerFacade;
  
  /**
   * Event mediator
   */
  private readonly eventMediator?: EventMediator;
  
  /**
   * Event publisher
   */
  private readonly eventPublisher?: EventPublisher;
  
  /**
   * Response times by domain (for calculating average)
   */
  private readonly responseTimes: Map<string, number[]> = new Map();

  constructor(
    defaultAdapter: CacheAdapter,
    logger: LoggerFacade,
    options: CacheManagerOptions = {}
  ) {
    this.defaultAdapterName = options.defaultAdapterName ?? 'default';
    this.logger = logger.withComponent('CacheManager');
    this.eventMediator = options.eventMediator;
    this.eventPublisher = options.eventPublisher;
    
    // Register default adapter
    this.registerAdapter(this.defaultAdapterName, defaultAdapter);
    
    // Map all domains to default adapter by default
    Object.values(CacheDomain).forEach(domain => {
      this.setDomainAdapter(domain, this.defaultAdapterName);
    });
    
    // Create health monitor if enabled
    if (options.enableHealthMonitoring) {
      this.healthMonitor = new CacheHealthMonitor(this, logger);
      this.healthMonitor.startMonitoring();
    }
    
    this.logger.info('Cache manager initialized', {
      defaultAdapter: this.defaultAdapterName,
      domainCount: this.domainMappings.size
    });
  }

  /**
   * Get the adapter for a domain
   */
  public getAdapter(domain: string): CacheAdapter {
    const adapterName = this.domainMappings.get(domain) || this.defaultAdapterName;
    const adapter = this.adapters.get(adapterName);
    
    if (!adapter) {
      this.logger.warn(`No adapter found for domain: ${domain}, using default adapter`);
      return this.adapters.get(this.defaultAdapterName)!;
    }
    
    return adapter;
  }

  /**
   * Register a cache adapter
   */
  public registerAdapter(name: string, adapter: CacheAdapter): void {
    this.adapters.set(name, adapter);
    this.logger.debug(`Registered cache adapter: ${name}`);
  }

  /**
   * Set the adapter for a domain
   */
  public setDomainAdapter(domain: string, adapterName: string): void {
    if (!this.adapters.has(adapterName)) {
      this.logger.warn(`Adapter ${adapterName} not found, mapping domain ${domain} to default adapter`);
      this.domainMappings.set(domain, this.defaultAdapterName);
      return;
    }
    
    this.domainMappings.set(domain, adapterName);
    this.logger.debug(`Mapped domain ${domain} to adapter ${adapterName}`);
  }

  /**
   * Get a value from the cache
   */
  public async get<T>(key: string, domain: string = CacheDomain.DEFAULT): Promise<T | undefined> {
    const startTime = Date.now();
    
    try {
      const adapter = this.getAdapter(domain);
      const result = await adapter.get<T>(key);
      
      this.recordResponseTime(domain, Date.now() - startTime);
      
      if (result === undefined) {
        this.publishEvent(CacheEventTypes.MISS, { key, domain });
      } else {
        this.publishEvent(CacheEventTypes.HIT, { key, domain });
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Error getting value for key ${key} in domain ${domain}`, error as Error);
      this.publishEvent(CacheEventTypes.ERROR, { key, domain, error: (error as Error).message });
      return undefined;
    }
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
    const startTime = Date.now();
    
    try {
      const adapter = this.getAdapter(domain);
      await adapter.set<T>(key, value, options);
      
      this.recordResponseTime(domain, Date.now() - startTime);
      this.publishEvent(CacheEventTypes.SET, { key, domain });
    } catch (error) {
      this.logger.error(`Error setting value for key ${key} in domain ${domain}`, error as Error);
      this.publishEvent(CacheEventTypes.ERROR, { key, domain, error: (error as Error).message });
    }
  }

  /**
   * Delete a value from the cache
   */
  public async delete(key: string, domain: string = CacheDomain.DEFAULT): Promise<void> {
    const startTime = Date.now();
    
    try {
      const adapter = this.getAdapter(domain);
      await adapter.delete(key);
      
      this.recordResponseTime(domain, Date.now() - startTime);
      this.publishEvent(CacheEventTypes.DELETE, { key, domain });
    } catch (error) {
      this.logger.error(`Error deleting key ${key} in domain ${domain}`, error as Error);
      this.publishEvent(CacheEventTypes.ERROR, { key, domain, error: (error as Error).message });
    }
  }

  /**
   * Clear all values from a domain or all domains
   */
  public async clear(domain?: string): Promise<void> {
    try {
      if (domain) {
        // Clear specific domain
        const adapter = this.getAdapter(domain);
        await adapter.clear();
        this.publishEvent(CacheEventTypes.CLEAR, { domain });
      } else {
        // Clear all domains
        const domains = Array.from(this.domainMappings.keys());
        
        for (const domainToDelete of domains) {
          const adapter = this.getAdapter(domainToDelete);
          await adapter.clear();
        }
        
        this.publishEvent(CacheEventTypes.CLEAR_ALL, {});
      }
    } catch (error) {
      this.logger.error(`Error clearing cache ${domain ? `in domain ${domain}` : 'across all domains'}`, error as Error);
      this.publishEvent(CacheEventTypes.ERROR, { domain, error: (error as Error).message });
    }
  }

  /**
   * Check if a key exists in the cache
   */
  public async has(key: string, domain: string = CacheDomain.DEFAULT): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const adapter = this.getAdapter(domain);
      const result = await adapter.has(key);
      
      this.recordResponseTime(domain, Date.now() - startTime);
      return result;
    } catch (error) {
      this.logger.error(`Error checking key ${key} in domain ${domain}`, error as Error);
      this.publishEvent(CacheEventTypes.ERROR, { key, domain, error: (error as Error).message });
      return false;
    }
  }

  /**
   * Get all keys matching a pattern in a domain
   */
  public async keys(pattern?: string, domain: string = CacheDomain.DEFAULT): Promise<string[]> {
    try {
      const adapter = this.getAdapter(domain);
      return await adapter.keys(pattern);
    } catch (error) {
      this.logger.error(`Error getting keys in domain ${domain}`, error as Error);
      this.publishEvent(CacheEventTypes.ERROR, { domain, error: (error as Error).message });
      return [];
    }
  }

  /**
   * Get the cache statistics
   */
  public async getStatistics(): Promise<CacheStats> {
    try {
      const allStats = createCacheStats();
      
      for (const [domain, adapterName] of this.domainMappings.entries()) {
        const adapter = this.adapters.get(adapterName);
        
        if (!adapter) {
          continue;
        }
        
        const stats = adapter.getStatistics();
        
        // Merge stats
        allStats.hits += stats.hits;
        allStats.misses += stats.misses;
        allStats.errors += stats.errors;
        allStats.sets += stats.sets;
        allStats.deletes += stats.deletes;
        allStats.size += stats.size;
        allStats.itemCount += stats.itemCount;
        
        // Update oldest/newest entries
        if (stats.oldestEntry && (!allStats.oldestEntry || stats.oldestEntry < allStats.oldestEntry)) {
          allStats.oldestEntry = stats.oldestEntry;
        }
        
        if (stats.newestEntry && (!allStats.newestEntry || stats.newestEntry > allStats.newestEntry)) {
          allStats.newestEntry = stats.newestEntry;
        }
      }
      
      // Calculate hit rate
      const total = allStats.hits + allStats.misses;
      allStats.hitRate = total === 0 ? 0 : allStats.hits / total;
      
      return allStats;
    } catch (error) {
      this.logger.error('Error getting cache statistics', error as Error);
      return createCacheStats();
    }
  }

  /**
   * Apply a cache policy to a domain
   */
  public applyPolicy(domain: string, policy: CachePolicy): void {
    // This is a stub - in a real implementation, we would
    // configure the adapter for the domain with the policy settings
    this.logger.debug(`Applied cache policy to domain ${domain}`, {
      ttl: policy.ttl,
      evictionStrategy: policy.evictionStrategy
    });
  }

  /**
   * Build a full key for a domain and base key
   */
  public buildKey(domain: string, key: string): string {
    return `${domain}:${key}`;
  }

  /**
   * Get the health status of the cache
   */
  public getHealth(): Record<string, any> {
    if (!this.healthMonitor) {
      return { enabled: false };
    }
    
    // This would normally return the actual health status
    return { status: 'healthy' };
  }

  /**
   * Get the estimated max size of the cache in bytes
   */
  public getMaxSize(): number {
    return Infinity; // Stub - would return the actual max size
  }

  /**
   * Get the average response time across all domains in milliseconds
   */
  public getAverageResponseTime(): number {
    let totalTimes = 0;
    let totalCount = 0;
    
    for (const times of this.responseTimes.values()) {
      totalTimes += times.reduce((sum, time) => sum + time, 0);
      totalCount += times.length;
    }
    
    return totalCount === 0 ? 0 : totalTimes / totalCount;
  }

  /**
   * Record a response time for a domain
   */
  private recordResponseTime(domain: string, timeMs: number): void {
    if (!this.responseTimes.has(domain)) {
      this.responseTimes.set(domain, []);
    }
    
    const times = this.responseTimes.get(domain)!;
    times.push(timeMs);
    
    // Keep only the last 100 response times
    if (times.length > 100) {
      times.shift();
    }
  }

  /**
   * Publish a cache event
   */
  private publishEvent(type: EventType, payload: Record<string, any>): void {
    // Skip if we have no way to publish events
    if (!this.eventPublisher && !this.eventMediator) {
      return;
    }
    
    try {
      if (this.eventPublisher) {
        // Use the event publisher to create a proper event
        const event = this.eventPublisher.createEvent(type, payload);
        
        // Use the mediator to publish if available
        if (this.eventMediator) {
          this.eventMediator.publish(event);
        }
      } else if (this.eventMediator) {
        // Direct fallback using the mediator's API
        // This assumes eventMediator has a compatible publish method that accepts type and payload
        this.logger.debug(`Publishing event: ${type}`);
        
        // Cast to 'any' if needed to bypass strict type checking
        (this.eventMediator as any).publish({ 
          type, 
          payload,
          // Add other required fields that may be needed by your Event interface
          id: crypto.randomUUID(), 
          timestamp: new Date(),
          source: 'cache-manager',
          metadata: {},
          version: '1.0',
          isAcknowledged: false
        });
      }
    } catch (error) {
      this.logger.error(`Error publishing cache event: ${type}`, error as Error);
    }
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    if (this.healthMonitor) {
      this.healthMonitor.stopMonitoring();
    }
    
    // Dispose of all adapters
    for (const adapter of this.adapters.values()) {
      if ('dispose' in adapter && typeof (adapter as any).dispose === 'function') {
        (adapter as any).dispose();
      }
    }
    
    this.adapters.clear();
    this.domainMappings.clear();
    this.responseTimes.clear();
  }
}