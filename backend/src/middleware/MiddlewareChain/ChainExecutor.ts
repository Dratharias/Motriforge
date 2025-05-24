import { IConfigurableMiddleware, NextFunction } from '../MiddlewareFramework/MiddlewareFramework';
import { 
  ChainExecutionOptions, 
  ChainExecutionContext, 
  ChainExecutionResult,
  MiddlewareExecutionResult,
  ChainPerformanceMetrics,
  ChainState,
  ParallelGroup
} from '@/types/middleware/chain/chain-types';
import { ContextualLogger } from '@/shared-kernel/infrastructure/logging/ContextualLogger';

/**
 * Executes middleware chains with support for sequential and parallel execution
 */
export class ChainExecutor {
  private readonly logger: ContextualLogger;

  constructor(logger: ContextualLogger) {
    this.logger = logger;
  }

  /**
   * Executes middleware sequentially
   */
  async executeSequential(
    middleware: Map<string, IConfigurableMiddleware>,
    executionOrder: readonly string[],
    context: ChainExecutionContext
  ): Promise<void> {
    this.updateContextState(context, ChainState.EXECUTING);

    for (const middlewareName of executionOrder) {
      if (this.shouldAbortExecution(context)) {
        this.updateContextState(context, ChainState.CANCELLED);
        return;
      }

      const m = middleware.get(middlewareName);
      if (!this.shouldExecuteMiddleware(m, context)) {
        context.results.push(this.createSkippedResult(middlewareName));
        continue;
      }

      this.updateCurrentMiddleware(context, middlewareName);
      
      const result = await this.executeMiddleware(m!, context);
      context.results.push(result);

      if (this.shouldStopOnError(result, context)) {
        this.updateContextState(context, ChainState.FAILED);
        return;
      }
    }

    this.updateContextState(context, ChainState.COMPLETED);
  }

  /**
   * Executes middleware in parallel groups
   */
  async executeParallel(
    middleware: Map<string, IConfigurableMiddleware>,
    context: ChainExecutionContext
  ): Promise<void> {
    this.updateContextState(context, ChainState.EXECUTING);
    
    if (!context.options.parallelGroups) {
      throw new Error('Parallel groups not configured for parallel execution');
    }

    for (const group of context.options.parallelGroups) {
      await this.executeParallelGroup(middleware, group, context);
    }

    this.updateContextState(context, ChainState.COMPLETED);
  }

  /**
   * Executes a single parallel group
   */
  private async executeParallelGroup(
    middleware: Map<string, IConfigurableMiddleware>,
    group: ParallelGroup,
    context: ChainExecutionContext
  ): Promise<void> {
    const groupPromises = group.middlewareNames.map(name => 
      this.executeGroupMiddleware(middleware, name, context)
    );

    if (group.waitForAll) {
      const results = await Promise.allSettled(groupPromises);
      this.processGroupResults(results, context);
    } else {
      // Fire and forget - don't wait for completion
      groupPromises.forEach(promise => 
        promise.then(result => context.results.push(result))
      );
    }
  }

  /**
   * Executes middleware within a parallel group
   */
  private async executeGroupMiddleware(
    middleware: Map<string, IConfigurableMiddleware>,
    name: string,
    context: ChainExecutionContext
  ): Promise<MiddlewareExecutionResult> {
    const m = middleware.get(name);
    if (!this.shouldExecuteMiddleware(m, context)) {
      return this.createSkippedResult(name);
    }
    return this.executeMiddleware(m!, context);
  }

  /**
   * Processes results from parallel group execution
   */
  private processGroupResults(
    results: PromiseSettledResult<MiddlewareExecutionResult>[],
    context: ChainExecutionContext
  ): void {
    for (const result of results) {
      if (result.status === 'fulfilled') {
        context.results.push(result.value);
      } else {
        // Handle rejected promises by creating error result
        const errorResult = this.createErrorResult('unknown', result.reason);
        context.results.push(errorResult);
      }
    }
  }

  /**
   * Executes a single middleware with retry logic
   */
  async executeMiddleware(
    middleware: IConfigurableMiddleware,
    context: ChainExecutionContext
  ): Promise<MiddlewareExecutionResult> {
    const startTime = new Date();
    let retryCount = 0;
    let lastError: Error | undefined;

    while (retryCount <= context.options.maxRetries) {
      try {
        const result = await this.attemptMiddlewareExecution(middleware, context, startTime, retryCount);
        return result;
      } catch (error) {
        lastError = error as Error;
        retryCount++;

        this.logRetryAttempt(middleware.name, retryCount, context.options.maxRetries, lastError);

        if (this.shouldRetry(retryCount, context.options)) {
          await this.delay(context.options.retryDelay);
        }
      }
    }

    return this.createFailedResult(middleware.name, startTime, lastError!, retryCount - 1);
  }

  /**
   * Attempts to execute middleware once
   */
  private async attemptMiddlewareExecution(
    middleware: IConfigurableMiddleware,
    context: ChainExecutionContext,
    startTime: Date,
    retryCount: number
  ): Promise<MiddlewareExecutionResult> {
    const executionStartTime = Date.now();
    
    // Create a next function that does nothing (for individual middleware execution)
    const next: NextFunction = async () => {};
    
    await middleware.execute(context, next);
    
    const duration = Date.now() - executionStartTime;
    
    return {
      middlewareName: middleware.name,
      success: true,
      duration,
      startTime,
      endTime: new Date(),
      skipped: false,
      retryCount
    };
  }

