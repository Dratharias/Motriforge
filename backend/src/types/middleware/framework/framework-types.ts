/**
 * Core middleware framework types and interfaces
 */

import { ObjectId } from 'mongodb';
import { ISecurityContext } from '@/types/shared/base-types';
import { ApplicationContext } from '@/types/shared/enums/common';
import { MiddlewareCondition } from './condition-types';

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
  readonly metadata?: Record<string, any>;
}

/**
 * Next function type for middleware chain
 */
export type NextFunction = () => Promise<void>;

/**
 * Middleware execution context with additional state
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
 * Middleware configuration interface
 */
export interface MiddlewareConfig {
  readonly name: string;
  readonly enabled: boolean;
  readonly priority: number;
  readonly conditions?: MiddlewareCondition[];
  readonly timeout?: number;
  readonly retryCount?: number;
  readonly metadata?: Record<string, any>;
  readonly contexts?: readonly ApplicationContext[];
  readonly settings?: Record<string, any>;
  readonly dependencies?: readonly string[];
  readonly retries?: number;
}

/**
 * Base middleware interface
 */
export interface IMiddleware<TContext = RequestContext> {
  readonly name: string;
  execute(context: TContext, next: NextFunction): Promise<void>;
  shouldExecute(context: TContext): boolean;
}

/**
 * Enhanced middleware interface with configuration
 */
export interface IConfigurableMiddleware extends IMiddleware<RequestContext> {
  readonly config: MiddlewareConfig;
  readonly dependencies?: readonly string[];
  shouldExecute(context: RequestContext): boolean;
  onError(error: Error, context: RequestContext): Promise<MiddlewareResult>;
  
  /**
   * Updates middleware configuration (optional)
   */
  updateConfig?(newConfig: Partial<MiddlewareConfig>): void;
  
  /**
   * Gets current configuration (optional)
   */
  getConfig?(): MiddlewareConfig;
  
  /**
   * Validates configuration (optional)
   */
  validateConfig?(): boolean;
  
  /**
   * Lifecycle hooks (optional)
   */
  onInitialize?(): Promise<void>;
  onDestroy?(): Promise<void>;
  onEnable?(): Promise<void>;
  onDisable?(): Promise<void>;
}

/**
 * Middleware factory interface for dynamic creation
 */
export interface IMiddlewareFactory {
  create(config: MiddlewareConfig): IConfigurableMiddleware;
  supports(type: string): boolean;
  getType(): string;
  getVersion(): string;
}

/**
 * Middleware lifecycle events
 */
export enum MiddlewareLifecycleEvent {
  INITIALIZING = 'initializing',
  INITIALIZED = 'initialized',
  ENABLING = 'enabling',
  ENABLED = 'enabled',
  DISABLING = 'disabling',
  DISABLED = 'disabled',
  DESTROYING = 'destroying',
  DESTROYED = 'destroyed',
  ERROR = 'error'
}

/**
 * Middleware lifecycle listener interface
 */
export interface IMiddlewareLifecycleListener {
  onLifecycleEvent(
    middlewareName: string,
    event: MiddlewareLifecycleEvent,
    context?: any
  ): Promise<void>;
}

/**
 * Middleware execution options
 */
export interface MiddlewareExecutionOptions {
  readonly timeout?: number;
  readonly retries?: number;
  readonly retryDelay?: number;
  readonly continueOnError?: boolean;
  readonly enableProfiling?: boolean;
  readonly enableMetrics?: boolean;
  readonly priority?: number;
  readonly skipConditions?: boolean;
  readonly context?: Record<string, any>;
}

/**
 * Middleware execution result with detailed information
 */
export interface DetailedMiddlewareResult extends MiddlewareResult {
  readonly middlewareName: string;
  readonly executionTime: number;
  readonly retryCount: number;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly memoryUsage?: number;
  readonly cpuUsage?: number;
  readonly cacheHit?: boolean;
  readonly conditions?: {
    readonly evaluated: number;
    readonly passed: number;
    readonly failed: number;
  };
}

