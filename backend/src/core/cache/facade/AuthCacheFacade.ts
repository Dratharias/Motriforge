import { CacheDomain, CacheOptions, TokenInfo } from '@/types/cache';
import { CacheFacade } from './CacheFacade';

/**
 * Facade for auth-related caching
 */
export class AuthCacheFacade {
  private readonly cacheFacade: CacheFacade;
  private readonly domain: string = CacheDomain.AUTH;

  constructor(cacheFacade: CacheFacade) {
    this.cacheFacade = cacheFacade;
  }

  /**
   * Get a user by ID
   */
  public async getUser(userId: string): Promise<any> {
    return this.cacheFacade.get(`user:${userId}`, this.domain);
  }

  /**
   * Set a user in the cache
   */
  public async setUser(userId: string, user: any, options?: CacheOptions): Promise<void> {
    await this.cacheFacade.set(`user:${userId}`, user, options, this.domain);
  }

  /**
   * Get a token by ID
   */
  public async getToken(tokenId: string): Promise<TokenInfo | undefined> {
    return this.cacheFacade.get(`token:${tokenId}`, this.domain);
  }

  /**
   * Set a token in the cache
   */
  public async setToken(tokenId: string, token: TokenInfo, options?: CacheOptions): Promise<void> {
    await this.cacheFacade.set(`token:${tokenId}`, token, options, this.domain);
  }

  /**
   * Invalidate all tokens for a user
   */
  public async invalidateUserTokens(userId: string): Promise<void> {
    // Get all token keys for the user
    const keys = await this.cacheFacade.keys(`token:*:${userId}`, this.domain);
    
    // Delete each token
    for (const key of keys) {
      await this.cacheFacade.remove(key, this.domain);
    }
  }

  /**
   * Validate a token (check if it exists and is not expired)
   */
  public async validateToken(tokenId: string): Promise<boolean> {
    const token = await this.getToken(tokenId);
    
    if (!token) {
      return false;
    }
    
    return token.expiresAt > new Date();
  }

  /**
   * Clear all auth cache
   */
  public async clear(): Promise<void> {
    await this.cacheFacade.clear(this.domain);
  }
}