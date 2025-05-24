// src/middleware/chain/MiddlewareChain.ts

import { ObjectId } from 'mongodb';
import { ContextualLogger } from '@/shared-kernel/infrastructure/logging/ContextualLogger';
import { IConfigurableMiddleware, RequestContext } from '../MiddlewareFramework';
import {
  ChainExecutionResult,
  ChainExecutionOptions,
  ChainExecutionContext,
  ChainState,
  ChainInfo,
  ChainValidationResult,
  MiddlewareChainConfig
} from '@/types/middleware/chain/chain-types';
import { ChainValidator } from './ChainValidator';
import { ChainExecutor } from './ChainExecutor';

/**
 * Middleware chain implementation using chain of responsibility pattern
 * 
 * This class orchestrates middleware execution while delegating specific
 * responsibilities to specialized classes for validation and execution.
 */
export class MiddlewareChain {
  private readonly middleware: Map<string, IConfigurableMiddleware>;
  private readonly executionOrder: string[];
  private readonly logger: ContextualLogger;
  private readonly validator: ChainValidator;
  private readonly executor: ChainExecutor;
  private readonly config: MiddlewareChainConfig;

  constructor(
    middleware: readonly IConfigurableMiddleware[],
    logger: ContextualLogger,
    config?: Partial<MiddlewareChainConfig>
  ) {
    this.middleware = new Map();
    this.executionOrder = [];
    this.logger = logger;
    this.validator = new ChainValidator(logger);
    this.executor = new ChainExecutor(logger);
    
    this.config = {
      defaultExecutionOptions: {
        continueOnError: false,
        enableRetries: true,
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 30000,
        enableProfiling: true,
        parallelExecution: false
      },
      enableValidation: true,
      enablePerformanceTracking: true,
      maxChainSize: 50,
      ...config
    };

    this.buildChain(middleware);
  }

  /**
   * Adds middleware to the chain
   */
  add(middleware: IConfigurableMiddleware): this {
    this.middleware.set(middleware.name, middleware);
    this.rebuildExecutionOrder();
    
    this.logger.debug('Middleware added to chain', {
      middlewareName: middleware.name,
      priority: middleware.config.priority,
      chainSize: this.middleware.size
    });

    return this;
  }

  /**
   * Removes middleware from the chain
   */
  remove(middlewareName: string): this {
    if (!this.middleware.has(middlewareName)) {
      throw new Error(`Middleware ${middlewareName} not found in chain`);
    }

    this.middleware.delete(middlewareName);
    this.rebuildExecutionOrder();

    this.logger.debug('Middleware removed from chain', {
      middlewareName,
      chainSize: this.middleware.size
    });

    return this;
  }

  /**
   * Executes the middleware chain
   */
  async execute(
    context: RequestContext,
    options?: Partial<ChainExecutionOptions>
  ): Promise<ChainExecutionResult> {
    const executionOptions = { ...this.config.defaultExecutionOptions, ...options };
    const executionContext = this.createExecutionContext(context, executionOptions);

    this.logger.startOperation('middleware-chain-execution', {
      executionId: executionContext.executionId.toHexString(),
      middlewareCount: this.middleware.size,
      requestId: context.requestId.toHexString()
    });

    try {
      const startTime = Date.now();
      
      if (executionOptions.parallelExecution && executionOptions.parallelGroups) {
        await this.executor.executeParallel(this.middleware, executionContext);
      } else {
        await this.executor.executeSequential(this.middleware, this.executionOrder, executionContext);
      }

      const totalDuration = Date.now() - startTime;
      const result = this.executor.buildChainResult(executionContext, totalDuration);

      this.logger.completeOperation(
        'middleware-chain-execution',
        totalDuration,
        {
          executionId: executionContext.executionId.toHexString(),
          success: result.success,
          middlewareCount: result.middlewareResults.length
        }
      );

      return result;

    } catch (error) {
      const err = error as Error;
      const totalDuration = Date.now() - context.startTime;
      
      this.logger.failOperation(
        'middleware-chain-execution',
        err,
        totalDuration,
        {
          executionId: executionContext.executionId.toHexString(),
          state: executionContext.state
        }
      );

      return this.executor.buildErrorResult(executionContext, err, totalDuration);
    }
  }

  /**
   * Cancels chain execution
   */
  cancel(executionId: ObjectId): void {
    this.logger.info('Chain execution cancelled', {
      executionId: executionId.toHexString()
    });
  }