/**
 * Middleware registry interface
 */
export interface IMiddlewareRegistry {
  register(middleware: IConfigurableMiddleware): void;
  unregister(name: string): void;
  get(name: string): IConfigurableMiddleware | undefined;
  getAll(): readonly IConfigurableMiddleware[];
  has(name: string): boolean;
  setEnabled(name: string, enabled: boolean): void;
  isEnabled(name: string): boolean;
  getDependents(name: string): readonly string[];
  getDependencies(name: string): readonly string[];
  clear(): void;
}

/**
 * Middleware execution engine interface
 */
export interface IMiddlewareExecutionEngine {
  execute(
    middleware: Map<string, IConfigurableMiddleware>,
    context: RequestContext,
    options?: MiddlewareExecutionOptions
  ): Promise<MiddlewareResult>;
  
  executeSequential(
    middleware: readonly IConfigurableMiddleware[],
    context: RequestContext,
    options?: MiddlewareExecutionOptions
  ): Promise<MiddlewareResult>;
  
  executeParallel(
    middleware: readonly IConfigurableMiddleware[],
    context: RequestContext,
    options?: MiddlewareExecutionOptions
  ): Promise<MiddlewareResult>;
}

/**
 * Middleware error handling strategies
 */
export enum ErrorHandlingStrategy {
  STOP_ON_ERROR = 'stop_on_error',
  CONTINUE_ON_ERROR = 'continue_on_error',
  RETRY_ON_ERROR = 'retry_on_error',
  FALLBACK_ON_ERROR = 'fallback_on_error',
  CIRCUIT_BREAKER = 'circuit_breaker'
}

/**
 * Middleware error handler interface
 */
export interface IMiddlewareErrorHandler {
  handleError(
    error: Error,
    middleware: IConfigurableMiddleware,
    context: RequestContext
  ): Promise<MiddlewareResult>;
  
  canHandle(error: Error): boolean;
  getStrategy(): ErrorHandlingStrategy;
}

/**
 * Middleware metrics interface
 */
export interface IMiddlewareMetrics {
  recordExecution(
    middlewareName: string,
    duration: number,
    success: boolean,
    context: RequestContext
  ): void;
  
  recordError(
    middlewareName: string,
    error: Error,
    context: RequestContext
  ): void;
  
  getMetrics(middlewareName?: string): MiddlewareMetrics;
  reset(middlewareName?: string): void;
}

/**
 * Middleware metrics data
 */
export interface MiddlewareMetrics {
  readonly middlewareName?: string;
  readonly totalExecutions: number;
  readonly successfulExecutions: number;
  readonly failedExecutions: number;
  readonly averageExecutionTime: number;
  readonly minExecutionTime: number;
  readonly maxExecutionTime: number;
  readonly errorRate: number;
  readonly throughput: number;
  readonly lastExecuted?: Date;
  readonly errors: Record<string, number>;
}

/**
 * Middleware validation interface
 */
export interface IMiddlewareValidator {
  validate(middleware: IConfigurableMiddleware): MiddlewareValidationResult;
  validateConfig(config: MiddlewareConfig): MiddlewareValidationResult;
  validateDependencies(
    middleware: IConfigurableMiddleware,
    registry: IMiddlewareRegistry
  ): MiddlewareValidationResult;
}

/**
 * Middleware validation result
 */
export interface MiddlewareValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly suggestions?: readonly string[];
}

/**
 * Middleware plugin interface for extensibility
 */
export interface IMiddlewarePlugin {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  
  install(registry: IMiddlewareRegistry): Promise<void>;
  uninstall(registry: IMiddlewareRegistry): Promise<void>;
  getMiddleware(): readonly IConfigurableMiddleware[];
  isCompatible(frameworkVersion: string): boolean;
}