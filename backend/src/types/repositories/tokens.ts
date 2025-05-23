import { Types } from "mongoose";
import { IDeviceToken } from "../models";

/**
 * Extended device token interface for repository operations
 */
export interface IPushToken extends IDeviceToken {
  readonly platform: 'ios' | 'android' | 'web' | 'desktop';
  readonly appVersion?: string;
  readonly osVersion?: string;
  readonly locale?: string;
  readonly timezone?: string;
  readonly notificationPreferences?: {
    readonly workoutReminders: boolean;
    readonly achievements: boolean;
    readonly messages: boolean;
    readonly systemNotifications: boolean;
  };
  readonly metadata?: Record<string, any>;
  readonly logger?: any;
  readonly failureCount: number;
  readonly lastFailure?: Date;
  readonly lastSuccess?: Date;
  expiresAt?: Date;
}

/**
 * Push token repository interface
 */
export interface IPushTokenRepository {
  // Basic CRUD operations
  findByUser(userId: Types.ObjectId): Promise<IPushToken[]>;
  findByToken(token: string): Promise<IPushToken | null>;
  findByDeviceId(deviceId: string): Promise<IPushToken[]>;
  findByDeviceType(deviceType: string): Promise<IPushToken[]>;
  findActivePushTokens(userId?: Types.ObjectId): Promise<IPushToken[]>;
  
  // Status management
  updateLastUsed(id: Types.ObjectId): Promise<IPushToken | null>;
  markAsInactive(id: Types.ObjectId): Promise<IPushToken | null>;
  incrementFailureCount(id: Types.ObjectId, error?: string): Promise<IPushToken | null>;
  markAsSuccessful(id: Types.ObjectId): Promise<IPushToken | null>;
  
  // Token management
  replaceToken(oldToken: string, newToken: string, userId: Types.ObjectId): Promise<IPushToken | null>;
  updateNotificationPreferences(id: Types.ObjectId, preferences: Partial<IPushToken['notificationPreferences']>): Promise<IPushToken | null>;
  
  // Query operations
  findExpiredTokens(): Promise<IPushToken[]>;
  findFailedTokens(maxFailures?: number): Promise<IPushToken[]>;
  findTokensForNotification(userIds: (Types.ObjectId)[], deviceTypes?: string[]): Promise<IPushToken[]>;
  findTokensNeedingRefresh(daysBefore?: number): Promise<IPushToken[]>;
  findDuplicateTokens(): Promise<Array<{ user: Types.ObjectId; deviceId: string; tokens: IPushToken[]; }>>;
  
  // Statistics and metrics
  getTokenStatsByUser(userId: Types.ObjectId): Promise<{ total: number; active: number; byPlatform: Record<string, number>; }>;
  getHealthMetrics(): Promise<any>;
  
  // Bulk operations
  batchUpdateTokensForUser(userId: Types.ObjectId, updates: Partial<IPushToken>): Promise<number>;
  bulkUpdateActiveStatus(tokenIds: (Types.ObjectId)[], isActive: boolean): Promise<number>;
  
  // Cleanup operations
  cleanupInactiveTokens(daysInactive?: number): Promise<number>;
  cleanupExpiredTokens(): Promise<number>;
  archiveOldTokens(daysOld?: number): Promise<number>;
  deduplicateTokens(): Promise<number>;
  rotateTokensForUser(userId: Types.ObjectId, reason?: string): Promise<IPushToken[]>;
}
