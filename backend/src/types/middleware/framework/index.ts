/**
 * Barrel export for middleware framework types
 * 
 * Exports all framework-related types and interfaces for easy importing.
 * Organized by category for better discoverability.
 */

import { MiddlewareCondition, ConditionGroup, IConditionValidator } from './condition-types';
import { MiddlewareFrameworkConfig } from './config-types';
import { RequestContext, MiddlewareResult, MiddlewareConfig, IConfigurableMiddleware, NextFunction, MiddlewareMetrics, IMiddlewareFactory, IMiddlewarePlugin, IMiddlewareErrorHandler } from './framework-types';
import { MiddlewareInfo, MiddlewareHealthInfo, MiddlewareExecutionStats } from './info-types';

// ===== CORE FRAMEWORK TYPES =====
export type {
  RequestContext,
  MiddlewareResult,
  NextFunction,
  MiddlewareExecutionContext,
  MiddlewareConfig,
  IMiddleware,
  IConfigurableMiddleware,
  IMiddlewareFactory,
  IMiddlewareRegistry,
  IMiddlewareExecutionEngine,
  IMiddlewareErrorHandler,
  IMiddlewareMetrics,
  IMiddlewareValidator,
  IMiddlewarePlugin,
  IMiddlewareLifecycleListener,
  MiddlewareExecutionOptions,
  DetailedMiddlewareResult,
  MiddlewareMetrics,
  MiddlewareValidationResult
} from './framework-types';

// ===== CONFIGURATION TYPES =====
export type {
  MiddlewareFrameworkConfig,
  CompleteMiddlewareFrameworkConfig,
  TimeoutConfig,
  PerformanceConfig,
  SecurityConfig,
  RetryConfig,
  CachingConfig,
  MonitoringConfig,
  AlertThresholds,
  DevelopmentConfig,
  ProductionConfig,
  EnvironmentConfig
} from './config-types';

// ===== CONDITION TYPES =====
export type {
  MiddlewareCondition,
  PathCondition,
  MethodCondition,
  HeaderCondition,
  QueryCondition,
  BodyCondition,
  ContextCondition,
  UserCondition,
  RoleCondition,
  PermissionCondition,
  TimeCondition,
  RateLimitCondition,
  CustomCondition,
  SpecificCondition,
  ConditionGroup,
  ConditionEvaluationResult,
  ConditionEvaluationContext,
  IConditionValidator,
  IConditionBuilder,
  ConditionValidationResult,
  ConditionPreset,
  ConditionPerformanceMetrics
} from './condition-types';

// ===== INFORMATION TYPES =====
export type {
  MiddlewareInfo,
  DetailedMiddlewareInfo,
  MiddlewareExecutionStats,
  PerformanceDataPoint,
  MiddlewareHealthInfo,
  HealthDetails,
  MemoryUsage,
  ConnectivityStatus,
  PerformanceMetrics,
  MiddlewareDependencyInfo,
  MiddlewareConfigurationInfo,
  ConditionSummary,
  MiddlewareSecurityInfo,
  SecurityViolation,
  ComplianceStatus,
  MiddlewareUsageInfo,
  UsageDataPoint,
  UsageTrends,
  MiddlewareSummary,
  MiddlewareInventory,
  MiddlewareComparison,
  PerformanceComparison,
  FeatureComparison,
  UsageComparison,
  ComparisonRecommendation
} from './info-types';

// ===== ENUMS =====
export {
  ExecutionMode,
} from './config-types';

export {
  ConditionType,
  ConditionOperator
} from './condition-types';

export {
  HealthStatus,
  SecurityLevel
} from './info-types';

// ===== BARREL RE-EXPORTS FOR CONVENIENCE =====

/**
 * Common middleware types for basic usage
 */
export type BasicMiddlewareTypes = {
  RequestContext: RequestContext;
  MiddlewareResult: MiddlewareResult;
  MiddlewareConfig: MiddlewareConfig;
  IConfigurableMiddleware: IConfigurableMiddleware;
  NextFunction: NextFunction;
};

/**
 * Configuration types for framework setup
 */
export type ConfigurationTypes = {
  MiddlewareFrameworkConfig: MiddlewareFrameworkConfig;
  MiddlewareCondition: MiddlewareCondition;
  ConditionGroup: ConditionGroup;
};

/**
 * Monitoring and info types for observability
 */
export type MonitoringTypes = {
  MiddlewareInfo: MiddlewareInfo;
  MiddlewareHealthInfo: MiddlewareHealthInfo;
  MiddlewareExecutionStats: MiddlewareExecutionStats;
  MiddlewareMetrics: MiddlewareMetrics;
};

/**
 * Extension types for building custom middleware
 */
export type ExtensionTypes = {
  IMiddlewareFactory: IMiddlewareFactory;
  IMiddlewarePlugin: IMiddlewarePlugin;
  IConditionValidator: IConditionValidator;
  IMiddlewareErrorHandler: IMiddlewareErrorHandler;
};

// ===== TYPE GUARDS =====

/**
 * Type guard to check if an object is a valid RequestContext
 */
export function isRequestContext(obj: any): obj is RequestContext {
  return obj &&
    typeof obj === 'object' &&
    obj.requestId &&
    obj.timestamp instanceof Date &&
    typeof obj.path === 'string' &&
    typeof obj.method === 'string' &&
    typeof obj.headers === 'object' &&
    typeof obj.startTime === 'number';
}

/**
 * Type guard to check if an object is a valid MiddlewareResult
 */
export function isMiddlewareResult(obj: any): obj is MiddlewareResult {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.success === 'boolean' &&
    typeof obj.shouldContinue === 'boolean';
}

/**
 * Type guard to check if an object is a valid MiddlewareConfig
 */
export function isMiddlewareConfig(obj: any): obj is MiddlewareConfig {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.name === 'string' &&
    typeof obj.enabled === 'boolean' &&
    typeof obj.priority === 'number';
}

/**
 * Type guard to check if an object implements IConfigurableMiddleware
 */
export function isConfigurableMiddleware(obj: any): obj is IConfigurableMiddleware {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.name === 'string' &&
    typeof obj.execute === 'function' &&
    typeof obj.shouldExecute === 'function' &&
    typeof obj.onError === 'function' &&
    obj.config &&
    isMiddlewareConfig(obj.config);
}