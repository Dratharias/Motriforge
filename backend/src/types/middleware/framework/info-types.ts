/**
 * Middleware information and metadata types
 */

import { ObjectId } from 'mongodb';
import { ApplicationContext } from '@/types/shared/enums/common';
import { MiddlewareCategory } from '@/types/middleware/registry/enums';

/**
 * Basic middleware information for monitoring and management
 */
export interface MiddlewareInfo {
  readonly name: string;
  readonly priority: number;
  readonly enabled: boolean;
  readonly dependencies: readonly string[];
  readonly hasConditions: boolean;
  readonly version?: string;
  readonly description?: string;
  readonly author?: string;
  readonly category?: MiddlewareCategory;
}

/**
 * Detailed middleware information with runtime stats
 */
export interface DetailedMiddlewareInfo extends MiddlewareInfo {
  readonly id: ObjectId;
  readonly registeredAt: Date;
  readonly lastUsed?: Date;
  readonly lastModified?: Date;
  readonly usageCount: number;
  readonly averageExecutionTime: number;
  readonly successRate: number;
  readonly errorRate: number;
  readonly contexts: readonly ApplicationContext[];
  readonly tags: readonly string[];
  readonly metadata: Record<string, any>;
}

/**
 * Middleware execution statistics
 */
export interface MiddlewareExecutionStats {
  readonly middlewareName: string;
  readonly totalExecutions: number;
  readonly successfulExecutions: number;
  readonly failedExecutions: number;
  readonly skippedExecutions: number;
  readonly averageExecutionTime: number;
  readonly minExecutionTime: number;
  readonly maxExecutionTime: number;
  readonly lastExecutionTime?: Date;
  readonly errorTypes: Record<string, number>;
  readonly performanceTrend: readonly PerformanceDataPoint[];
}

/**
 * Performance data point for trending
 */
export interface PerformanceDataPoint {
  readonly timestamp: Date;
  readonly executionTime: number;
  readonly success: boolean;
  readonly memoryUsage?: number;
  readonly cpuUsage?: number;
}

/**
 * Middleware health status
 */
export interface MiddlewareHealthInfo {
  readonly middlewareName: string;
  readonly status: HealthStatus;
  readonly lastHealthCheck: Date;
  readonly responseTime?: number;
  readonly errorMessage?: string;
  readonly healthScore: number; // 0-100
  readonly uptime: number; // in milliseconds
  readonly availability: number; // percentage
  readonly details: HealthDetails;
}

/**
 * Health status enumeration
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  CRITICAL = 'critical',
  UNKNOWN = 'unknown'
}

/**
 * Detailed health information
 */
export interface HealthDetails {
  readonly memoryUsage?: MemoryUsage;
  readonly cpuUsage?: number;
  readonly dependenciesHealth: Record<string, HealthStatus>;
  readonly configurationValid: boolean;
  readonly permissionsValid: boolean;
  readonly connectivityStatus: ConnectivityStatus;
  readonly performanceMetrics: PerformanceMetrics;
}

/**
 * Memory usage information
 */
export interface MemoryUsage {
  readonly used: number;
  readonly total: number;
  readonly percentage: number;
  readonly heapUsed?: number;
  readonly heapTotal?: number;
}

/**
 * Connectivity status for external dependencies
 */
export interface ConnectivityStatus {
  readonly database: boolean;
  readonly cache: boolean;
  readonly externalAPIs: Record<string, boolean>;
  readonly messageQueues: Record<string, boolean>;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  readonly requestsPerSecond: number;
  readonly errorRate: number;
  readonly averageResponseTime: number;
  readonly p95ResponseTime: number;
  readonly p99ResponseTime: number;
  readonly throughput: number;
}

/**
 * Middleware dependency information
 */
export interface MiddlewareDependencyInfo {
  readonly middlewareName: string;
  readonly directDependencies: readonly string[];
  readonly indirectDependencies: readonly string[];
  readonly dependents: readonly string[];
  readonly dependencyDepth: number;
  readonly circularDependencies: readonly string[];
  readonly missingDependencies: readonly string[];
}

/**
 * Middleware configuration summary
 */
export interface MiddlewareConfigurationInfo {
  readonly middlewareName: string;
  readonly enabled: boolean;
  readonly priority: number;
  readonly timeout?: number;
  readonly retries?: number;
  readonly conditions: readonly ConditionSummary[];
  readonly contexts: readonly ApplicationContext[];
  readonly settings: Record<string, any>;
  readonly lastConfigUpdate: Date;
  readonly configurationValid: boolean;
  readonly validationErrors: readonly string[];
}

/**
 * Condition summary for configuration info
 */
export interface ConditionSummary {
  readonly type: string;
  readonly operator: string;
  readonly description: string;
  readonly enabled: boolean;
}

/**
 * Middleware security information
 */
