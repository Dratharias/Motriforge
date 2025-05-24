import { ContextualLogger } from "@/shared-kernel/infrastructure/logging/ContextualLogger";
import { IConfigurableMiddleware, RequestContext, MiddlewareResult, MiddlewareExecutionContext, NextFunction } from "@/types/middleware/framework";
import { MiddlewareConditionEvaluator } from "./MiddlewareConditionEvaluator";
import { MiddlewareConfigurationManager } from "./MiddlewareConfigurationManager";


/**
 * Handles middleware chain execution logic
 */
export class MiddlewareExecutionEngine {
  private readonly logger: ContextualLogger;
  private readonly configurationManager: MiddlewareConfigurationManager;
  private readonly conditionEvaluator: MiddlewareConditionEvaluator;

  constructor(
    logger: ContextualLogger,
    configurationManager: MiddlewareConfigurationManager
  ) {
    this.logger = logger;
    this.configurationManager = configurationManager;
    this.conditionEvaluator = new MiddlewareConditionEvaluator();
  }

  /**
   * Executes middleware chain for a request
   */
  async execute(
    middlewareMap: Map<string, IConfigurableMiddleware>,
    context: RequestContext
  ): Promise<MiddlewareResult> {
    const executionContext = this.createExecutionContext(context);
    const middlewareChain = this.buildMiddlewareChain(middlewareMap, executionContext);

    this.logger.startOperation('middleware-chain-execution', {
      requestId: context.requestId.toHexString(),
      middlewareCount: middlewareChain.length,
      path: context.path,
      method: context.method
    });

    try {
      const result = await this.executeMiddlewareChain(middlewareChain, executionContext);
      
      this.logger.completeOperation(
        'middleware-chain-execution',
        Date.now() - context.startTime,
        {
          success: result.success,
          executedCount: executionContext.executedMiddleware.length,
          failedCount: executionContext.failedMiddleware.length
        }
      );

      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.failOperation(
        'middleware-chain-execution',
        err,
        Date.now() - context.startTime
      );
      throw error;
    }
  }

  /**
   * Creates execution context from request context
   */
  private createExecutionContext(context: RequestContext): MiddlewareExecutionContext {
    return {
      ...context,
      executionOrder: 0,
      executedMiddleware: [],
      failedMiddleware: [],
      performance: {
        totalDuration: 0,
        middlewareDurations: {}
      },
      shouldTerminate: false,
      terminationResult: undefined
    };
  }

  /**
   * Builds the middleware execution chain
   */
  private buildMiddlewareChain(
    middlewareMap: Map<string, IConfigurableMiddleware>,
    context: RequestContext
  ): IConfigurableMiddleware[] {
    return Array.from(middlewareMap.values())
      .filter(middleware => 
        middleware.config.enabled && 
        middleware.shouldExecute(context) &&
        this.conditionEvaluator.evaluate(middleware.config.conditions ?? [], context)
      )
      .sort((a, b) => b.config.priority - a.config.priority);
  }

  /**
   * Executes the middleware chain with error handling
   */
  private async executeMiddlewareChain(
    chain: IConfigurableMiddleware[],
    context: MiddlewareExecutionContext
  ): Promise<MiddlewareResult> {
    let currentIndex = 0;
    const config = this.configurationManager.getConfig();

    const next: NextFunction = async (): Promise<void> => {
      if (context.shouldTerminate || currentIndex >= chain.length) {
        return;
      }

      const middleware = chain[currentIndex++];
      const startTime = Date.now();

      try {
        const timeout = middleware.config.timeout ?? config.defaultTimeout;
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Middleware ${middleware.name} timed out`)), timeout)
        );

        await Promise.race([
          middleware.execute(context, next),
          timeoutPromise
        ]);

        this.recordSuccessfulExecution(middleware, context, startTime);

      } catch (error) {
        const err = error as Error;
        await this.handleExecutionError(middleware, context, err, startTime, config.continueOnError);
      }
    };

    try {
      await next();
      
      if (context.shouldTerminate && context.terminationResult) {
        return context.terminationResult;
      }

      return {
        success: context.failedMiddleware.length === 0,
        shouldContinue: true
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        shouldContinue: false
      };
    }
  }

  /**
   * Records successful middleware execution
   */
  private recordSuccessfulExecution(
    middleware: IConfigurableMiddleware,
    context: MiddlewareExecutionContext,
    startTime: number
  ): void {
    const duration = Date.now() - startTime;
    (context.executedMiddleware as string[]).push(middleware.name);
    (context.performance.middlewareDurations)[middleware.name] = duration;

    this.logger.debug('Middleware executed successfully', {
      middlewareName: middleware.name,
      duration,
      requestId: context.requestId.toHexString()
    });
  }

  /**
   * Handles middleware execution errors
   */
  private async handleExecutionError(
    middleware: IConfigurableMiddleware,
    context: MiddlewareExecutionContext,
    error: Error,
    startTime: number,
    continueOnError: boolean
  ): Promise<void> {
    const duration = Date.now() - startTime;
    (context.failedMiddleware as string[]).push(middleware.name);
    (context.performance.middlewareDurations)[middleware.name] = duration;

    this.logger.error('Middleware execution failed', error, {
      middlewareName: middleware.name,
      duration,
      requestId: context.requestId.toHexString()
    });

    const errorResult = await middleware.onError(error, context);
    if (!errorResult.shouldContinue) {
      context.shouldTerminate = true;
      context.terminationResult = errorResult;
      return;
    }

    if (!continueOnError) {
      throw error;
    }
  }
}
