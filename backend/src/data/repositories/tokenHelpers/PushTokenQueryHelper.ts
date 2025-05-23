import { Types } from 'mongoose';
import { AggregationPipeline } from '@/types/repositories';

/**
 * Query helper for push token complex queries and aggregations
 */
export class PushTokenQueryHelper {
  /**
   * Build query for active tokens
   */
  public static buildActiveTokensQuery(userId?: Types.ObjectId): any {
    const query: any = {
      isActive: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      ]
    };

    if (userId) {
      query.user = userId;
    }

    return query;
  }

  /**
   * Build query for expired tokens
   */
  public static buildExpiredTokensQuery(): any {
    return {
      expiresAt: { $lt: new Date() }
    };
  }

  /**
   * Build query for failed tokens
   */
  public static buildFailedTokensQuery(maxFailures: number = 5): any {
    return {
      failureCount: { $gte: maxFailures }
    };
  }

  /**
   * Build query for inactive tokens cleanup
   */
  public static buildInactiveTokensQuery(daysInactive: number = 30): any {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

    return {
      $or: [
        { isActive: false },
        { lastUsed: { $lt: cutoffDate } },
        { failureCount: { $gte: 10 } }
      ]
    };
  }

  /**
   * Build query for tokens needing refresh
   */
  public static buildTokensNeedingRefreshQuery(daysBefore: number = 7): any {
    const refreshDate = new Date();
    refreshDate.setDate(refreshDate.getDate() + daysBefore);

    return {
      isActive: true,
      expiresAt: { 
        $lte: refreshDate,
        $gt: new Date()
      }
    };
  }

  /**
   * Build query for notification delivery
   */
  public static buildNotificationTokensQuery(
    userIds: (Types.ObjectId)[],
    deviceTypes?: string[]
  ): any {
    const query: any = {
      user: { $in: userIds },
      isActive: true,
      failureCount: { $lt: 5 },
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      ]
    };

    if (deviceTypes && deviceTypes.length > 0) {
      query.deviceType = { $in: deviceTypes };
    }

    return query;
  }

  /**
   * Build query for archiving old tokens
   */
  public static buildArchiveOldTokensQuery(daysOld: number = 90): any {
    const archiveDate = new Date();
    archiveDate.setDate(archiveDate.getDate() - daysOld);

    return {
      $or: [
        { lastUsed: { $lt: archiveDate } },
        { createdAt: { $lt: archiveDate } }
      ],
      isActive: false
    };
  }

  /**
   * Build aggregation pipeline for user token statistics
   */
  public static buildUserStatsAggregation(userId: Types.ObjectId): AggregationPipeline {
    return [
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { 
            $sum: { 
              $cond: { 
                if: { $eq: ['$isActive', true] }, 
                then: 1, 
                else: 0 
              } 
            } 
          },
          platforms: { 
            $push: { 
              platform: '$platform',
              isActive: '$isActive'
            } 
          }
        }
      },
      {
        $addFields: {
          byPlatform: {
            $arrayToObject: {
              $map: {
                input: {
                  $setUnion: ['$platforms.platform']
                },
                as: 'platform',
                in: {
                  k: '$$platform',
                  v: {
                    $size: {
                      $filter: {
                        input: '$platforms',
                        cond: { $eq: ['$$this.platform', '$$platform'] }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    ];
  }

  /**
   * Build aggregation pipeline for health metrics
   */
  public static buildHealthMetricsAggregation(): AggregationPipeline {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return [
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalTokens: { $sum: 1 },
                activeTokens: { 
                  $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } 
                },
                expiredTokens: { 
                  $sum: { 
                    $cond: [
                      { $and: [
                        { $lt: ['$expiresAt', now] },
                        { $ne: ['$expiresAt', null] }
                      ]}, 
                      1, 
                      0
                    ] 
                  } 
                },
                failedTokens: { 
                  $sum: { $cond: [{ $gte: ['$failureCount', 5] }, 1, 0] } 
                }
              }
            }
          ],
          byPlatform: [
            {
              $group: {
                _id: '$platform',
                total: { $sum: 1 },
                active: { 
                  $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } 
                }
              }
            }
          ],
          recentActivity: [
            {
              $match: {
                lastUsed: { $gte: thirtyDaysAgo }
              }
            },
            {
              $group: {
                _id: null,
                last24h: { 
                  $sum: { 
                    $cond: [{ $gte: ['$lastUsed', oneDayAgo] }, 1, 0] 
                  } 
                },
                last7d: { 
                  $sum: { 
                    $cond: [{ $gte: ['$lastUsed', sevenDaysAgo] }, 1, 0] 
                  } 
                },
                last30d: { $sum: 1 }
              }
            }
          ]
        }
      }
    ];
  }

  /**
   * Build aggregation pipeline for duplicate token detection
   */
  public static buildDuplicateTokensAggregation(): AggregationPipeline {
    return [
      {
        $match: {
          deviceId: { $exists: true, $ne: null },
          isActive: true
        }
      },
      {
        $group: {
          _id: {
            user: '$user',
            deviceId: '$deviceId'
          },
          tokens: { $push: '$$ROOT' },
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ];
  }

  /**
   * Build sort options for different queries
   */
  public static buildSortOptions(sortBy: 'lastUsed' | 'createdAt' | 'expiresAt' = 'lastUsed'): any {
    const sortOptions: Record<string, any> = {
      lastUsed: [{ field: 'lastUsed', direction: 'desc' }],
      createdAt: [{ field: 'createdAt', direction: 'desc' }],
      expiresAt: [{ field: 'expiresAt', direction: 'asc' }]
    };

    return sortOptions[sortBy] ?? sortOptions.lastUsed;
  }

  /**
   * Build aggregation for token analytics by time period
   */
  public static buildTokenAnalyticsAggregation(
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): AggregationPipeline {
    const dateFormat = {
      day: '%Y-%m-%d',
      week: '%Y-%U',
      month: '%Y-%m'
    }[groupBy];

    return [
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: dateFormat, date: '$createdAt' } },
            platform: '$platform'
          },
          count: { $sum: 1 },
          activeCount: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          totalTokens: { $sum: '$count' },
          totalActive: { $sum: '$activeCount' },
          byPlatform: {
            $push: {
              platform: '$_id.platform',
              count: '$count',
              active: '$activeCount'
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ];
  }

  /**
   * Build aggregation for token failure analysis
   */
  public static buildFailureAnalysisAggregation(): AggregationPipeline {
    return [
      {
        $match: {
          $or: [
            { failureCount: { $gt: 0 } },
            { lastFailure: { $exists: true } }
          ]
        }
      },
      {
        $group: {
          _id: {
            platform: '$platform',
            deviceType: '$deviceType'
          },
          totalTokens: { $sum: 1 },
          avgFailureCount: { $avg: '$failureCount' },
          maxFailureCount: { $max: '$failureCount' },
          tokensWithFailures: { 
            $sum: { $cond: [{ $gt: ['$failureCount', 0] }, 1, 0] } 
          },
          recentFailures: {
            $sum: {
              $cond: [
                { 
                  $gte: [
                    '$lastFailure', 
                    { $subtract: [new Date(), 24 * 60 * 60 * 1000] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $addFields: {
          failureRate: {
            $divide: ['$tokensWithFailures', '$totalTokens']
          }
        }
      },
      {
        $sort: { failureRate: -1 }
      }
    ];
  }

  /**
   * Build query for tokens by platform and active status
   */
  public static buildPlatformStatsQuery(): AggregationPipeline {
    return [
      {
        $group: {
          _id: {
            platform: '$platform',
            isActive: '$isActive'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.platform',
          total: { $sum: '$count' },
          active: {
            $sum: {
              $cond: [{ $eq: ['$_id.isActive', true] }, '$count', 0]
            }
          },
          inactive: {
            $sum: {
              $cond: [{ $eq: ['$_id.isActive', false] }, '$count', 0]
            }
          }
        }
      },
      {
        $addFields: {
          activePercentage: {
            $multiply: [
              { $divide: ['$active', '$total'] },
              100
            ]
          }
        }
      },
      {
        $sort: { total: -1 }
      }
    ];
  }
}