export interface MiddlewareSecurityInfo {
  readonly middlewareName: string;
  readonly securityLevel: SecurityLevel;
  readonly permissions: readonly string[];
  readonly requiredRoles: readonly string[];
  readonly accessControlEnabled: boolean;
  readonly auditingEnabled: boolean;
  readonly encryptionRequired: boolean;
  readonly lastSecurityCheck: Date;
  readonly securityViolations: readonly SecurityViolation[];
  readonly complianceStatus: ComplianceStatus;
}

/**
 * Security level enumeration
 */
export enum SecurityLevel {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  RESTRICTED = 'restricted',
  CONFIDENTIAL = 'confidential',
  TOP_SECRET = 'top_secret'
}

/**
 * Security violation information
 */
export interface SecurityViolation {
  readonly timestamp: Date;
  readonly violationType: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
  readonly userId?: ObjectId;
  readonly ipAddress?: string;
  readonly resolved: boolean;
}

/**
 * Compliance status information
 */
export interface ComplianceStatus {
  readonly gdprCompliant: boolean;
  readonly hipaaCompliant: boolean;
  readonly soxCompliant: boolean;
  readonly iso27001Compliant: boolean;
  readonly lastComplianceCheck: Date;
  readonly complianceScore: number; // 0-100
  readonly violations: readonly string[];
}

/**
 * Middleware usage pattern information
 */
export interface MiddlewareUsageInfo {
  readonly middlewareName: string;
  readonly dailyUsage: readonly UsageDataPoint[];
  readonly hourlyDistribution: Record<number, number>; // hour -> count
  readonly contextUsage: Record<ApplicationContext, number>;
  readonly userUsage: Record<string, number>; // userId -> count
  readonly geographicUsage: Record<string, number>; // region -> count
  readonly deviceUsage: Record<string, number>; // device type -> count
  readonly peakUsageTime: Date;
  readonly usageTrends: UsageTrends;
}

/**
 * Usage data point for trending
 */
export interface UsageDataPoint {
  readonly date: Date;
  readonly count: number;
  readonly uniqueUsers: number;
  readonly successRate: number;
  readonly averageResponseTime: number;
}

/**
 * Usage trends analysis
 */
export interface UsageTrends {
  readonly growing: boolean;
  readonly stable: boolean;
  readonly declining: boolean;
  readonly seasonal: boolean;
  readonly growthRate: number; // percentage
  readonly forecastNextMonth: number;
}

/**
 * Middleware summary for dashboards
 */
export interface MiddlewareSummary {
  readonly totalMiddleware: number;
  readonly enabledMiddleware: number;
  readonly disabledMiddleware: number;
  readonly healthyMiddleware: number;
  readonly unhealthyMiddleware: number;
  readonly averageExecutionTime: number;
  readonly totalExecutions: number;
  readonly successRate: number;
  readonly mostUsedMiddleware: readonly string[];
  readonly leastUsedMiddleware: readonly string[];
  readonly recentlyAddedMiddleware: readonly string[];
  readonly problematicMiddleware: readonly string[];
}

/**
 * Middleware inventory for management
 */
export interface MiddlewareInventory {
  readonly middleware: readonly DetailedMiddlewareInfo[];
  readonly categories: Record<MiddlewareCategory, number>;
  readonly contexts: Record<ApplicationContext, number>;
  readonly dependencies: readonly MiddlewareDependencyInfo[];
  readonly duplicates: readonly string[];
  readonly orphaned: readonly string[];
  readonly deprecated: readonly string[];
  readonly lastUpdated: Date;
}

/**
 * Middleware comparison information
 */
export interface MiddlewareComparison {
  readonly middlewareA: string;
  readonly middlewareB: string;
  readonly performanceComparison: PerformanceComparison;
  readonly featureComparison: FeatureComparison;
  readonly usageComparison: UsageComparison;
  readonly recommendation: ComparisonRecommendation;
}

/**
 * Performance comparison between middleware
 */
export interface PerformanceComparison {
  readonly executionTimeDifference: number;
  readonly memoryUsageDifference: number;
  readonly successRateDifference: number;
  readonly throughputDifference: number;
  readonly betterPerformer: string;
}

/**
 * Feature comparison between middleware
 */
export interface FeatureComparison {
  readonly commonFeatures: readonly string[];
  readonly uniqueFeaturesA: readonly string[];
  readonly uniqueFeaturesB: readonly string[];
  readonly featureScore: number; // -100 to 100
}

/**
 * Usage comparison between middleware
 */
export interface UsageComparison {
  readonly usageCountDifference: number;
  readonly contextOverlap: readonly ApplicationContext[];
  readonly userOverlap: number; // percentage
  readonly morePopular: string;
}

/**
 * Comparison recommendation
 */
export interface ComparisonRecommendation {
  readonly recommended: string;
  readonly reason: string;
  readonly confidence: number; // 0-100
  readonly considerations: readonly string[];
}