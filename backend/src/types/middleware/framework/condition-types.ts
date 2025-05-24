/**
 * Middleware condition types for conditional execution
 */

import { ApplicationContext } from '@/types/shared/enums/common';

/**
 * Condition types that can be evaluated
 */
export enum ConditionType {
  PATH = 'path',
  METHOD = 'method',
  HEADER = 'header',
  QUERY = 'query',
  BODY = 'body',
  CONTEXT = 'context',
  USER = 'user',
  ROLE = 'role',
  PERMISSION = 'permission',
  TIME = 'time',
  RATE_LIMIT = 'rate_limit',
  CUSTOM = 'custom'
}

/**
 * Condition operators for evaluation
 */
export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith',
  REGEX = 'regex',
  EXISTS = 'exists',
  NOT_EXISTS = 'not_exists',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  IN = 'in',
  NOT_IN = 'not_in',
  BETWEEN = 'between',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty'
}

/**
 * Base middleware condition interface
 */
export interface MiddlewareCondition {
  readonly type: ConditionType;
  readonly operator: ConditionOperator;
  readonly value: any;
  readonly negate?: boolean;
  readonly description?: string;
  readonly metadata?: Record<string, any>;
}

/**
 * Path-based condition
 */
export interface PathCondition extends MiddlewareCondition {
  readonly type: ConditionType.PATH;
  readonly value: string | RegExp;
  readonly caseSensitive?: boolean;
}

/**
 * HTTP method condition
 */
export interface MethodCondition extends MiddlewareCondition {
  readonly type: ConditionType.METHOD;
  readonly value: string | string[];
}

/**
 * Header-based condition
 */
export interface HeaderCondition extends MiddlewareCondition {
  readonly type: ConditionType.HEADER;
  readonly headerName: string;
  readonly value: string | string[] | RegExp;
  readonly caseSensitive?: boolean;
}

/**
 * Query parameter condition
 */
export interface QueryCondition extends MiddlewareCondition {
  readonly type: ConditionType.QUERY;
  readonly paramName: string;
  readonly value: any;
}

/**
 * Request body condition
 */
export interface BodyCondition extends MiddlewareCondition {
  readonly type: ConditionType.BODY;
  readonly jsonPath?: string;
  readonly value: any;
}

/**
 * Application context condition
 */
export interface ContextCondition extends MiddlewareCondition {
  readonly type: ConditionType.CONTEXT;
  readonly value: ApplicationContext | ApplicationContext[];
}

/**
 * User-based condition
 */
export interface UserCondition extends MiddlewareCondition {
  readonly type: ConditionType.USER;
  readonly userProperty: string;
  readonly value: any;
}

/**
 * Role-based condition
 */
export interface RoleCondition extends MiddlewareCondition {
  readonly type: ConditionType.ROLE;
  readonly value: string | string[];
  readonly requireAll?: boolean;
}

/**
 * Permission-based condition
 */
export interface PermissionCondition extends MiddlewareCondition {
  readonly type: ConditionType.PERMISSION;
  readonly value: string | string[];
  readonly resource?: string;
  readonly requireAll?: boolean;
}

/**
 * Time-based condition
 */
export interface TimeCondition extends MiddlewareCondition {
  readonly type: ConditionType.TIME;
  readonly timeRange?: {
    readonly start: string; // HH:mm format
    readonly end: string;   // HH:mm format
  };
  readonly daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  readonly timezone?: string;
}

/**
 * Rate limiting condition
 */
export interface RateLimitCondition extends MiddlewareCondition {
  readonly type: ConditionType.RATE_LIMIT;
  readonly limit: number;
  readonly window: number; // in milliseconds
  readonly keyGenerator?: string; // Function name or strategy
}

/**
 * Custom condition for extensible logic
 */
export interface CustomCondition extends MiddlewareCondition {
  readonly type: ConditionType.CUSTOM;
  readonly evaluator: string; // Function name or identifier
  readonly parameters?: Record<string, any>;
}

/**
 * Condition group for complex logic
 */
export interface ConditionGroup {
  readonly operator: 'AND' | 'OR';
  readonly conditions: readonly (MiddlewareCondition | ConditionGroup)[];
  readonly negate?: boolean;
}

/**
 * Condition evaluation result
 */
export interface ConditionEvaluationResult {
  readonly condition: MiddlewareCondition;
  readonly result: boolean;
  readonly evaluationTime: number;
  readonly error?: string;
  readonly metadata?: Record<string, any>;
}

/**
 * Condition evaluation context
 */
export interface ConditionEvaluationContext {
  readonly path: string;
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly query: Record<string, any>;
  readonly body?: any;
  readonly user?: any;
  readonly roles?: string[];
  readonly permissions?: string[];
  readonly applicationContext?: ApplicationContext;
  readonly timestamp: Date;
  readonly metadata: Record<string, any>;
}

/**
 * Condition validator interface
 */
export interface IConditionValidator {
  validate(condition: MiddlewareCondition): ConditionValidationResult;
  validateGroup(group: ConditionGroup): ConditionValidationResult;
}

/**
 * Condition validation result
 */
export interface ConditionValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Condition preset for common scenarios
 */
export interface ConditionPreset {
  readonly name: string;
  readonly description: string;
  readonly conditions: readonly MiddlewareCondition[];
  readonly group?: ConditionGroup;
  readonly category: string;
  readonly tags: readonly string[];
}

/**
 * Condition performance metrics
 */
export interface ConditionPerformanceMetrics {
  readonly conditionType: ConditionType;
  readonly averageEvaluationTime: number;
  readonly evaluationCount: number;
  readonly successRate: number;
  readonly errorRate: number;
  readonly lastEvaluated: Date;
}

/**
 * Union type for all specific condition types
 */
export type SpecificCondition = 
  | PathCondition
  | MethodCondition
  | HeaderCondition
  | QueryCondition
  | BodyCondition
  | ContextCondition
  | UserCondition
  | RoleCondition
  | PermissionCondition
  | TimeCondition
  | RateLimitCondition
  | CustomCondition;

/**
 * Condition builder interface for fluent API
 */
export interface IConditionBuilder {
  path(value: string | RegExp): IConditionBuilder;
  method(value: string | string[]): IConditionBuilder;
  header(name: string, value: string | RegExp): IConditionBuilder;
  query(name: string, value: any): IConditionBuilder;
  context(value: ApplicationContext): IConditionBuilder;
  user(property: string, value: any): IConditionBuilder;
  role(value: string | string[]): IConditionBuilder;
  permission(value: string | string[]): IConditionBuilder;
  time(start: string, end: string): IConditionBuilder;
  custom(evaluator: string, parameters?: Record<string, any>): IConditionBuilder;
  negate(): IConditionBuilder;
  and(): IConditionBuilder;
  or(): IConditionBuilder;
  build(): MiddlewareCondition | ConditionGroup;
}