import { ObjectId } from 'mongodb';
import { IMiddleware, IPolicyEnforcementPoint, ISecurityContext } from '@/types/shared/base-types';
import { ApplicationContext } from '@/types/shared/enums/common';
import { ContextualLogger } from '@/shared-kernel/infrastructure/logging/ContextualLogger';

/**
 * Request context interface for middleware pipeline
 */
export interface RequestContext {
  readonly requestId: ObjectId;
  readonly timestamp: Date;
  readonly path: string;
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly query: Record<string, any>;
  readonly body?: any;
  readonly params: Record<string, string>;
  user?: any;
  securityContext?: ISecurityContext;
  readonly correlationId?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly applicationContext?: ApplicationContext;
  readonly startTime: number;
  metadata: Record<string, any>;
}

/**
 * Middleware execution result
 */
export interface MiddlewareResult {
  readonly success: boolean;
  readonly error?: Error;
  readonly shouldContinue: boolean;
  readonly response?: any;
  readonly statusCode?: number;
  readonly headers?: Record<string, string>;
}

/**
 * Next function type for middleware chain
 */
export type NextFunction = () => Promise<void>;

/**
 * Middleware execution context
 */
export interface MiddlewareExecutionContext extends RequestContext {
  readonly executionOrder: number;
  readonly executedMiddleware: readonly string[];
  readonly failedMiddleware: readonly string[];
  readonly performance: {
    readonly totalDuration: number;
    readonly middlewareDurations: Record<string, number>;
  };
  // Internal state for flow control
  shouldTerminate?: boolean;
  terminationResult?: MiddlewareResult;
}

/**
 * Middleware configuration
 */
export interface MiddlewareConfig {
  readonly enabled: boolean;
  readonly priority: number;
  readonly conditions?: MiddlewareCondition[];
  readonly timeout?: number;
  readonly retryCount?: number;
  readonly metadata?: Record<string, any>;
}

/**
 * Middleware condition for conditional execution
 */
export interface MiddlewareCondition {
  readonly type: 'path' | 'method' | 'header' | 'context' | 'custom';
  readonly operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex' | 'exists';
  readonly value: any;
  readonly negate?: boolean;
}

/**
 * Enhanced middleware interface with configuration
 */
export interface IConfigurableMiddleware extends IMiddleware<RequestContext> {
  readonly config: MiddlewareConfig;
  readonly dependencies?: string[];
  shouldExecute(context: RequestContext): boolean;
  onError(error: Error, context: RequestContext): Promise<MiddlewareResult>;
}

/**
 * Middleware framework for managing the request pipeline
 */
export class MiddlewareFramework {
  private readonly middlewareRegistry: Map<string, IConfigurableMiddleware>;
  private readonly policyEnforcementPoint: IPolicyEnforcementPoint;
  private readonly logger: ContextualLogger;
  private readonly globalConfig: MiddlewareFrameworkConfig;

  constructor(
    policyEnforcementPoint: IPolicyEnforcementPoint,
    logger: ContextualLogger,
    globalConfig: MiddlewareFrameworkConfig
  ) {
    this.middlewareRegistry = new Map();
    this.policyEnforcementPoint = policyEnforcementPoint;
    this.logger = logger;
    this.globalConfig = globalConfig;
  }

  /**
   * Registers a middleware
   */
  registerMiddleware(middleware: IConfigurableMiddleware): void {
    if (this.middlewareRegistry.has(middleware.name)) {
      throw new Error(`Middleware ${middleware.name} is already registered`);
    }

    // Validate dependencies
    this.validateDependencies(middleware);

    this.middlewareRegistry.set(middleware.name, middleware);
    this.logger.info('Middleware registered', {
      middlewareName: middleware.name,
      priority: middleware.config.priority,
      enabled: middleware.config.enabled
    });
  }

