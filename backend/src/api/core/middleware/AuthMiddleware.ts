import { AuthenticationFacade } from '@/services/auth/AuthenticationFacade';
import { JWTManager } from '@/services/auth/JWTManager';
import { AuthorizationEngine } from '@/services/auth/AuthorizationEngine';
import { DatabaseService } from '@/database/DatabaseService';
import type { Middleware, RequestContext, NextFunction } from '@/shared/types/api';
import { Logger } from '@/utils/Logger';

export class AuthMiddleware implements Middleware {
  private readonly authenticationFacade: AuthenticationFacade;
  private readonly jwtManager: JWTManager;
  private readonly authorizationEngine: AuthorizationEngine;
  private readonly logger: Logger;

  constructor() {
    this.logger = new Logger('AuthMiddleware');
    
    try {
      // Get database service instance
      const databaseService = DatabaseService.getInstance();
      
      // Initialize authentication components with proper dependencies
      this.authenticationFacade = new AuthenticationFacade(databaseService);
      this.jwtManager = new JWTManager();
      this.authorizationEngine = this.authenticationFacade.authz;
    } catch (error) {
      this.logger.error('Failed to initialize AuthMiddleware', error);
      throw new Error('Authentication middleware initialization failed');
    }
  }

  public async execute(context: RequestContext, next: NextFunction): Promise<void> {
    try {
      const isPublicRoute = this.isPublicRoute(context.request.url);
      
      if (!isPublicRoute) {
        await this.verifyToken(context);
        await this.checkPermissions(context);
      }
      
      await next();
    } catch (error) {
      this.logger.error('Authentication middleware error', error);
      throw error;
    }
  }

  private async verifyToken(context: RequestContext): Promise<void> {
    const authHeader = context.request.headers.get('Authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    
    try {
      // Use verifyAccessToken instead of verifyToken
      const payload = this.jwtManager.verifyAccessToken(token);
      
      if (!payload) {
        throw new Error('Invalid or expired token');
      }

      // Create user object from token payload
      context.user = {
        id: payload.sub,
        email: payload.email,
        firstName: '', // Will be populated from database if needed
        lastName: '',  // Will be populated from database if needed
        roles: payload.roles ?? []
      };
      
      context.metadata.set('tokenPayload', payload);
    } catch (error) {
      this.logger.error('Token verification failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        token: token.substring(0, 20) + '...' 
      });
      throw new Error('Invalid or expired token');
    }
  }

  private async checkPermissions(context: RequestContext): Promise<void> {
    if (!context.user) {
      throw new Error('User not authenticated');
    }

    try {
      const permissions = await this.authorizationEngine.getUserPermissions(context.user.id);
      context.permissions = permissions;
    } catch (error) {
      this.logger.error('Permission check failed', {
        userId: context.user.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to retrieve user permissions');
    }
  }

  private isPublicRoute(url: string): boolean {
    const publicRoutes = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/refresh',
      '/api/health',
      '/api/status'
    ];
    
    try {
      const path = new URL(url).pathname;
      return publicRoutes.some(route => path.startsWith(route));
    } catch (error) {
      this.logger.warn('Invalid URL in request', { url });
      return false;
    }
  }
}