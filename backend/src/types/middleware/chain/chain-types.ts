import { ObjectId } from 'mongodb';
import { 
  MiddlewareResult, 
  MiddlewareExecutionContext 
} from '@/middleware/MiddlewareFramework';

/**
 * Chain execution result with detailed information
 */
export interface ChainExecutionResult extends MiddlewareResult {
  readonly executionId: ObjectId;
  readonly totalDuration: number;
  readonly middlewareResults: readonly MiddlewareExecutionResult[];
  readonly performance: ChainPerformanceMetrics;
  readonly metadata: Record<string, any>;
}

/**
 * Individual middleware execution result
 */
export interface MiddlewareExecutionResult {
  readonly middlewareName: string;
  readonly success: boolean;
  readonly duration: number;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly error?: Error;
  readonly skipped: boolean;
  readonly retryCount: number;
  readonly metadata?: Record<string, any>;
}

/**
 * Chain performance metrics
 */
export interface ChainPerformanceMetrics {
  readonly totalMiddleware: number;
  readonly executedMiddleware: number;
  readonly skippedMiddleware: number;
  readonly failedMiddleware: number;
  readonly averageExecutionTime: number;
  readonly slowestMiddleware?: string;
  readonly fastestMiddleware?: string;
  readonly bottlenecks: readonly string[];
}

/**
 * Chain execution options
 */
export interface ChainExecutionOptions {
  readonly continueOnError: boolean;
  readonly enableRetries: boolean;
  readonly maxRetries: number;
  readonly retryDelay: number;
  readonly timeout: number;
  readonly enableProfiling: boolean;
  readonly parallelExecution: boolean;
  readonly parallelGroups?: readonly ParallelGroup[];
}

/**
 * Parallel execution group
 */
export interface ParallelGroup {
  readonly name: string;
  readonly middlewareNames: readonly string[];
  readonly waitForAll: boolean;
  readonly timeout?: number;
}

/**
 * Middleware chain state
 */
export enum ChainState {
  IDLE = 'idle',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Chain execution context with additional metadata
 */
export interface ChainExecutionContext extends MiddlewareExecutionContext {
  readonly executionId: ObjectId;
  readonly options: ChainExecutionOptions;
  readonly state: ChainState;
  readonly results: MiddlewareExecutionResult[];
  readonly currentMiddleware?: string;
  readonly abortController: AbortController;
}

/**
 * Chain information interface
 */
export interface ChainInfo {
  readonly middlewareCount: number;
  readonly executionOrder: readonly string[];
  readonly middleware: readonly {
    readonly name: string;
    readonly priority: number;
    readonly enabled: boolean;
    readonly dependencies: readonly string[];
  }[];
}

/**
 * Chain validation result
 */
export interface ChainValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Middleware chain configuration
 */
export interface MiddlewareChainConfig {
  readonly defaultExecutionOptions: ChainExecutionOptions;
  readonly enableValidation: boolean;
  readonly enablePerformanceTracking: boolean;
  readonly maxChainSize: number;
}


/**
 * Missing dependency information
 */
export interface MissingDependency {
  readonly middleware: string;
  readonly missingDependency: string;
}

/**
 * Dependency validation result
 */
export interface DependencyValidationResult {
  readonly circularDependencies: string[];
  readonly missingDependencies: readonly MissingDependency[];
}