  /**
   * Gets chain information
   */
  getChainInfo(): ChainInfo {
    return {
      middlewareCount: this.middleware.size,
      executionOrder: [...this.executionOrder],
      middleware: Array.from(this.middleware.values()).map(m => ({
        name: m.name,
        priority: m.config.priority,
        enabled: m.config.enabled,
        dependencies: m.dependencies || []
      }))
    };
  }

  /**
   * Validates the chain configuration
   */
  validate(): ChainValidationResult {
    if (!this.config.enableValidation) {
      return {
        valid: true,
        errors: [],
        warnings: []
      };
    }

    return this.validator.validate(this.middleware);
  }

  /**
   * Builds the initial chain from middleware array
   */
  private buildChain(middleware: readonly IConfigurableMiddleware[]): void {
    // Add all middleware to the map
    for (const m of middleware) {
      this.middleware.set(m.name, m);
    }

    this.rebuildExecutionOrder();

    // Validate chain if enabled
    if (this.config.enableValidation) {
      const validation = this.validate();
      if (!validation.valid) {
        throw new Error(`Chain validation failed: ${validation.errors.join(', ')}`);
      }
    }
  }

  /**
   * Rebuilds the execution order based on priorities and dependencies
   */
  private rebuildExecutionOrder(): void {
    const sorted = this.topologicalSort();
    this.executionOrder.length = 0;
    this.executionOrder.push(...sorted);

    this.logger.debug('Chain execution order rebuilt', {
      order: this.executionOrder,
      middlewareCount: this.middleware.size
    });
  }

  /**
   * Performs topological sort considering dependencies and priorities
   */
  private topologicalSort(): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];

    const visit = (name: string) => {
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected involving ${name}`);
      }
      if (visited.has(name)) {
        return;
      }

      visiting.add(name);
      const middleware = this.middleware.get(name);
      
      if (middleware?.dependencies) {
        for (const dep of middleware.dependencies) {
          if (this.middleware.has(dep)) {
            visit(dep);
          }
        }
      }

      visiting.delete(name);
      visited.add(name);
      result.push(name);
    };

    // Sort by priority first, then apply topological sort
    const prioritySorted = Array.from(this.middleware.keys())
      .sort((a, b) => {
        const aMiddleware = this.middleware.get(a)!;
        const bMiddleware = this.middleware.get(b)!;
        return bMiddleware.config.priority - aMiddleware.config.priority;
      });

    for (const name of prioritySorted) {
      visit(name);
    }

    return result;
  }

  /**
   * Creates execution context
   */
  private createExecutionContext(
    context: RequestContext,
    options: ChainExecutionOptions
  ): ChainExecutionContext {
    return {
      ...context,
      executionId: new ObjectId(),
      executionOrder: 0,
      executedMiddleware: [],
      failedMiddleware: [],
      performance: {
        totalDuration: 0,
        middlewareDurations: {}
      },
      options,
      state: ChainState.IDLE,
      results: [],
      abortController: new AbortController()
    };
  }
}

/**
 * Factory for creating configured middleware chains
 */
export class MiddlewareChainFactory {
  /**
   * Creates a middleware chain with default configuration
   */
  static create(
    middleware: readonly IConfigurableMiddleware[],
    logger: ContextualLogger
  ): MiddlewareChain {
    return new MiddlewareChain(middleware, logger);
  }

  /**
   * Creates a high-performance middleware chain for production
   */
  static createHighPerformance(
    middleware: readonly IConfigurableMiddleware[],
    logger: ContextualLogger
  ): MiddlewareChain {
    const config: Partial<MiddlewareChainConfig> = {
      defaultExecutionOptions: {
        continueOnError: true,
        enableRetries: false,
        maxRetries: 1,
        retryDelay: 100,
        timeout: 5000,
        enableProfiling: false,
        parallelExecution: true
      },
      enableValidation: false,
      enablePerformanceTracking: false
    };

    return new MiddlewareChain(middleware, logger, config);
  }

  /**
   * Creates a development middleware chain with extensive validation
   */
  static createDevelopment(
    middleware: readonly IConfigurableMiddleware[],
    logger: ContextualLogger
  ): MiddlewareChain {
    const config: Partial<MiddlewareChainConfig> = {
      defaultExecutionOptions: {
        continueOnError: false,
        enableRetries: true,
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 30000,
        enableProfiling: true,
        parallelExecution: false
      },
      enableValidation: true,
      enablePerformanceTracking: true
    };

    return new MiddlewareChain(middleware, logger, config);
  }
}