import { ISessionRepository } from '@/domain/iam/ports/ISessionRepository';
import { ITokenGenerator } from '@/domain/iam/ports/ITokenGenerator';
import { ITokenValidator } from '@/domain/iam/ports/ITokenValidator';
import { SessionManagementService } from '@/domain/iam/services/SessionManagementService';
import { IAuditLogger } from '@/domain/iam/ports/IAuditLogger';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/factory/LoggerFactory';
import {
  CreateSessionCommand,
  RefreshSessionCommand,
  RevokeSessionCommand,
  GetActiveSessionsQuery,
  Session,
  ActiveSessionsReadModel,
  SessionItem
} from '@/types/iam/interfaces';

export interface SessionService {
    session: Session;
    accessToken: string;
    refreshToken: string;
  }

export class SessionApplicationService {
  private readonly logger = LoggerFactory.getContextualLogger('SessionApplicationService');
  private readonly auditLogger = LoggerFactory.getAuditLogger();

  constructor(
    private readonly sessionRepository: ISessionRepository,
    private readonly tokenGenerator: ITokenGenerator,
    private readonly tokenValidator: ITokenValidator,
    private readonly sessionManagementService: SessionManagementService,
    private readonly domainAuditLogger: IAuditLogger
  ) {}

  async createSession(command: CreateSessionCommand): Promise<SessionService> {
    const contextLogger = this.logger
      .withCorrelationId(command.correlationId)
      .withData({ 
        identityId: command.identityId.toString(),
        ipAddress: command.ipAddress,
        authMethod: command.authenticationMethod
      });

    try {
      contextLogger.info('Creating session');

      // Extract device components from user agent and other factors
      const deviceComponents = {
        userAgent: command.userAgent,
        ipAddress: command.ipAddress,
        timestamp: new Date().toISOString()
      };

      // Create session through domain service
      const session = await this.sessionManagementService.createSession(
        command.identityId,
        command.ipAddress,
        command.userAgent,
        command.authenticationMethod,
        deviceComponents
      );

      // Generate tokens
      const accessToken = await this.tokenGenerator.generateAccessToken(
        {
          sub: command.identityId.toString(),
          sessionId: session.sessionId.value,
          type: 'access'
        },
        '1h'
      );

      const refreshToken = await this.tokenGenerator.generateRefreshToken(
        session.sessionId.value
      );

      await this.auditLogger.auditSuccess('session_created', command.identityId);
      contextLogger.info('Session created successfully', { 
        sessionId: session.sessionId.value 
      });

      return {
        session,
        accessToken,
        refreshToken
      };

    } catch (error) {
      await this.auditLogger.auditFailure('session_created', error as Error);
      contextLogger.error('Failed to create session', error as Error);
      throw error;
    }
  }

  async refreshSession(command: RefreshSessionCommand): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const contextLogger = this.logger
      .withCorrelationId(command.correlationId)
      .withData({ ipAddress: command.ipAddress });

    try {
      contextLogger.info('Refreshing session');

      // Validate refresh token
      const tokenValidation = await this.tokenValidator.validateRefreshToken(
        command.refreshToken
      );

      if (!tokenValidation.valid || !tokenValidation.sessionId) {
        throw new Error('Invalid refresh token');
      }

      // Find and validate session
      const session = await this.sessionRepository.findBySessionId(tokenValidation.sessionId);
      if (!session?.isActive()) {
        throw new Error('Session not found or inactive');
      }

      // Generate new tokens
      const accessToken = await this.tokenGenerator.generateAccessToken(
        {
          sub: session.identityId.toString(),
          sessionId: session.sessionId.value,
          type: 'access'
        },
        '1h'
      );

      const refreshToken = await this.tokenGenerator.generateRefreshToken(
        session.sessionId.value
      );

      // Revoke old refresh token
      await this.tokenValidator.revokeToken(command.refreshToken);

      await this.auditLogger.auditSuccess('session_refreshed', session.identityId);
      contextLogger.info('Session refreshed successfully', { 
        sessionId: session.sessionId.value 
      });

      return {
        accessToken,
        refreshToken
      };

    } catch (error) {
      await this.auditLogger.auditFailure('session_refreshed', error as Error);
      contextLogger.error('Failed to refresh session', error as Error);
      throw error;
    }
  }

  async revokeSession(command: RevokeSessionCommand): Promise<void> {
    const contextLogger = this.logger
      .withCorrelationId(command.correlationId)
      .withData({ sessionId: command.sessionId });

    try {
      contextLogger.info('Revoking session');

      await this.sessionManagementService.terminateSession(
        command.sessionId,
        command.reason
      );

      const session = await this.sessionRepository.findBySessionId(command.sessionId);
      if (session) {
        await this.auditLogger.auditSuccess('session_revoked', session.identityId);
      }

      contextLogger.info('Session revoked successfully');

    } catch (error) {
      await this.auditLogger.auditFailure('session_revoked', error as Error);
      contextLogger.error('Failed to revoke session', error as Error);
      throw error;
    }
  }

  async getActiveSessions(query: GetActiveSessionsQuery): Promise<ActiveSessionsReadModel> {
    const contextLogger = this.logger.withData({ 
      identityId: query.identityId.toString() 
    });

    try {
      contextLogger.debug('Retrieving active sessions');

      const sessions = await this.sessionRepository.findActiveByIdentityId(query.identityId);
      
      const sessionItems: SessionItem[] = sessions.map(session => ({
        sessionId: session.sessionId.value,
        deviceType: this.inferDeviceType(session.userAgent),
        ipAddress: session.ipAddress.value,
        lastAccess: session.lastAccessedAt,
        riskScore: session.riskScore,
        location: undefined // Could be enhanced with IP geolocation
      }));

      const suspiciousCount = sessions.filter(s => s.riskScore > 70).length;

      const readModel: ActiveSessionsReadModel = {
        identityId: query.identityId,
        sessions: sessionItems,
        totalSessions: sessions.length,
        suspiciousSessions: suspiciousCount
      };

      contextLogger.debug('Active sessions retrieved successfully', { 
        totalSessions: sessions.length,
        suspiciousSessions: suspiciousCount
      });

      return readModel;

    } catch (error) {
      contextLogger.error('Failed to retrieve active sessions', error as Error);
      throw error;
    }
  }

  async validateSession(sessionId: string): Promise<Session | null> {
    const contextLogger = this.logger.withData({ sessionId });

    try {
      contextLogger.debug('Validating session');

      const session = await this.sessionManagementService.validateSession(sessionId);
      
      contextLogger.debug('Session validation completed', { 
        valid: session !== null 
      });

      return session;

    } catch (error) {
      contextLogger.error('Failed to validate session', error as Error);
      throw error;
    }
  }

  private inferDeviceType(userAgent: string): import('@/types/iam/interfaces').DeviceType {
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'mobile' as any;
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet' as any;
    }
    if (ua.includes('postman') || ua.includes('api') || ua.includes('curl')) {
      return 'api_client' as any;
    }
    return 'desktop' as any;
  }
}