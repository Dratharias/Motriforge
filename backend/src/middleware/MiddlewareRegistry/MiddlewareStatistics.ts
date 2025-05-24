import { ApplicationContext } from '@/types/shared/enums/common';
import { ContextualLogger } from '@/shared-kernel/infrastructure/logging/ContextualLogger';
import { 
  MiddlewareRegistration, 
  MiddlewareRegistryStats,
  RegistrationTrend 
} from '@/types/middleware/registry/registry-types';
import { MiddlewareCategory } from '@/types/middleware/registry/enums';

/**
 * Usage trend data point
 */
export interface UsageTrend {
  readonly date: Date;
  readonly middlewareName: string;
  readonly usageCount: number;
  readonly category: MiddlewareCategory;
}

/**
 * Performance metrics for middleware
 */
export interface MiddlewarePerformanceMetrics {
  readonly middlewareName: string;
  readonly averageExecutionTime: number;
  readonly totalExecutions: number;
  readonly errorRate: number;
  readonly lastExecuted: Date;
  readonly peakUsageTime: Date;
}

/**
 * Category statistics
 */
export interface CategoryStats {
  readonly category: MiddlewareCategory;
  readonly count: number;
  readonly percentage: number;
  readonly averageUsage: number;
  readonly mostUsed: string;
  readonly leastUsed: string;
}

/**
 * Context statistics
 */
export interface ContextStats {
  readonly context: ApplicationContext;
  readonly count: number;
  readonly percentage: number;
  readonly averageUsage: number;
  readonly topMiddleware: readonly string[];
}

/**
 * Handles statistics collection and analysis for middleware registry
 */
export class MiddlewareStatistics {
  private readonly logger: ContextualLogger;
  private readonly usageTrends: UsageTrend[];
  private readonly performanceMetrics: Map<string, MiddlewarePerformanceMetrics>;

  constructor(logger: ContextualLogger) {
    this.logger = logger;
    this.usageTrends = [];
    this.performanceMetrics = new Map();
  }

  /**
   * Generates comprehensive registry statistics
   */
  generateStats(registrations: Map<string, MiddlewareRegistration>): MiddlewareRegistryStats {
    const registrationArray = Array.from(registrations.values());
    
    const totalRegistered = registrationArray.length;
    const enabledCount = registrationArray.filter(r => r.middleware.config.enabled).length;
    const disabledCount = totalRegistered - enabledCount;

    const categoryCounts = this.calculateCategoryCounts(registrationArray);
    const contextCounts = this.calculateContextCounts(registrationArray);
    
    const usageCounts = registrationArray.map(r => r.usageCount);
    const averageUsage = usageCounts.length > 0 
      ? usageCounts.reduce((sum, count) => sum + count, 0) / usageCounts.length 
      : 0;

    const { mostUsed, leastUsed } = this.calculateUsageRankings(registrationArray);
    const registrationTrends = this.calculateRegistrationTrends(registrationArray);

    this.logger.debug('Registry statistics generated', {
      totalRegistered,
      enabledCount,
      disabledCount,
      averageUsage
    });

    return {
      totalRegistered,
      enabledCount,
      disabledCount,
      categoryCounts,
      contextCounts,
      averageUsage,
      mostUsed,
      leastUsed,
      registrationTrends
    };
  }

  /**
   * Gets detailed category statistics
   */
  getCategoryStats(registrations: Map<string, MiddlewareRegistration>): readonly CategoryStats[] {
    const registrationArray = Array.from(registrations.values());
    const totalCount = registrationArray.length;
    
    const categoryGroups = this.groupByCategory(registrationArray);
    const stats: CategoryStats[] = [];

    for (const [category, middleware] of categoryGroups) {
      const count = middleware.length;
      const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
      const usageCounts = middleware.map(m => m.usageCount);
      const averageUsage = usageCounts.length > 0 
        ? usageCounts.reduce((sum, count) => sum + count, 0) / usageCounts.length 
        : 0;

      const sortedByUsage = [...middleware].sort((a, b) => b.usageCount - a.usageCount);
      const mostUsed = sortedByUsage[0]?.name || '';
      const leastUsed = sortedByUsage[sortedByUsage.length - 1]?.name || '';

      stats.push({
        category,
        count,
        percentage,
        averageUsage,
        mostUsed,
        leastUsed
      });
    }

    return stats.sort((a, b) => b.count - a.count);
  }

