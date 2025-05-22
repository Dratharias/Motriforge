import { LoggerFacade } from "@/core/logging";
import { AuthAction, EventHandler, SystemEventTypes } from "@/types/events";
import { AuthEvent } from "../models/AuthEvent";
import { Event } from "../models/Event";

/**
 * Handles authentication-related events in the system
 */
export class AuthEventHandler implements EventHandler {
  /* TODO: Change type upon implementation */
  private readonly authService: any;
  private readonly tokenService: any;
  private readonly cacheService: any;
  private readonly logger: LoggerFacade;

  /**
   * Create a new AuthEventHandler
   * 
   * @param authService Auth service instance
   * @param tokenService Token service instance
   * @param cacheService Cache service instance
   * @param logger Logger instance
   */
  constructor(
    authService: any,
    tokenService: any,
    cacheService: any,
    logger: LoggerFacade
  ) {
    this.authService = authService;
    this.tokenService = tokenService;
    this.cacheService = cacheService;
    this.logger = logger.withComponent('AuthEventHandler');
  }

  /**
   * Handle an authentication event
   * 
   * @param event The event to handle
   */
  public async handleEvent(event: Event): Promise<void> {
    try {
      // Check if the event is related to authentication
      if (event.type.startsWith('auth.')) {
        await this.handleAuthEvent(event);
      } 
      // Also handle user events that affect authentication
      else if (event.type === SystemEventTypes.USER_CREATED || 
               event.type === SystemEventTypes.USER_UPDATED || 
               event.type === SystemEventTypes.USER_DELETED) {
        await this.handleUserEvent(event);
      }
    } catch (error) {
      this.logger.error(`Error handling auth event: ${event.type}`, error as Error, {
        eventId: event.id,
        eventType: event.type
      });
      
      // Rethrow to allow event mediator to handle
      throw error;
    }
  }

  /**
   * Handle auth-specific events
   * 
   * @param event The auth event to handle
   */
  private async handleAuthEvent(event: Event): Promise<void> {
    // Convert to AuthEvent if possible
    const authEvent = event as AuthEvent;
    
    this.logger.debug(`Handling auth event: ${authEvent.type}`, {
      eventId: authEvent.id,
      userId: authEvent.userId
    });
    
    switch (authEvent.action) {
      case AuthAction.LOGIN:
        await this.handleLoginEvent(authEvent);
        break;
        
      case AuthAction.LOGOUT:
        await this.handleLogoutEvent(authEvent);
        break;
        
      case AuthAction.PASSWORD_CHANGE:
      case AuthAction.PASSWORD_RESET:
        await this.handlePasswordChangeEvent(authEvent);
        break;
        
      case AuthAction.TOKEN_REFRESH:
        await this.handleTokenRefreshEvent(authEvent);
        break;
        
      case AuthAction.TOKEN_REVOKED:
        await this.handleTokenRevokedEvent(authEvent);
        break;
        
      case AuthAction.ACCOUNT_LOCKED:
        await this.handleAccountLockedEvent(authEvent);
        break;
        
      case AuthAction.ACCOUNT_UNLOCKED:
        await this.handleAccountUnlockedEvent(authEvent);
        break;
        
      default:
        this.logger.debug(`No specific handler for auth event: ${authEvent.action}`);
    }
  }

  /**
   * Handle user-related events that affect authentication
   * 
   * @param event The user event to handle
   */
  private async handleUserEvent(event: Event): Promise<void> {
    const userId = event.payload?.id ?? event.payload?.userId;
    
    if (!userId) {
      this.logger.warn(`User event missing user ID: ${event.type}`, {
        eventId: event.id,
        eventType: event.type,
        payload: event.payload
      });
      return;
    }
    
    this.logger.debug(`Handling user event for auth: ${event.type}`, {
      eventId: event.id,
      userId
    });
    
    switch (event.type) {
      case SystemEventTypes.USER_DELETED:
        // Invalidate all tokens for deleted user
        await this.invalidateTokens(userId);
        // Clear user auth cache
        await this.clearUserAuthCache(userId);
        break;
        
      case SystemEventTypes.USER_UPDATED:
        // Update user auth cache
        await this.updateUserAuthCache(userId, event.payload);
        break;
    }
  }

  /**
   * Handle login events
   * 
   * @param event The login event
   */
  private async handleLoginEvent(event: AuthEvent): Promise<void> {
    // Log successful login
    this.logger.info(`User logged in: ${event.userId}`, {
      userId: event.userId,
      device: event.device?.type,
      ip: event.device?.ip
    });
    
    // Update last login timestamp
    await this.authService.updateLastLogin(event.userId);
    
    // Update auth cache
    if (event.userId)
      await this.updateUserAuthCache(event.userId);
  }