  /**
   * Builds the final chain execution result
   */
  buildChainResult(
    context: ChainExecutionContext,
    totalDuration: number
  ): ChainExecutionResult {
    const performance = this.calculatePerformanceMetrics(context.results);
    
    return {
      executionId: context.executionId,
      success: context.results.every(r => r.success || r.skipped),
      shouldContinue: true,
      totalDuration,
      middlewareResults: context.results,
      performance,
      metadata: {
        state: context.state,
        totalMiddleware: context.results.length,
        executedMiddleware: context.results.filter(r => !r.skipped).length
      }
    };
  }

  /**
   * Builds error result for failed chain execution
   */
  buildErrorResult(
    context: ChainExecutionContext,
    error: Error,
    totalDuration: number
  ): ChainExecutionResult {
    const performance = this.calculatePerformanceMetrics(context.results);
    
    return {
      executionId: context.executionId,
      success: false,
      error,
      shouldContinue: false,
      totalDuration,
      middlewareResults: context.results,
      performance,
      metadata: {
        state: context.state,
        error: error.message
      }
    };
  }

  /**
   * Calculates performance metrics from middleware results
   */
  private calculatePerformanceMetrics(results: MiddlewareExecutionResult[]): ChainPerformanceMetrics {
    const executed = results.filter(r => !r.skipped);
    const failed = results.filter(r => !r.success && !r.skipped);
    const durations = executed.map(r => r.duration);

    const totalMiddleware = results.length;
    const executedMiddleware = executed.length;
    const skippedMiddleware = results.filter(r => r.skipped).length;
    const failedMiddleware = failed.length;

    const averageExecutionTime = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0;

    // Fix: Add initial values to reduce calls
    const slowestMiddleware = executed.length > 0 
      ? executed.reduce((max, current) => 
          current.duration > max.duration ? current : max, executed[0]
        ).middlewareName
      : undefined;

    const fastestMiddleware = executed.length > 0 
      ? executed.reduce((min, current) => 
          current.duration < min.duration ? current : min, executed[0]
        ).middlewareName
      : undefined;

    // Identify bottlenecks (middleware taking longer than 2x average)
    const bottlenecks = executed
      .filter(r => r.duration > averageExecutionTime * 2)
      .map(r => r.middlewareName);

    return {
      totalMiddleware,
      executedMiddleware,
      skippedMiddleware,
      failedMiddleware,
      averageExecutionTime,
      slowestMiddleware,
      fastestMiddleware,
      bottlenecks
    };
  }

  /**
   * Creates a skipped middleware result
   */
  createSkippedResult(middlewareName: string): MiddlewareExecutionResult {
    const now = new Date();
    return {
      middlewareName,
      success: true,
      duration: 0,
      startTime: now,
      endTime: now,
      skipped: true,
      retryCount: 0
    };
  }

  /**
   * Creates a failed middleware result
   */
  private createFailedResult(
    middlewareName: string,
    startTime: Date,
    error: Error,
    retryCount: number
  ): MiddlewareExecutionResult {
    const duration = Date.now() - startTime.getTime();
    
    return {
      middlewareName,
      success: false,
      duration,
      startTime,
      endTime: new Date(),
      error,
      skipped: false,
      retryCount
    };
  }

  /**
   * Creates an error result from rejected promise
   */
  private createErrorResult(middlewareName: string, error: any): MiddlewareExecutionResult {
    const now = new Date();
    return {
      middlewareName,
      success: false,
      duration: 0,
      startTime: now,
      endTime: now,
      error: error instanceof Error ? error : new Error(String(error)),
      skipped: false,
      retryCount: 0
    };
  }

  // Helper methods
  private shouldAbortExecution(context: ChainExecutionContext): boolean {
    return context.abortController.signal.aborted;
  }

  private shouldExecuteMiddleware(
    middleware: IConfigurableMiddleware | undefined,
    context: ChainExecutionContext
  ): boolean {
    return middleware !== undefined && 
           middleware.config.enabled && 
           middleware.shouldExecute(context);
  }

  private shouldStopOnError(
    result: MiddlewareExecutionResult,
    context: ChainExecutionContext
  ): boolean {
    return !result.success && !context.options.continueOnError;
  }

  private shouldRetry(retryCount: number, options: ChainExecutionOptions): boolean {
    return retryCount <= options.maxRetries && options.enableRetries;
  }

  private updateContextState(context: ChainExecutionContext, state: ChainState): void {
    (context as any).state = state;
  }

  private updateCurrentMiddleware(context: ChainExecutionContext, middlewareName: string): void {
    (context as any).currentMiddleware = middlewareName;
  }

  private logRetryAttempt(
    middlewareName: string,
    retryCount: number,
    maxRetries: number,
    error: Error
  ): void {
    this.logger.warn('Middleware execution failed', {
      middlewareName,
      retryCount,
      maxRetries,
      error: error.message
    });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}