  /**
   * Unregisters a middleware
   */
  unregisterMiddleware(name: string): void {
    if (!this.middlewareRegistry.has(name)) {
      throw new Error(`Middleware ${name} is not registered`);
    }

    // Check for dependents
    const dependents = this.findDependents(name);
    if (dependents.length > 0) {
      throw new Error(
        `Cannot unregister middleware ${name}. The following middleware depend on it: ${dependents.join(', ')}`
      );
    }

    this.middlewareRegistry.delete(name);
    this.logger.info('Middleware unregistered', { middlewareName: name });
  }

  /**
   * Executes the middleware chain for a request
   */
  async executeChain(context: RequestContext): Promise<MiddlewareResult> {
    const executionContext = this.createExecutionContext(context);
    const middlewareChain = this.buildMiddlewareChain(executionContext);

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
        Date.now() - context.startTime,
        {
          executedCount: executionContext.executedMiddleware.length,
          failedCount: executionContext.failedMiddleware.length
        }
      );
      throw error;
    }
  }

  /**
   * Enforces policies on the request
   */
  async enforcePolicy(
    policyName: string,
    context: RequestContext,
    resource?: any
  ): Promise<boolean> {
    if (!context.securityContext) {
      this.logger.warn('Policy enforcement attempted without security context', {
        policyName,
        requestId: context.requestId.toHexString()
      });
      return false;
    }

    try {
      const result = await this.policyEnforcementPoint.enforce(
        policyName,
        context.securityContext,
        resource
      );

      this.logger.info('Policy enforcement result', {
        policyName,
        result,
        userId: context.securityContext.userId?.toHexString(),
        requestId: context.requestId.toHexString()
      });

      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error('Policy enforcement failed', err, {
        policyName,
        requestId: context.requestId.toHexString()
      });
      return false;
    }
  }

  /**
   * Gets registered middleware information
   */
  getMiddlewareInfo(): readonly MiddlewareInfo[] {
    return Array.from(this.middlewareRegistry.values()).map(middleware => ({
      name: middleware.name,
      priority: middleware.config.priority,
      enabled: middleware.config.enabled,
      dependencies: middleware.dependencies ?? [],
      hasConditions: (middleware.config.conditions?.length ?? 0) > 0
    }));
  }

  /**
   * Enables or disables a middleware
   */
  setMiddlewareEnabled(name: string, enabled: boolean): void {
    const middleware = this.middlewareRegistry.get(name);
    if (!middleware) {
      throw new Error(`Middleware ${name} is not registered`);
    }

    // Create new config with updated enabled state
    const newConfig = { ...middleware.config, enabled };
    const updatedMiddleware = { ...middleware, config: newConfig };
    this.middlewareRegistry.set(name, updatedMiddleware);

    this.logger.info('Middleware status changed', {
      middlewareName: name,
      enabled
    });
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
  private buildMiddlewareChain(context: RequestContext): IConfigurableMiddleware[] {
    return Array.from(this.middlewareRegistry.values())
      .filter(middleware => 
        middleware.config.enabled && 
        middleware.shouldExecute(context) &&
        this.evaluateConditions(middleware.config.conditions || [], context)
      )
      .sort((a, b) => b.config.priority - a.config.priority); // Higher priority first
  }

  /**
   * Executes the middleware chain
   */
  private async executeMiddlewareChain(
    chain: IConfigurableMiddleware[],
    context: MiddlewareExecutionContext
  ): Promise<MiddlewareResult> {
    let currentIndex = 0;

    const next: NextFunction = async (): Promise<void> => {
      // Check if execution should terminate early
      if (context.shouldTerminate || currentIndex >= chain.length) {
        return;
      }

      const middleware = chain[currentIndex++];
      const startTime = Date.now();

      try {
        // Check timeout
        const timeout = middleware.config.timeout ?? this.globalConfig.defaultTimeout;
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Middleware ${middleware.name} timed out`)), timeout)
        );

        // Execute middleware with timeout
        await Promise.race([
          middleware.execute(context, next),
          timeoutPromise
        ]);

        // Record successful execution
        const duration = Date.now() - startTime;
        (context.executedMiddleware as string[]).push(middleware.name);
        (context.performance.middlewareDurations)[middleware.name] = duration;

        this.logger.debug('Middleware executed successfully', {
          middlewareName: middleware.name,
          duration,
          requestId: context.requestId.toHexString()
        });

      } catch (error) {
        const err = error as Error;
        const duration = Date.now() - startTime;
        
        (context.failedMiddleware as string[]).push(middleware.name);
        (context.performance.middlewareDurations)[middleware.name] = duration;

        this.logger.error('Middleware execution failed', err, {
          middlewareName: middleware.name,
          duration,
          requestId: context.requestId.toHexString()
        });

        // Let middleware handle its own error
        const errorResult = await middleware.onError(err, context);
        if (!errorResult.shouldContinue) {
          // Signal termination
          context.shouldTerminate = true;
          context.terminationResult = errorResult;
          return;
        }

        // If configured to continue on error, proceed to next middleware
        if (!this.globalConfig.continueOnError) {
          throw err;
        }
      }
    };

    try {
      await next();
      
      // Check if execution was terminated early
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
   * Evaluates middleware conditions
   */
  private evaluateConditions(conditions: MiddlewareCondition[], context: RequestContext): boolean {
    if (conditions.length === 0) {
      return true;
    }

    return conditions.every(condition => {
      let result = false;

      switch (condition.type) {
        case 'path': {
          result = this.evaluateStringCondition(condition, context.path);
          break;
        }
        case 'method': {
          result = this.evaluateStringCondition(condition, context.method);
          break;
        }
        case 'header': {
          const headerValue = context.headers[condition.value];
          result = headerValue !== undefined;
          break;
        }
        case 'context': {
          result = context.applicationContext === condition.value;
          break;
        }
        case 'custom': {
          // Custom condition evaluation would be implemented here
          result = true;
          break;
        }
      }

      return condition.negate ? !result : result;
    });
  }

  /**
   * Evaluates string-based conditions
   */
  private evaluateStringCondition(condition: MiddlewareCondition, value: string): boolean {
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'contains':
        return value.includes(condition.value);
      case 'startsWith':
        return value.startsWith(condition.value);
      case 'endsWith':
        return value.endsWith(condition.value);
      case 'regex':
        return new RegExp(condition.value).test(value);
      case 'exists':
        return value !== undefined && value !== null;
      default:
        return false;
    }
  }

  /**
   * Validates middleware dependencies
   */
  private validateDependencies(middleware: IConfigurableMiddleware): void {
    if (!middleware.dependencies) {
      return;
    }

    for (const dependency of middleware.dependencies) {
      if (!this.middlewareRegistry.has(dependency)) {
        throw new Error(
          `Middleware ${middleware.name} depends on ${dependency}, but it is not registered`
        );
      }
    }
  }

  /**
   * Finds middleware that depend on the given middleware
   */
  private findDependents(middlewareName: string): string[] {
    const dependents: string[] = [];

    for (const [name, middleware] of this.middlewareRegistry) {
      if (middleware.dependencies?.includes(middlewareName)) {
        dependents.push(name);
      }
    }

    return dependents;
  }
}

/**
 * Middleware framework configuration
 */
export interface MiddlewareFrameworkConfig {
  readonly defaultTimeout: number;
  readonly continueOnError: boolean;
  readonly enableMetrics: boolean;
  readonly enableTracing: boolean;
  readonly maxExecutionTime: number;
}

/**
 * Middleware information for monitoring
 */
export interface MiddlewareInfo {
  readonly name: string;
  readonly priority: number;
  readonly enabled: boolean;
  readonly dependencies: readonly string[];
  readonly hasConditions: boolean;
}

/**
 * Default middleware framework configuration
 */
export const DEFAULT_MIDDLEWARE_CONFIG: MiddlewareFrameworkConfig = {
  defaultTimeout: 30000, // 30 seconds
  continueOnError: false,
  enableMetrics: true,
  enableTracing: true,
  maxExecutionTime: 60000 // 60 seconds
};