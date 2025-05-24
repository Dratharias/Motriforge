import { ObjectId } from 'mongodb';
import { ApplicationContext } from '@/types/shared/enums/common';
import { MiddlewareCategory, RegistryEventType, ValidationErrorType } from './enums';
import { IConfigurableMiddleware, MiddlewareConfig } from '@/middleware/MiddlewareFramework/MiddlewareFramework';

/**
 * Middleware registration metadata
 */
export interface MiddlewareRegistration {
  readonly id: ObjectId;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly author: string;
  readonly category: MiddlewareCategory;
  readonly contexts: readonly ApplicationContext[];
  readonly middleware: IConfigurableMiddleware;
  readonly registeredAt: Date;
  readonly lastUsed?: Date;
  readonly usageCount: number;
  readonly tags: readonly string[];
  readonly metadata: Record<string, any>;
}

/**
 * Middleware discovery criteria
 */
export interface MiddlewareDiscoveryCriteria {
  readonly category?: MiddlewareCategory;
  readonly context?: ApplicationContext;
  readonly tags?: readonly string[];
  readonly enabled?: boolean;
  readonly priority?: {
    readonly min?: number;
    readonly max?: number;
  };
  readonly dependencies?: readonly string[];
  readonly search?: string;
}

/**
 * Middleware registry statistics
 */
export interface MiddlewareRegistryStats {
  readonly totalRegistered: number;
  readonly enabledCount: number;
  readonly disabledCount: number;
  readonly categoryCounts: Record<MiddlewareCategory, number>;
  readonly contextCounts: Record<ApplicationContext, number>;
  readonly averageUsage: number;
  readonly mostUsed: readonly string[];
  readonly leastUsed: readonly string[];
  readonly registrationTrends: readonly RegistrationTrend[];
}

/**
 * Registration trend data
 */
export interface RegistrationTrend {
  readonly date: Date;
  readonly registrations: number;
  readonly category: MiddlewareCategory;
}

/**
 * Middleware health check result
 */
export interface MiddlewareHealthCheck {
  readonly middlewareName: string;
  readonly healthy: boolean;
  readonly lastCheck: Date;
  readonly responseTime?: number;
  readonly error?: string;
  readonly details?: Record<string, any>;
}

/**
 * Registry event interface
 */
export interface RegistryEvent {
  readonly type: RegistryEventType;
  readonly middlewareName: string;
  readonly timestamp: Date;
  readonly metadata?: Record<string, any>;
}

/**
 * Registry event listener interface
 */
export interface IRegistryEventListener {
  onRegistryEvent(event: RegistryEvent): void;
}

/**
 * Middleware factory interface for dynamic creation
 */
export interface IMiddlewareFactory {
  create(config: MiddlewareConfig): IConfigurableMiddleware;
  supports(type: string): boolean;
}

/**
 * Registry validation error with severity
 */
export interface RegistryValidationError {
  readonly field: string;
  readonly message: string;
  readonly code: ValidationErrorType;
  readonly value?: any;
  readonly severity: 'warning' | 'error';
}

/**
 * Registry validation result
 */
export interface RegistryValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Registry configuration
 */
export interface RegistryConfig {
  readonly enableHealthChecks: boolean;
  readonly healthCheckInterval: number;
  readonly enableStatistics: boolean;
  readonly enableValidation: boolean;
  readonly maxRegistrations: number;
}