  /**
   * Gets detailed context statistics
   */
  getContextStats(registrations: Map<string, MiddlewareRegistration>): readonly ContextStats[] {
    const registrationArray = Array.from(registrations.values());
    const totalCount = registrationArray.length;
    
    const contextGroups = this.groupByContext(registrationArray);
    const stats: ContextStats[] = [];

    for (const [context, middleware] of contextGroups) {
      const count = middleware.length;
      const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
      const usageCounts = middleware.map(m => m.usageCount);
      const averageUsage = usageCounts.length > 0 
        ? usageCounts.reduce((sum, count) => sum + count, 0) / usageCounts.length 
        : 0;

      const topMiddleware = [...middleware]
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5)
        .map(m => m.name);

      stats.push({
        context,
        count,
        percentage,
        averageUsage,
        topMiddleware
      });
    }

    return stats.sort((a, b) => b.count - a.count);
  }

  /**
   * Records usage for a middleware
   */
  recordUsage(middlewareName: string, executionTime?: number): void {
    const now = new Date();
    
    // Record usage trend
    this.usageTrends.push({
      date: now,
      middlewareName,
      usageCount: 1,
      category: MiddlewareCategory.CUSTOM // This should be looked up from registration
    });

    // Update performance metrics
    if (executionTime !== undefined) {
      this.updatePerformanceMetrics(middlewareName, executionTime, now);
    }

    // Maintain trend data size (keep last 10000 entries)
    while (this.usageTrends.length > 10000) {
      this.usageTrends.shift();
    }
  }

  /**
   * Gets usage trends for a specific time period
   */
  getUsageTrends(
    days: number = 30,
    middlewareName?: string
  ): readonly UsageTrend[] {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    let trends = this.usageTrends.filter(trend => trend.date > cutoffDate);
    
    if (middlewareName) {
      trends = trends.filter(trend => trend.middlewareName === middlewareName);
    }

    return trends.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Gets aggregated usage data by day
   */
  getDailyUsageStats(days: number = 30): readonly DailyUsageStats[] {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const trends = this.usageTrends.filter(trend => trend.date > cutoffDate);
    
    // Group by date (day)
    const dailyGroups = new Map<string, UsageTrend[]>();
    
    for (const trend of trends) {
      const dateKey = trend.date.toISOString().split('T')[0]; // YYYY-MM-DD
      if (!dailyGroups.has(dateKey)) {
        dailyGroups.set(dateKey, []);
      }
      dailyGroups.get(dateKey)!.push(trend);
    }

    const dailyStats: DailyUsageStats[] = [];
    
    for (const [dateKey, dayTrends] of dailyGroups) {
      const totalUsage = dayTrends.length;
      const uniqueMiddleware = new Set(dayTrends.map(t => t.middlewareName)).size;
      const topMiddleware = this.getTopMiddlewareForDay(dayTrends);

      dailyStats.push({
        date: new Date(dateKey),
        totalUsage,
        uniqueMiddleware,
        topMiddleware
      });
    }

    return dailyStats.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Gets performance metrics for all middleware
   */
  getPerformanceMetrics(): readonly MiddlewarePerformanceMetrics[] {
    return Array.from(this.performanceMetrics.values());
  }

  /**
   * Gets performance metrics for specific middleware
   */
  getMiddlewarePerformanceMetrics(middlewareName: string): MiddlewarePerformanceMetrics | undefined {
    return this.performanceMetrics.get(middlewareName);
  }

  /**
   * Gets top performing middleware by execution time
   */
  getTopPerformingMiddleware(limit: number = 10): readonly MiddlewarePerformanceMetrics[] {
    return [...this.getPerformanceMetrics()]
      .sort((a, b) => a.averageExecutionTime - b.averageExecutionTime)
      .slice(0, limit);
  }

  /**
   * Gets middleware with highest error rates
   */
  getHighestErrorRateMiddleware(limit: number = 10): readonly MiddlewarePerformanceMetrics[] {
    return [...this.getPerformanceMetrics()]
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, limit);
  }

  /**
   * Clears all statistics data
   */
  clearStats(): void {
    const trendCount = this.usageTrends.length;
    const metricsCount = this.performanceMetrics.size;
    
    this.usageTrends.length = 0;
    this.performanceMetrics.clear();
    
    this.logger.info('Statistics data cleared', {
      clearedTrends: trendCount,
      clearedMetrics: metricsCount
    });
  }

  /**
   * Calculates category counts
   */
  private calculateCategoryCounts(
    registrations: readonly MiddlewareRegistration[]
  ): Record<MiddlewareCategory, number> {
    const counts = {} as Record<MiddlewareCategory, number>;
    
    // Initialize all categories to 0
    for (const category of Object.values(MiddlewareCategory)) {
      counts[category] = 0;
    }
    
    // Count registrations by category
    for (const registration of registrations) {
      counts[registration.category]++;
    }
    
    return counts;
  }

  /**
   * Calculates context counts
   */
  private calculateContextCounts(
    registrations: readonly MiddlewareRegistration[]
  ): Record<ApplicationContext, number> {
    const counts = {} as Record<ApplicationContext, number>;
    
    // Initialize all contexts to 0
    for (const context of Object.values(ApplicationContext)) {
      counts[context] = 0;
    }
    
    // Count registrations by context
    for (const registration of registrations) {
      for (const context of registration.contexts) {
        counts[context]++;
      }
    }
    
    return counts;
  }

  /**
   * Calculates usage rankings
   */
  private calculateUsageRankings(
    registrations: readonly MiddlewareRegistration[]
  ): { mostUsed: readonly string[]; leastUsed: readonly string[] } {
    const sortedByUsage = [...registrations].sort((a, b) => b.usageCount - a.usageCount);
    
    const mostUsed = sortedByUsage.slice(0, 5).map(r => r.name);
    const leastUsed = sortedByUsage.slice(-5).reverse().map(r => r.name);
    
    return { mostUsed, leastUsed };
  }

  /**
   * Calculates registration trends
   */
  private calculateRegistrationTrends(
    registrations: readonly MiddlewareRegistration[]
  ): readonly RegistrationTrend[] {
    // Group by date and category
    const trendMap = new Map<string, Map<MiddlewareCategory, number>>();
    
    for (const registration of registrations) {
      const dateKey = registration.registeredAt.toISOString().split('T')[0];
      
      if (!trendMap.has(dateKey)) {
        trendMap.set(dateKey, new Map());
      }
      
      const dayMap = trendMap.get(dateKey)!;
      const currentCount = dayMap.get(registration.category) ?? 0;
      dayMap.set(registration.category, currentCount + 1);
    }
    
    const trends: RegistrationTrend[] = [];
    
    for (const [dateKey, categoryMap] of trendMap) {
      for (const [category, count] of categoryMap) {
        trends.push({
          date: new Date(dateKey),
          registrations: count,
          category
        });
      }
    }
    
    return trends.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Groups registrations by category
   */
  private groupByCategory(
    registrations: readonly MiddlewareRegistration[]
  ): Map<MiddlewareCategory, MiddlewareRegistration[]> {
    const groups = new Map<MiddlewareCategory, MiddlewareRegistration[]>();
    
    for (const registration of registrations) {
      if (!groups.has(registration.category)) {
        groups.set(registration.category, []);
      }
      groups.get(registration.category)!.push(registration);
    }
    
    return groups;
  }

  /**
   * Groups registrations by context
   */
  private groupByContext(
    registrations: readonly MiddlewareRegistration[]
  ): Map<ApplicationContext, MiddlewareRegistration[]> {
    const groups = new Map<ApplicationContext, MiddlewareRegistration[]>();
    
    for (const registration of registrations) {
      for (const context of registration.contexts) {
        if (!groups.has(context)) {
          groups.set(context, []);
        }
        groups.get(context)!.push(registration);
      }
    }
    
    return groups;
  }

  /**
   * Gets top middleware for a specific day
   */
  private getTopMiddlewareForDay(dayTrends: readonly UsageTrend[]): readonly string[] {
    const usageMap = new Map<string, number>();
    
    for (const trend of dayTrends) {
      const current = usageMap.get(trend.middlewareName) ?? 0;
      usageMap.set(trend.middlewareName, current + trend.usageCount);
    }
    
    return Array.from(usageMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
  }

  /**
   * Updates performance metrics for middleware
   */
  private updatePerformanceMetrics(
    middlewareName: string,
    executionTime: number,
    timestamp: Date
  ): void {
    const existing = this.performanceMetrics.get(middlewareName);
    
    if (existing) {
      // Update existing metrics
      const totalTime = existing.averageExecutionTime * existing.totalExecutions + executionTime;
      const newTotalExecutions = existing.totalExecutions + 1;
      
      const updated: MiddlewarePerformanceMetrics = {
        middlewareName,
        averageExecutionTime: totalTime / newTotalExecutions,
        totalExecutions: newTotalExecutions,
        errorRate: existing.errorRate, // This would be updated on errors
        lastExecuted: timestamp,
        peakUsageTime: existing.peakUsageTime
      };
      
      this.performanceMetrics.set(middlewareName, updated);
    } else {
      // Create new metrics
      const newMetrics: MiddlewarePerformanceMetrics = {
        middlewareName,
        averageExecutionTime: executionTime,
        totalExecutions: 1,
        errorRate: 0,
        lastExecuted: timestamp,
        peakUsageTime: timestamp
      };
      
      this.performanceMetrics.set(middlewareName, newMetrics);
    }
  }
}

/**
 * Daily usage statistics
 */
export interface DailyUsageStats {
  readonly date: Date;
  readonly totalUsage: number;
  readonly uniqueMiddleware: number;
  readonly topMiddleware: readonly string[];
}