import { Context, Next } from 'hono';
import { ITokenValidator } from '@/domain/iam/ports/ITokenValidator';
import { SessionApplicationService } from '@/application/iam/SessionApplicationService';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/LoggerFactory';

export class AuthenticationMiddleware {
  private readonly logger = LoggerFactory.getContextualLogger('AuthenticationMiddleware');

  constructor(
    private readonly tokenValidator: ITokenValidator,
    private readonly sessionApplicationService: SessionApplicationService
  ) {}

  async authenticate(c: Context, next: Next) {
    const requestLogger = this.logger.withData({
      path: c.req.path,
      method: c.req.method
    });

    try {
      // Skip authentication for certain endpoints
      if (this.shouldSkipAuth(c.req.path)) {
        await next();
        return;
      }

      const authHeader = c.req.header('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        requestLogger.debug('Missing or invalid authorization header');
        return c.json({
          error: 'Missing or invalid authorization header',
          code: 'UNAUTHORIZED'
        }, 401);
      }

      const token = authHeader.substring(7);
      const tokenValidation = await this.tokenValidator.validateAccessToken(token);

      if (!tokenValidation.valid) {
        requestLogger.debug('Invalid access token', { 
          error: tokenValidation.error 
        });
        return c.json({
          error: 'Invalid access token',
          code: 'UNAUTHORIZED'
        }, 401);
      }

      // Validate session is still active
      const sessionId = tokenValidation.payload?.sessionId as string;
      if (sessionId) {
        const session = await this.sessionApplicationService.validateSession(sessionId);
        if (!session) {
          requestLogger.debug('Session not found or inactive');
          return c.json({
            error: 'Session not found or inactive',
            code: 'SESSION_INVALID'
          }, 401);
          }
      }

      // Add user context to request
      c.set('userContext', {
        identityId: tokenValidation.payload?.sub,
        sessionId: tokenValidation.payload?.sessionId,
        tokenPayload: tokenValidation.payload
      });

      requestLogger.debug('Authentication successful');
      await next();

    } catch (error) {
      requestLogger.error('Authentication middleware error', error as Error);
      return c.json({
        error: 'Authentication failed',
        code: 'INTERNAL_ERROR'
      }, 500);
    }
  }

  private shouldSkipAuth(path: string): boolean {
    const publicPaths = [
      '/iam/sessions', // Login endpoint
      '/iam/sessions/refresh', // Token refresh
      '/iam/identities', // Registration endpoint (POST only)
      '/health',
      '/metrics'
    ];

    return publicPaths.some(publicPath => path.startsWith(publicPath));
  }
}