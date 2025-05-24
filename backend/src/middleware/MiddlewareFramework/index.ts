/**
 * Barrel export for middleware framework components
 */

// Core framework
export { MiddlewareFramework } from './MiddlewareFramework';

// Specialized components
export { MiddlewareRegistrationManager } from './MiddlewareRegistrationManager';
export { MiddlewareExecutionEngine } from './MiddlewareExecutionEngine';
export { MiddlewareConditionEvaluator } from './MiddlewareConditionEvaluator';
export { MiddlewarePolicyEnforcer } from './MiddlewarePolicyEnforcer';
export { MiddlewareConfigurationManager, DEFAULT_MIDDLEWARE_CONFIG } from './MiddlewareConfigurationManager';

// Types and interfaces
export type {
  RequestContext,
  MiddlewareResult,
  NextFunction,
  MiddlewareExecutionContext,
  MiddlewareConfig,
  IConfigurableMiddleware
} from '@/types/middleware/framework/framework-types';

export type {
  MiddlewareFrameworkConfig
} from '@/types/middleware/framework';

export type {
  MiddlewareCondition
} from '@/types/middleware/framework';

export type {
  MiddlewareInfo
} from '@/types/middleware/framework';