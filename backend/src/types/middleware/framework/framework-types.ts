import { ObjectId } from 'mongodb';
import { ApplicationContext } from '@/types/shared/enums/common';

/**
 * Middleware configuration interface
 */
export interface MiddlewareConfig {
  readonly name: string;
  readonly enabled: boolean;
  readonly priority: number;
  readonly contexts?: readonly ApplicationContext[];
  readonly settings?: Record<string, any>;
  readonly dependencies?: readonly string[];
  readonly timeout?: number;
  readonly retries?: number;
}

/**
 * Request context for middleware processing
 */
export interface RequestContext {
  readonly requestId: ObjectId;
  readonly timestamp: Date;
  readonly path: string;
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly query: Record<string, any>;
  readonly params: Record<string, any>;
  readonly startTime: number;
  readonly metadata: Record<string, any>;
}

/**
 * Base middleware interface
 */
export interface IMiddleware {
  readonly name: string;
  readonly priority: number;
  execute(context: RequestContext, next: () => Promise<void>): Promise<void>;
  shouldExecute(context: RequestContext): boolean;
}

/**
 * Configurable middleware interface
 */
export interface IConfigurableMiddleware extends IMiddleware {
  readonly config: MiddlewareConfig;
  readonly dependencies?: readonly string[];
  
  /**
   * Updates middleware configuration
   */
  updateConfig(newConfig: Partial<MiddlewareConfig>): void;
  
  /**
   * Gets current configuration
   */
  getConfig(): MiddlewareConfig;
  
  /**
   * Validates configuration
   */
  validateConfig(): boolean;
}