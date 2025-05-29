import { Context, Next, MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { IUser } from '../../../types/core/interfaces';
import { IAMContext, AuthResult } from './types';

export interface IAuthenticationService {
  validateToken(token: string): Promise<IUser | null>;
  validateApiKey(apiKey: string): Promise<IUser | null>;
}

export class AuthenticationMiddleware {
  constructor(private readonly authService?: IAuthenticationService) {}

  requireAuth(): MiddlewareHandler {
    return async (c: Context, next: Next) => {
      const authResult = await this.authenticate(c);
      
      if (!authResult.success) {
        throw new HTTPException(401, { message: authResult.reason ?? 'Authentication required' });
      }

      this.setIAMContext(c, authResult);
      await next();
    };
  }

  allowGuest(): MiddlewareHandler {
    return async (c: Context, next: Next) => {
      const authResult = await this.authenticate(c);
      this.setIAMContext(c, authResult);
      await next();
    };
  }

  private async authenticate(c: Context): Promise<AuthResult> {
    const token = this.extractToken(c);
    const apiKey = this.extractApiKey(c);

    if (!token && !apiKey) {
      return { success: false, reason: 'No authentication credentials provided' };
    }

    if (!this.authService) {
      return { success: false, reason: 'Authentication service not configured' };
    }

    try {
      if (token) {
        const user = await this.authService.validateToken(token.replace(/^Bearer\s+/i, ''));
        return user ? { success: true, user } : { success: false, reason: 'Invalid token' };
      }

      if (apiKey) {
        const user = await this.authService.validateApiKey(apiKey);
        return user ? { success: true, user } : { success: false, reason: 'Invalid API key' };
      }

      return { success: false, reason: 'Invalid authentication method' };
    } catch (error) {
      console.error('Authentication error:', error);
      return { 
        success: false, 
        reason: error instanceof Error ? error.message : 'Authentication failed' 
      };
    }
  }

  private setIAMContext(c: Context, authResult: AuthResult): void {
    const iamContext: IAMContext = {
      user: authResult.user,
      sessionId: this.generateSessionId(),
      traceId: this.extractTraceId(c),
      organizationId: authResult.user?.organization,
      authenticated: authResult.success,
      timestamp: new Date()
    };

    c.set('iamContext', iamContext);
  }

  private extractToken(c: Context): string | undefined {
    return c.req.header('Authorization');
  }

  private extractApiKey(c: Context): string | undefined {
    return c.req.header('X-API-Key');
  }

  private extractTraceId(c: Context): string {
    return c.req.header('X-Trace-ID') ?? this.generateTraceId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 13)}`;
  }
}

