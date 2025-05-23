import { Types } from 'mongoose';
import { CacheFacade } from '@/core/cache/facade/CacheFacade';
import { CacheDomain } from '@/types/cache';
import { IPushToken } from '@/types/repositories/tokens';

/**
 * Cache helper for push token operations
 */
export class PushTokenCacheHelper {
  private static readonly CACHE_TTL = 600; // 10 minutes
  private static readonly USER_TOKENS_TTL = 300; // 5 minutes
  private static readonly TOKEN_CACHE_TTL = 900; // 15 minutes
  private static readonly STATS_CACHE_TTL = 1800; // 30 minutes

  constructor(private readonly cache?: CacheFacade) {}

  /**
   * Check if caching is enabled
   */
  public get isEnabled(): boolean {
    return this.cache !== undefined;
  }

  /**
   * Generate cache key for user tokens
   */
  public generateUserTokensKey(userId: Types.ObjectId): string {
    return `push_tokens:user:${userId.toString()}`;
  }

  /**
   * Generate cache key for token lookup
   */
  public generateTokenKey(token: string): string {
    return `push_tokens:token:${token}`;
  }

  /**
   * Generate cache key for device tokens
   */
  public generateDeviceKey(deviceId: string): string {
    return `push_tokens:device:${deviceId}`;
  }

  /**
   * Generate cache key for device type tokens
   */
  public generateDeviceTypeKey(deviceType: string): string {
    return `push_tokens:device_type:${deviceType}`;
  }

  /**
   * Generate cache key for active tokens
   */
  public generateActiveTokensKey(userId?: Types.ObjectId): string {
    return `push_tokens:active:${userId?.toString() ?? 'all'}`;
  }

  /**
   * Generate cache key for user stats
   */
  public generateUserStatsKey(userId: Types.ObjectId): string {
    return `push_tokens:stats:user:${userId.toString()}`;
  }

  /**
   * Generate cache key for health metrics
   */
  public generateHealthMetricsKey(): string {
    return 'push_tokens:health_metrics';
  }

  /**
   * Generate custom cache key
   */
  public generateCustomKey(type: string, params: Record<string, string>): string {
    const paramString = Object.entries(params)
      .map(([key, value]) => `${key}:${value}`)
      .join(':');
    return `push_tokens:${type}:${paramString}`;
  }

  /**
   * Get cached user tokens
   */
  public async getUserTokens(userId: Types.ObjectId): Promise<IPushToken[] | undefined> {
    if (!this.isEnabled) return undefined;

    const key = this.generateUserTokensKey(userId);
    return this.cache!.get<IPushToken[]>(key, CacheDomain.PUSH_TOKENS);
  }

  /**
   * Set cached user tokens
   */
  public async setUserTokens(
    userId: Types.ObjectId, 
    tokens: IPushToken[]
  ): Promise<void> {
    if (!this.isEnabled) return;

    const key = this.generateUserTokensKey(userId);
    await this.cache!.set(
      key, 
      tokens, 
      { ttl: PushTokenCacheHelper.USER_TOKENS_TTL }, 
      CacheDomain.PUSH_TOKENS
    );
  }

  /**
   * Get cached token by token string
   */
  public async getToken(token: string): Promise<IPushToken | undefined> {
    if (!this.isEnabled) return undefined;

    const key = this.generateTokenKey(token);
    return this.cache!.get<IPushToken>(key, CacheDomain.PUSH_TOKENS);
  }

  /**
   * Set cached token
   */
  public async setToken(token: string, pushToken: IPushToken): Promise<void> {
    if (!this.isEnabled) return;

    const key = this.generateTokenKey(token);
    await this.cache!.set(
      key, 
      pushToken, 
      { ttl: PushTokenCacheHelper.TOKEN_CACHE_TTL }, 
      CacheDomain.PUSH_TOKENS
    );
  }

  /**
   * Get cached device tokens
   */
  public async getDeviceTokens(deviceId: string): Promise<IPushToken[] | undefined> {
    if (!this.isEnabled) return undefined;

    const key = this.generateDeviceKey(deviceId);
    return this.cache!.get<IPushToken[]>(key, CacheDomain.PUSH_TOKENS);
  }

  /**
   * Set cached device tokens
   */
  public async setDeviceTokens(deviceId: string, tokens: IPushToken[]): Promise<void> {
    if (!this.isEnabled) return;

    const key = this.generateDeviceKey(deviceId);
    await this.cache!.set(
      key, 
      tokens, 
      { ttl: PushTokenCacheHelper.CACHE_TTL }, 
      CacheDomain.PUSH_TOKENS
    );
  }

  /**
   * Get cached device type tokens
   */
  public async getDeviceTypeTokens(deviceType: string): Promise<IPushToken[] | undefined> {
    if (!this.isEnabled) return undefined;

    const key = this.generateDeviceTypeKey(deviceType);
    return this.cache!.get<IPushToken[]>(key, CacheDomain.PUSH_TOKENS);
  }

