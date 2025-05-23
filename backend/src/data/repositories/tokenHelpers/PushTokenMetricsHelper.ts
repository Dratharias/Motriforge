import { Types } from 'mongoose';
import { LoggerFacade } from '@/core/logging';
import { IPushToken } from '@/types/repositories/tokens';
import { PushTokenQueryHelper } from './PushTokenQueryHelper';
import { PushTokenCacheHelper } from './PushTokenCacheHelper';
import { CrudOperations } from '../operations/CrudOperations';
import { AggregationPipeline } from '@/types/repositories';

/**
 * Metrics and analytics helper for push tokens
 */
export class PushTokenMetricsHelper {
  constructor(
    private readonly crudOps: CrudOperations<IPushToken>,
    private readonly logger: LoggerFacade,
    private readonly cacheHelper: PushTokenCacheHelper
  ) {}

  /**
   * Get token statistics by user
   */
  public async getTokenStatsByUser(userId: Types.ObjectId): Promise<{
    total: number;
    active: number;
    byPlatform: Record<string, number>;
  }> {
    // Check cache first
    const cached = await this.cacheHelper.getUserStats(userId);
    if (cached) {
      return cached;
    }

    try {
      this.logger.debug('Getting token statistics by user', { 
        userId: userId.toString() 
      });

      const pipeline = PushTokenQueryHelper.buildUserStatsAggregation(userId);
      const results = await this.crudOps.aggregate<{
        total: number;
        active: number;
        byPlatform: Record<string, number>;
      }>(pipeline);

      const stats = results[0] ?? {
        total: 0,
        active: 0,
        byPlatform: {}
      };

      // Cache the results
      await this.cacheHelper.setUserStats(userId, stats);

      return stats;
    } catch (error) {
      this.logger.error('Error getting token statistics', error as Error, { 
        userId: userId.toString() 
      });
      throw error;
    }
  }

  /**
   * Get comprehensive health metrics
   */
  public async getHealthMetrics(): Promise<{
    totalTokens: number;
    activeTokens: number;
    expiredTokens: number;
    failedTokens: number;
    byPlatform: Record<string, { total: number; active: number }>;
    recentActivity: {
      last24h: number;
      last7d: number;
      last30d: number;
    };
  }> {
    // Check cache first
    const cached = await this.cacheHelper.getHealthMetrics();
    if (cached) {
      return cached;
    }

    try {
      this.logger.debug('Getting push token health metrics');

      const pipeline = PushTokenQueryHelper.buildHealthMetricsAggregation();
      const [result] = await this.crudOps.aggregate<any>(pipeline);

      const metrics = {
        totalTokens: result.overview[0]?.totalTokens ?? 0,
        activeTokens: result.overview[0]?.activeTokens ?? 0,
        expiredTokens: result.overview[0]?.expiredTokens ?? 0,
        failedTokens: result.overview[0]?.failedTokens ?? 0,
        byPlatform: result.byPlatform.reduce((acc: any, item: any) => {
          acc[item._id ?? 'unknown'] = {
            total: item.total,
            active: item.active
          };
          return acc;
        }, {}),
        recentActivity: result.recentActivity[0] ?? {
          last24h: 0,
          last7d: 0,
          last30d: 0
        }
      };

      // Cache the results
      await this.cacheHelper.setHealthMetrics(metrics);

      return metrics;
    } catch (error) {
      this.logger.error('Error getting health metrics', error as Error);
      throw error;
    }
  }

