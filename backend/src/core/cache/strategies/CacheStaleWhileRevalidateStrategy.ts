import { CacheStrategy } from './CacheStrategy';
import { CacheAdapter } from '../adapters/CacheAdapter';
import { CacheOptions } from '../CacheOptions';
import { LoggerFacade } from '../../logging/LoggerFacade';

/**
 * Options for stale-while-revalidate strategy
 */
export interface StaleWhileRevalidateOptions {
  /**
   * How long stale data can be served (ms)
   */
  staleTimeMs?: number;
  
  /**
   * Minimum time between revalidations (ms)
   */
  minRevalidateIntervalMs?: number;
  
  /**
   * Maximum number of concurrent revalidations
   */
  maxConcurrentRevalidations?: number;
}

interface RevalidationTask {
  key: string;
  fetcher: () => Promise<any>;
  options?: CacheOptions;
  timestamp: number;
}

/**
 * Queue for managing revalidation tasks
 */
class RevalidationQueue {
  /**
   * Tasks in the queue
   */
  private readonly tasks: Map<string, RevalidationTask> = new Map();
  
  /**
   * Tasks currently being processed
   */
  private readonly processing: Set<string> = new Set();
  
  /**
   * Maximum number of concurrent revalidations
   */
  private readonly maxConcurrent: number;
  
  /**
   * Logger instance
   */
  private readonly logger: LoggerFacade;
  
  /**
   * Cache adapter to use
   */
  private readonly cacheAdapter: CacheAdapter;
  
  /**
   * Interval ID for processing tasks
   */
  private intervalId?: NodeJS.Timeout;

  constructor(
    cacheAdapter: CacheAdapter,
    logger: LoggerFacade,
    maxConcurrent: number = 5
  ) {
    this.cacheAdapter = cacheAdapter;
    this.logger = logger.withComponent('RevalidationQueue');
    this.maxConcurrent = maxConcurrent;
    
    // Start processing loop
    this.startProcessing();
  }

  /**
   * Add a task to the queue
   */
  public enqueue(task: RevalidationTask): void {
    this.tasks.set(task.key, task);
  }

  /**
   * Start the processing loop
   */
  private startProcessing(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    this.intervalId = setInterval(() => {
      this.processNext();
    }, 100);
    
    // Ensure the interval doesn't prevent the process from exiting
    if (this.intervalId.unref) {
      this.intervalId.unref();
    }
  }

  /**
   * Process the next batch of tasks
   */
  private async processNext(): Promise<void> {
    // If we're at capacity, do nothing
    if (this.processing.size >= this.maxConcurrent) {
      return;
    }
    
    // Calculate how many tasks we can process
    const availableSlots = this.maxConcurrent - this.processing.size;
    
    // Get tasks to process
    const tasksToProcess = Array.from(this.tasks.entries())
      .filter(([key]) => !this.processing.has(key))
      .slice(0, availableSlots)
      .map(([, task]) => task);
    
    // Process each task
    for (const task of tasksToProcess) {
      this.tasks.delete(task.key);
      this.processing.add(task.key);
      
      this.processTask(task).finally(() => {
        this.processing.delete(task.key);
      });
    }
  }

  /**
   * Process a single revalidation task
   */
  private async processTask(task: RevalidationTask): Promise<void> {
    try {
      this.logger.debug(`Revalidating cache for key: ${task.key}`);
      
      // Fetch the value
      const value = await task.fetcher();
      
      // Store in cache
      await this.cacheAdapter.set(task.key, value, task.options);
      
      this.logger.debug(`Revalidation completed for key: ${task.key}`);
    } catch (error) {
      this.logger.error(`Error revalidating key: ${task.key}`, error as Error);
    }
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    
    this.tasks.clear();
    this.processing.clear();
  }
}

/**
 * Cache strategy that serves stale data while revalidating in the background
 */
export class CacheStaleWhileRevalidateStrategy implements CacheStrategy {
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
  private readonly options: StaleWhileRevalidateOptions;
  
  /**
   * Queue for revalidation tasks
   */
  private readonly revalidationQueue: RevalidationQueue;
  
  /**
   * Last revalidation times by key
   */
  private readonly lastRevalidation: Map<string, number> = new Map();

  constructor(
    cacheAdapter: CacheAdapter,
    logger: LoggerFacade,
    options: StaleWhileRevalidateOptions = {}
  ) {
    this.cacheAdapter = cacheAdapter;
    this.logger = logger.withComponent('CacheStaleWhileRevalidateStrategy');
    this.options = {
      staleTimeMs: 5 * 60 * 1000, // 5 minutes
      minRevalidateIntervalMs: 60 * 1000, // 1 minute
      maxConcurrentRevalidations: 5,
      ...options
    };
    
    this.revalidationQueue = new RevalidationQueue(
      cacheAdapter,
      logger,
      this.options.maxConcurrentRevalidations
    );
  }

  /**
   * Get a value from the cache, possibly serving stale data while revalidating
   */
  public async get<T>(key: string, fetcher: () => Promise<T>, options?: CacheOptions): Promise<T> {
    try {
      // Check for stale value first
      const staleValue = await this.getStaleValue<T>(key);
      
      // Force refresh or no stale value available
      if (options?.forceRefresh || staleValue === undefined) {
        // Fetch and cache the value
        const value = await fetcher();
        await this.cacheAdapter.set(key, value, options);
        return value;
      }
      
      // Check if we should revalidate
      const shouldRevalidate = this.shouldRevalidate(key);
      
      // If we should revalidate, do it in the background
      if (shouldRevalidate) {
        this.scheduleRevalidation(key, fetcher, options);
      }
      
      // Return the stale value
      return staleValue;
    } catch (error) {
      this.logger.error(`Error in stale-while-revalidate for key ${key}`, error as Error);
      
      // If we have a stale value, return it
      const staleValue = await this.getStaleValue<T>(key);
      if (staleValue !== undefined) {
        return staleValue;
      }
      
      // Otherwise, rethrow the error
      throw error;
    }
  }

  /**
   * Get a stale value from the cache
   */
  private async getStaleValue<T>(key: string): Promise<T | undefined> {
    return this.cacheAdapter.get<T>(key);
  }

  /**
   * Schedule a revalidation
   */
  private scheduleRevalidation<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: CacheOptions
  ): void {
    // Update last revalidation time
    this.lastRevalidation.set(key, Date.now());
    
    // Enqueue the revalidation task
    this.revalidationQueue.enqueue({
      key,
      fetcher,
      options,
      timestamp: Date.now()
    });
    
    this.logger.debug(`Scheduled revalidation for key: ${key}`);
  }

  /**
   * Determine if we should revalidate a key
   */
  private shouldRevalidate(key: string): boolean {
    const lastTime = this.lastRevalidation.get(key) ?? 0;
    const now = Date.now();
    
    // Don't revalidate if we recently did
    if (now - lastTime < this.options.minRevalidateIntervalMs!) {
      return false;
    }
    
    return true;
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.revalidationQueue.dispose();
    this.lastRevalidation.clear();
  }
}