  /**
   * Set cached device type tokens
   */
  public async setDeviceTypeTokens(deviceType: string, tokens: IPushToken[]): Promise<void> {
    if (!this.isEnabled) return;

    const key = this.generateDeviceTypeKey(deviceType);
    await this.cache!.set(
      key, 
      tokens, 
      { ttl: PushTokenCacheHelper.CACHE_TTL }, 
      CacheDomain.PUSH_TOKENS
    );
  }

  /**
   * Get cached active tokens
   */
  public async getActiveTokens(userId?: Types.ObjectId): Promise<IPushToken[] | undefined> {
    if (!this.isEnabled) return undefined;

    const key = this.generateActiveTokensKey(userId);
    return this.cache!.get<IPushToken[]>(key, CacheDomain.PUSH_TOKENS);
  }

  /**
   * Set cached active tokens
   */
  public async setActiveTokens(
    tokens: IPushToken[], 
    userId?: Types.ObjectId
  ): Promise<void> {
    if (!this.isEnabled) return;

    const key = this.generateActiveTokensKey(userId);
    await this.cache!.set(
      key, 
      tokens, 
      { ttl: PushTokenCacheHelper.CACHE_TTL }, 
      CacheDomain.PUSH_TOKENS
    );
  }

  /**
   * Get cached user stats
   */
  public async getUserStats(userId: Types.ObjectId): Promise<any> {
    if (!this.isEnabled) return undefined;

    const key = this.generateUserStatsKey(userId);
    return this.cache!.get<any>(key, CacheDomain.PUSH_TOKENS);
  }

  /**
   * Set cached user stats
   */
  public async setUserStats(userId: Types.ObjectId, stats: any): Promise<void> {
    if (!this.isEnabled) return;

    const key = this.generateUserStatsKey(userId);
    await this.cache!.set(
      key, 
      stats, 
      { ttl: PushTokenCacheHelper.STATS_CACHE_TTL }, 
      CacheDomain.PUSH_TOKENS
    );
  }

  /**
   * Get cached health metrics
   */
  public async getHealthMetrics(): Promise<any> {
    if (!this.isEnabled) return undefined;

    const key = this.generateHealthMetricsKey();
    return this.cache!.get<any>(key, CacheDomain.PUSH_TOKENS);
  }

  /**
   * Set cached health metrics
   */
  public async setHealthMetrics(metrics: any): Promise<void> {
    if (!this.isEnabled) return;

    const key = this.generateHealthMetricsKey();
    await this.cache!.set(
      key, 
      metrics, 
      { ttl: PushTokenCacheHelper.STATS_CACHE_TTL }, 
      CacheDomain.PUSH_TOKENS
    );
  }

  /**
   * Get custom cached data
   */
  public async getCustom<T>(key: string): Promise<T | undefined> {
    if (!this.isEnabled) return undefined;

    return this.cache!.get<T>(key, CacheDomain.PUSH_TOKENS);
  }

  /**
   * Set custom cached data
   */
  public async setCustom<T>(key: string, data: T, ttl?: number): Promise<void> {
    if (!this.isEnabled) return;

    await this.cache!.set(
      key, 
      data, 
      { ttl: ttl ?? PushTokenCacheHelper.CACHE_TTL }, 
      CacheDomain.PUSH_TOKENS
    );
  }

  /**
   * Invalidate user-specific caches
   */
  public async invalidateUserCaches(userId: Types.ObjectId): Promise<void> {
    if (!this.isEnabled) return;

    await this.invalidateByPattern(`*user:${userId.toString()}*`);
  }

  /**
   * Invalidate token cache
   */
  public async invalidateTokenCache(token: string): Promise<void> {
    if (!this.isEnabled) return;

    const key = this.generateTokenKey(token);
    await this.cache!.remove(key, CacheDomain.PUSH_TOKENS);
  }

  /**
   * Invalidate active token caches
   */
  public async invalidateActiveTokenCaches(): Promise<void> {
    if (!this.isEnabled) return;

    await this.invalidateByPattern('*active:*');
  }

  /**
   * Invalidate all caches
   */
  public async invalidateAll(): Promise<void> {
    if (!this.isEnabled) return;

    await this.cache!.clear(CacheDomain.PUSH_TOKENS);
  }

  /**
   * Invalidate caches by pattern
   */
  public async invalidateByPattern(pattern: string): Promise<void> {
    if (!this.isEnabled) return;

    const keys = await this.cache!.keys(pattern, CacheDomain.PUSH_TOKENS);
    
    for (const key of keys) {
      await this.cache!.remove(key, CacheDomain.PUSH_TOKENS);
    }
  }

  /**
   * Invalidate cache after update
   */
  public async invalidateAfterUpdate(
    id: Types.ObjectId, 
    token: IPushToken
  ): Promise<void> {
    if (!this.isEnabled) return;

    // Invalidate multiple cache patterns
    await Promise.all([
      this.invalidateUserCaches(token.user),
      this.invalidateTokenCache(token.token),
      this.invalidateActiveTokenCaches(),
      this.cache!.remove(`push_tokens:device:${token.deviceId}`, CacheDomain.PUSH_TOKENS),
      this.cache!.remove(`push_tokens:device_type:${token.deviceType}`, CacheDomain.PUSH_TOKENS)
    ]);
  }
}