  /**
   * Get platform distribution statistics
   */
  public async getPlatformStats(): Promise<Array<{
    platform: string;
    total: number;
    active: number;
    inactive: number;
    activePercentage: number;
  }>> {
    const cacheKey = this.cacheHelper.generateCustomKey('platform_stats', {});
    
    // Check cache first
    const cached = await this.cacheHelper.getCustom<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      this.logger.debug('Getting platform statistics');

      const pipeline = PushTokenQueryHelper.buildPlatformStatsQuery();
      const results = await this.crudOps.aggregate<any>(pipeline);

      const stats = results.map((result: { _id: any; total: any; active: any; inactive: any; activePercentage: number; }) => ({
        platform: result._id ?? 'unknown',
        total: result.total,
        active: result.active,
        inactive: result.inactive,
        activePercentage: Math.round(result.activePercentage * 100) / 100
      }));

      // Cache the results
      await this.cacheHelper.setCustom(cacheKey, stats, 1800); // 30 minutes

      return stats;
    } catch (error) {
      this.logger.error('Error getting platform statistics', error as Error);
      throw error;
    }
  }

  /**
   * Get failure analysis metrics
   */
  public async getFailureAnalysis(): Promise<Array<{
    platform: string;
    deviceType: string;
    totalTokens: number;
    avgFailureCount: number;
    maxFailureCount: number;
    tokensWithFailures: number;
    recentFailures: number;
    failureRate: number;
  }>> {
    const cacheKey = this.cacheHelper.generateCustomKey('failure_analysis', {});
    
    // Check cache first
    const cached = await this.cacheHelper.getCustom<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      this.logger.debug('Getting failure analysis metrics');

      const pipeline = PushTokenQueryHelper.buildFailureAnalysisAggregation();
      const results = await this.crudOps.aggregate<any>(pipeline);

      const analysis = results.map((result: { _id: { platform: any; deviceType: any; }; totalTokens: any; avgFailureCount: number; maxFailureCount: any; tokensWithFailures: any; recentFailures: any; failureRate: number; }) => ({
        platform: result._id.platform ?? 'unknown',
        deviceType: result._id.deviceType ?? 'unknown',
        totalTokens: result.totalTokens,
        avgFailureCount: Math.round(result.avgFailureCount * 100) / 100,
        maxFailureCount: result.maxFailureCount,
        tokensWithFailures: result.tokensWithFailures,
        recentFailures: result.recentFailures,
        failureRate: Math.round(result.failureRate * 10000) / 100 // Percentage with 2 decimals
      }));

      // Cache the results
      await this.cacheHelper.setCustom(cacheKey, analysis, 1800); // 30 minutes

      return analysis;
    } catch (error) {
      this.logger.error('Error getting failure analysis', error as Error);
      throw error;
    }
  }

  /**
   * Get token analytics by time period
   */
  public async getTokenAnalytics(
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<Array<{
    date: string;
    totalTokens: number;
    totalActive: number;
    byPlatform: Array<{
      platform: string;
      count: number;
      active: number;
    }>;
  }>> {
    const cacheKey = this.cacheHelper.generateCustomKey('analytics', {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
      groupBy
    });

    // Check cache first
    const cached = await this.cacheHelper.getCustom<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      this.logger.debug('Getting token analytics', { startDate, endDate, groupBy });

      const pipeline = PushTokenQueryHelper.buildTokenAnalyticsAggregation(
        startDate, 
        endDate, 
        groupBy
      );
      const results = await this.crudOps.aggregate<any>(pipeline);

      const analytics = results.map((result: { _id: any; totalTokens: any; totalActive: any; byPlatform: any[]; }) => ({
        date: result._id,
        totalTokens: result.totalTokens,
        totalActive: result.totalActive,
        byPlatform: result.byPlatform.map((platform: any) => ({
          platform: platform.platform ?? 'unknown',
          count: platform.count,
          active: platform.active
        }))
      }));

      // Cache the results for shorter time if it's recent data
      const isRecent = endDate.getTime() > Date.now() - 24 * 60 * 60 * 1000;
      const ttl = isRecent ? 300 : 1800; // 5 minutes for recent, 30 minutes for older

      await this.cacheHelper.setCustom(cacheKey, analytics, ttl);

      return analytics;
    } catch (error) {
      this.logger.error('Error getting token analytics', error as Error, { 
        startDate, 
        endDate, 
        groupBy 
      });
      throw error;
    }
  }

  /**
   * Get token lifecycle metrics
   */
  public async getLifecycleMetrics(): Promise<{
    averageLifespan: number; // in days
    tokensByAge: Array<{
      ageRange: string;
      count: number;
    }>;
    expirationDistribution: Array<{
      timeToExpiry: string;
      count: number;
    }>;
  }> {
    const cacheKey = this.cacheHelper.generateCustomKey('lifecycle_metrics', {});
    
    // Check cache first
    const cached = await this.cacheHelper.getCustom<any>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      this.logger.debug('Getting token lifecycle metrics');

      const now = new Date();
      const pipeline = [
        {
          $match: {
            createdAt: { $exists: true }
          }
        },
        {
          $addFields: {
            ageInDays: {
              $divide: [
                { $subtract: [now, '$createdAt'] },
                1000 * 60 * 60 * 24
              ]
            },
            daysToExpiry: {
              $cond: {
                if: { $ne: ['$expiresAt', null] },
                then: {
                  $divide: [
                    { $subtract: ['$expiresAt', now] },
                    1000 * 60 * 60 * 24
                  ]
                },
                else: null
              }
            }
          }
        },
        {
          $facet: {
            averageAge: [
              {
                $group: {
                  _id: null,
                  avgLifespan: { $avg: '$ageInDays' }
                }
              }
            ],
            ageDistribution: [
              {
                $bucket: {
                  groupBy: '$ageInDays',
                  boundaries: [0, 7, 30, 90, 180, 365, Infinity],
                  default: 'Unknown',
                  output: {
                    count: { $sum: 1 }
                  }
                }
              }
            ],
            expirationDistribution: [
              {
                $match: {
                  daysToExpiry: { $ne: null }
                }
              },
              {
                $bucket: {
                  groupBy: '$daysToExpiry',
                  boundaries: [-Infinity, 0, 7, 30, 90, 180, 365, Infinity],
                  default: 'Unknown',
                  output: {
                    count: { $sum: 1 }
                  }
                }
              }
            ]
          }
        }
      ];

      const [result] = await this.crudOps.aggregate<any>(pipeline);

      const ageRangeLabels: Record<number, string> = {
        0: '0-7 days',
        7: '1-4 weeks',
        30: '1-3 months',
        90: '3-6 months',
        180: '6-12 months',
        365: '1+ years'
      };

      const expiryRangeLabels: Record<number, string> = {
        [-Infinity]: 'Expired',
        0: 'Expiring soon (0-7 days)',
        7: '1-4 weeks',
        30: '1-3 months',
        90: '3-6 months',
        180: '6-12 months',
        365: '1+ years'
      };

      const metrics = {
        averageLifespan: Math.round((result.averageAge[0]?.avgLifespan ?? 0) * 100) / 100,
        tokensByAge: result.ageDistribution.map((bucket: any) => ({
          ageRange: ageRangeLabels[bucket._id] ?? 'Unknown',
          count: bucket.count
        })),
        expirationDistribution: result.expirationDistribution.map((bucket: any) => ({
          timeToExpiry: expiryRangeLabels[bucket._id] ?? 'Unknown',
          count: bucket.count
        }))
      };

      // Cache the results
      await this.cacheHelper.setCustom(cacheKey, metrics, 3600); // 1 hour

      return metrics;
    } catch (error) {
      this.logger.error('Error getting lifecycle metrics', error as Error);
      throw error;
    }
  }

  /**
   * Get notification delivery insights
   */
  public async getNotificationInsights(): Promise<{
    eligibleTokens: number;
    tokensByPreferences: Record<string, number>;
    platformDistribution: Record<string, number>;
    averageFailureRate: number;
  }> {
    const cacheKey = this.cacheHelper.generateCustomKey('notification_insights', {});
    
    // Check cache first
    const cached = await this.cacheHelper.getCustom<any>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      this.logger.debug('Getting notification delivery insights');

      const pipeline = [
        {
          $facet: {
            eligible: [
              {
                $match: {
                  isActive: true,
                  failureCount: { $lt: 5 },
                  $or: [
                    { expiresAt: { $exists: false } },
                    { expiresAt: { $gt: new Date() } }
                  ]
                }
              },
              {
                $group: {
                  _id: null,
                  count: { $sum: 1 }
                }
              }
            ],
            preferences: [
              {
                $match: {
                  isActive: true,
                  notificationPreferences: { $exists: true }
                }
              },
              {
                $group: {
                  _id: null,
                  workoutReminders: {
                    $sum: {
                      $cond: ['$notificationPreferences.workoutReminders', 1, 0]
                    }
                  },
                  achievements: {
                    $sum: {
                      $cond: ['$notificationPreferences.achievements', 1, 0]
                    }
                  },
                  messages: {
                    $sum: {
                      $cond: ['$notificationPreferences.messages', 1, 0]
                    }
                  },
                  systemNotifications: {
                    $sum: {
                      $cond: ['$notificationPreferences.systemNotifications', 1, 0]
                    }
                  }
                }
              }
            ],
            platforms: [
              {
                $match: { isActive: true }
              },
              {
                $group: {
                  _id: '$platform',
                  count: { $sum: 1 }
                }
              }
            ],
            failures: [
              {
                $group: {
                  _id: null,
                  avgFailureRate: { $avg: '$failureCount' }
                }
              }
            ]
          }
        }
      ];

      const [result] = await this.crudOps.aggregate<any>(pipeline);

      const insights = {
        eligibleTokens: result.eligible[0]?.count ?? 0,
        tokensByPreferences: result.preferences[0] ?? {
          workoutReminders: 0,
          achievements: 0,
          messages: 0,
          systemNotifications: 0
        },
        platformDistribution: result.platforms.reduce((acc: Record<string, number>, platform: any) => {
          acc[platform._id ?? 'unknown'] = platform.count;
          return acc;
        }, {}),
        averageFailureRate: Math.round((result.failures[0]?.avgFailureRate ?? 0) * 100) / 100
      };

      // Cache the results
      await this.cacheHelper.setCustom(cacheKey, insights, 1800); // 30 minutes

      return insights;
    } catch (error) {
      this.logger.error('Error getting notification insights', error as Error);
      throw error;
    }
  }

  /**
   * Get summary dashboard metrics
   */
  public async getDashboardMetrics(): Promise<{
    overview: {
      totalTokens: number;
      activeTokens: number;
      inactiveTokens: number;
      failedTokens: number;
    };
    trends: {
      newTokensToday: number;
      newTokensWeek: number;
      deactivatedToday: number;
      deactivatedWeek: number;
    };
    topPlatforms: Array<{
      platform: string;
      count: number;
      percentage: number;
    }>;
    alerts: Array<{
      type: 'warning' | 'error';
      message: string;
      count?: number;
    }>;
  }> {
    const cacheKey = this.cacheHelper.generateCustomKey('dashboard_metrics', {});
    
    // Check cache first (short TTL for dashboard)
    const cached = await this.cacheHelper.getCustom<any>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      this.logger.debug('Getting dashboard metrics');

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

      const pipeline: AggregationPipeline = [
        {
          $facet: {
            overview: [
              {
                $group: {
                  _id: null,
                  totalTokens: { $sum: 1 },
                  activeTokens: { $sum: { $cond: ['$isActive', 1, 0] } },
                  inactiveTokens: { $sum: { $cond: ['$isActive', 0, 1] } },
                  failedTokens: { $sum: { $cond: [{ $gte: ['$failureCount', 5] }, 1, 0] } }
                }
              }
            ],
            trends: [
              {
                $group: {
                  _id: null,
                  newTokensToday: {
                    $sum: { $cond: [{ $gte: ['$createdAt', todayStart] }, 1, 0] }
                  },
                  newTokensWeek: {
                    $sum: { $cond: [{ $gte: ['$createdAt', weekStart] }, 1, 0] }
                  },
                  deactivatedToday: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $eq: ['$isActive', false] },
                            { $gte: ['$updatedAt', todayStart] }
                          ]
                        },
                        1,
                        0
                      ]
                    }
                  },
                  deactivatedWeek: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $eq: ['$isActive', false] },
                            { $gte: ['$updatedAt', weekStart] }
                          ]
                        },
                        1,
                        0
                      ]
                    }
                  }
                }
              }
            ],
            platforms: [
              {
                $match: { isActive: true }
              },
              {
                $group: {
                  _id: '$platform',
                  count: { $sum: 1 }
                }
              },
              {
                $sort: { count: -1 }
              },
              {
                $limit: 5
              }
            ]
          }
        }
      ];

      const [result] = await this.crudOps.aggregate<any>(pipeline);

      const overview = result.overview[0] ?? {
        totalTokens: 0,
        activeTokens: 0,
        inactiveTokens: 0,
        failedTokens: 0
      };

      const trends = result.trends[0] ?? {
        newTokensToday: 0,
        newTokensWeek: 0,
        deactivatedToday: 0,
        deactivatedWeek: 0
      };

      const totalActive = overview.activeTokens;
      const topPlatforms = result.platforms.map((platform: any) => ({
        platform: platform._id ?? 'unknown',
        count: platform.count,
        percentage: totalActive > 0 ? Math.round((platform.count / totalActive) * 10000) / 100 : 0
      }));

      // Generate alerts based on metrics
      const alerts: Array<{ type: 'warning' | 'error'; message: string; count?: number }> = [];

      if (overview.failedTokens > 0) {
        alerts.push({
          type: 'warning',
          message: 'Tokens with high failure rates detected',
          count: overview.failedTokens
        });
      }

      if (overview.activeTokens === 0 && overview.totalTokens > 0) {
        alerts.push({
          type: 'error',
          message: 'No active push tokens available'
        });
      }

      const inactivePercentage = overview.totalTokens > 0 
        ? (overview.inactiveTokens / overview.totalTokens) * 100 
        : 0;

      if (inactivePercentage > 50) {
        alerts.push({
          type: 'warning',
          message: 'High percentage of inactive tokens',
          count: Math.round(inactivePercentage)
        });
      }

      const metrics = {
        overview,
        trends,
        topPlatforms,
        alerts
      };

      // Cache for short time (5 minutes for dashboard)
      await this.cacheHelper.setCustom(cacheKey, metrics, 300);

      return metrics;
    } catch (error) {
      this.logger.error('Error getting dashboard metrics', error as Error);
      throw error;
    }
  }
}