  /**
   * Handle logout events
   * 
   * @param event The logout event
   */
  private async handleLogoutEvent(event: AuthEvent): Promise<void> {
    // Log logout
    this.logger.info(`User logged out: ${event.userId}`, {
      userId: event.userId,
      device: event.device?.type,
      ip: event.device?.ip
    });
    
    // Invalidate the current token if available
    const tokenId = event.data?.tokenId;
    if (tokenId) {
      await this.tokenService.revokeToken(tokenId);
    }
    
    // Clear auth cache
    if (event.userId)
      await this.clearUserAuthCache(event.userId);
  }

  /**
   * Handle password change events
   * 
   * @param event The password change event
   */
  private async handlePasswordChangeEvent(event: AuthEvent): Promise<void> {
    // Invalidate all tokens for security
    if (event.userId)
      await this.invalidateTokens(event.userId);
    
    // Clear auth cache
    if (event.userId)
      await this.clearUserAuthCache(event.userId);
    
    this.logger.info(`User password changed: ${event.userId}`, {
      userId: event.userId,
      isReset: event.action === AuthAction.PASSWORD_RESET
    });
  }

  /**
   * Handle token refresh events
   * 
   * @param event The token refresh event
   */
  private async handleTokenRefreshEvent(event: AuthEvent): Promise<void> {
    this.logger.debug(`Token refreshed for user: ${event.userId}`, {
      userId: event.userId,
      tokenId: (event.data)?.tokenId
    });
  }

  /**
   * Handle token revoked events
   * 
   * @param event The token revoked event
   */
  private async handleTokenRevokedEvent(event: AuthEvent): Promise<void> {
    this.logger.debug(`Token revoked for user: ${event.userId}`, {
      userId: event.userId,
      tokenId: (event.data)?.tokenId
    });
  }

  /**
   * Handle account locked events
   * 
   * @param event The account locked event
   */
  private async handleAccountLockedEvent(event: AuthEvent): Promise<void> {
    // Invalidate all tokens for security
    if (event.userId)
      await this.invalidateTokens(event.userId);
    
    // Clear auth cache
    if (event.userId)
      await this.clearUserAuthCache(event.userId);
    
    this.logger.info(`User account locked: ${event.userId}`, {
      userId: event.userId,
      reason: (event.data)?.reason
    });
  }

  /**
   * Handle account unlocked events
   * 
   * @param event The account unlocked event
   */
  private async handleAccountUnlockedEvent(event: AuthEvent): Promise<void> {
    this.logger.info(`User account unlocked: ${event.userId}`, {
      userId: event.userId,
      unlockedBy: (event.data)?.unlockedBy
    });
    
    // Update auth cache
    if (event.userId)
      await this.updateUserAuthCache(event.userId);
  }

  /**
   * Invalidate all tokens for a user
   * 
   * @param userId ID of the user whose tokens should be invalidated
   */
  private async invalidateTokens(userId: string): Promise<void> {
    try {
      await this.tokenService.revokeAllForUser(userId);
      
      this.logger.debug(`Invalidated all tokens for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate tokens for user: ${userId}`, error as Error);
      throw error;
    }
  }

  /**
   * Clear a user's auth cache
   * 
   * @param userId ID of the user whose cache should be cleared
   */
  private async clearUserAuthCache(userId: string): Promise<void> {
    try {
      await this.cacheService.remove(`user:${userId}:auth`, 'auth');
      await this.cacheService.remove(`user:${userId}:permissions`, 'auth');
      
      this.logger.debug(`Cleared auth cache for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to clear auth cache for user: ${userId}`, error as Error);
      // Don't rethrow - cache errors shouldn't block auth operations
    }
  }

  /**
   * Update a user's auth cache
   * 
   * @param userId ID of the user whose cache should be updated
   * @param userData Optional updated user data
   */
  private async updateUserAuthCache(userId: string, userData?: any): Promise<void> {
    try {
      // If userData is provided, use it; otherwise fetch from service
      const user = userData ?? await this.authService.getUserById(userId);
      
      if (user) {
        // Cache user auth data
        await this.cacheService.set(`user:${userId}:auth`, user, { ttl: 3600 }, 'auth');
        
        // Cache user permissions
        const permissions = await this.authService.getUserPermissions(userId);
        await this.cacheService.set(`user:${userId}:permissions`, permissions, { ttl: 3600 }, 'auth');
        
        this.logger.debug(`Updated auth cache for user: ${userId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to update auth cache for user: ${userId}`, error as Error);
      // Don't rethrow - cache errors shouldn't block auth operations
    }
  }
}