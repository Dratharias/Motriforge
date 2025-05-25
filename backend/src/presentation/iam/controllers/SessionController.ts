import { Context } from 'hono';
import { Types } from 'mongoose';
import { SessionApplicationService } from '@/application/iam/SessionApplicationService';
import { IAMCommandBus } from '@/infrastructure/iam/bus/IAMCommandBus';
import { IAMQueryBus } from '@/infrastructure/iam/bus/IAMQueryBus';
import { 
  CreateSessionCommand, 
  RefreshSessionCommand, 
  RevokeSessionCommand,
  GetActiveSessionsQuery,
  AuthenticationMethod 
} from '@/types/iam/interfaces';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/LoggerFactory';
import { randomUUID } from 'crypto';

export class SessionController {
  private readonly logger = LoggerFactory.getContextualLogger('SessionController');

  constructor(
    private readonly sessionApplicationService: SessionApplicationService,
    private readonly commandBus: IAMCommandBus,
    private readonly queryBus: IAMQueryBus
  ) {}

  async createSession(c: Context) {
    const correlationId = c.req.header('x-correlation-id') ?? randomUUID();
    const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const userAgent = c.req.header('user-agent') || 'unknown';
    
    const requestLogger = this.logger
      .withCorrelationId(correlationId)
      .withIpAddress(ipAddress);

    try {
      requestLogger.info('Session creation request received');

      const body = await c.req.json();
      const { identityId, authenticationMethod } = body;

      if (!identityId) {
        return c.json({
          error: 'Identity ID is required',
          code: 'VALIDATION_ERROR'
        }, 400);
      }

      if (!Types.ObjectId.isValid(identityId)) {
        return c.json({
          error: 'Invalid identity ID format',
          code: 'VALIDATION_ERROR'
        }, 400);
      }

      const command: CreateSessionCommand = {
        correlationId,
        identityId: new Types.ObjectId(identityId),
        deviceFingerprint: this.extractDeviceFingerprint(c),
        ipAddress,
        userAgent,
        authenticationMethod: authenticationMethod || AuthenticationMethod.PASSWORD
      };

      const result = await this.commandBus.createSession(command);

      requestLogger.info('Session created successfully', { 
        sessionId: result.session.sessionId.value 
      });

      return c.json({
        success: true,
        data: {
          sessionId: result.session.sessionId.value,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresAt: result.session.expiresAt,
          riskScore: result.session.riskScore
        }
      }, 201);

    } catch (error) {
      requestLogger.error('Failed to create session', error as Error);
      
      if ((error as Error).message.includes('cannot authenticate')) {
        return c.json({
          error: 'Identity cannot authenticate',
          code: 'AUTHENTICATION_BLOCKED'
        }, 403);
      }

      return c.json({
        error: 'Failed to create session',
        code: 'INTERNAL_ERROR'
      }, 500);
    }
  }

  async refreshSession(c: Context) {
    const correlationId = c.req.header('x-correlation-id') ?? randomUUID();
    const ipAddress = c.req.header('x-forwarded-for') || 'unknown';
    const userAgent = c.req.header('user-agent') || 'unknown';
    
    const requestLogger = this.logger
      .withCorrelationId(correlationId)
      .withIpAddress(ipAddress);

    try {
      requestLogger.info('Session refresh request received');

      const body = await c.req.json();
      const { refreshToken } = body;

      if (!refreshToken) {
        return c.json({
          error: 'Refresh token is required',
          code: 'VALIDATION_ERROR'
        }, 400);
      }

      const command: RefreshSessionCommand = {
        correlationId,
        refreshToken,
        ipAddress,
        userAgent
      };

      const result = await this.sessionApplicationService.refreshSession(command);

      requestLogger.info('Session refreshed successfully');

      return c.json({
        success: true,
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken
        }
      });

    } catch (error) {
      requestLogger.error('Failed to refresh session', error as Error);
      
      if ((error as Error).message.includes('Invalid') || (error as Error).message.includes('not found')) {
        return c.json({
          error: 'Invalid or expired refresh token',
          code: 'INVALID_TOKEN'
        }, 401);
      }

      return c.json({
        error: 'Failed to refresh session',
        code: 'INTERNAL_ERROR'
      }, 500);
    }
  }

  async revokeSession(c: Context) {
    const sessionId = c.req.param('sessionId');
    const correlationId = c.req.header('x-correlation-id') ?? randomUUID();
    const requestLogger = this.logger
      .withCorrelationId(correlationId)
      .withData({ sessionId });

    try {
      requestLogger.info('Session revocation request received');

      const body = await c.req.json().catch(() => ({}));
      const { reason } = body;

      const command: RevokeSessionCommand = {
        correlationId,
        sessionId,
        reason: reason || 'User requested logout'
      };

      await this.sessionApplicationService.revokeSession(command);

      requestLogger.info('Session revoked successfully');

      return c.json({
        success: true,
        message: 'Session revoked successfully'
      });

    } catch (error) {
      requestLogger.error('Failed to revoke session', error as Error);
      return c.json({
        error: 'Failed to revoke session',
        code: 'INTERNAL_ERROR'
      }, 500);
    }
  }

  async getActiveSessions(c: Context) {
    const identityId = c.req.param('identityId');
    const requestLogger = this.logger.withData({ identityId });

    try {
      requestLogger.debug('Get active sessions request received');

      if (!Types.ObjectId.isValid(identityId)) {
        return c.json({
          error: 'Invalid identity ID format',
          code: 'VALIDATION_ERROR'
        }, 400);
      }

      const query: GetActiveSessionsQuery = {
        identityId: new Types.ObjectId(identityId)
      };

      const sessions = await this.sessionApplicationService.getActiveSessions(query);

      requestLogger.debug('Active sessions retrieved successfully', { 
        sessionCount: sessions.totalSessions 
      });

      return c.json({
        success: true,
        data: sessions
      });

    } catch (error) {
      requestLogger.error('Failed to get active sessions', error as Error);
      return c.json({
        error: 'Failed to retrieve active sessions',
        code: 'INTERNAL_ERROR'
      }, 500);
    }
  }

  async validateSession(c: Context) {
    const sessionId = c.req.param('sessionId');
    const requestLogger = this.logger.withData({ sessionId });

    try {
      requestLogger.debug('Session validation request received');

      const session = await this.sessionApplicationService.validateSession(sessionId);

      if (!session) {
        requestLogger.debug('Session not found or invalid');
        return c.json({
          error: 'Session not found or invalid',
          code: 'INVALID_SESSION'
        }, 401);
      }

      requestLogger.debug('Session validated successfully');

      return c.json({
        success: true,
        data: {
          sessionId: session.sessionId.value,
          identityId: session.identityId.toString(),
          isActive: session.isActive(),
          expiresAt: session.expiresAt,
          lastAccessedAt: session.lastAccessedAt,
          riskScore: session.riskScore
        }
      });

    } catch (error) {
      requestLogger.error('Failed to validate session', error as Error);
      return c.json({
        error: 'Failed to validate session',
        code: 'INTERNAL_ERROR'
      }, 500);
    }
  }

  private extractDeviceFingerprint(c: Context): string {
    // Simple device fingerprint - in production, this would be more sophisticated
    const userAgent = c.req.header('user-agent') || '';
    const acceptLanguage = c.req.header('accept-language') || '';
    const acceptEncoding = c.req.header('accept-encoding') || '';
    
    return Buffer.from(`${userAgent}:${acceptLanguage}:${acceptEncoding}`).toString('base64');
  }
}

