import { Types } from 'mongoose';
import { Session } from '../entities/Session';
import { ISessionRepository } from '../ports/ISessionRepository';
import { IDeviceRepository } from '../ports/IDeviceRepository';
import { IRiskAssessmentService } from '../ports/IRiskAssessmentService';
import { IAuditLogger } from '../ports/IAuditLogger';
import { DeviceFingerprint } from '../value-objects/DeviceFingerprint';
import { Device, AuthenticationMethod, DeviceType, EventType, RiskLevel } from '@/types/iam/interfaces';

export class SessionManagementService {
  constructor(
    private readonly sessionRepository: ISessionRepository,
    private readonly deviceRepository: IDeviceRepository,
    private readonly riskAssessmentService: IRiskAssessmentService,
    private readonly auditLogger: IAuditLogger
  ) {}

  async createSession(
    identityId: Types.ObjectId,
    ipAddress: string,
    userAgent: string,
    authenticationMethod: AuthenticationMethod,
    deviceComponents: Record<string, string>
  ): Promise<Session> {
    // Create or find device
    const deviceFingerprint = DeviceFingerprint.fromComponents(deviceComponents);
    let device = await this.deviceRepository.findByFingerprint(deviceFingerprint.value);
    
    if (!device) {
      device = {
        id: new Types.ObjectId(),
        fingerprint: deviceFingerprint,
        type: this.inferDeviceType(userAgent),
        name: this.extractDeviceName(userAgent),
        isTrusted: false,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        attributes: deviceComponents
      };
      await this.deviceRepository.save(device);
    }

    // Assess risk
    const riskAssessment = await this.riskAssessmentService.assessLoginRisk(
      identityId,
      ipAddress,
      deviceFingerprint.value,
      userAgent
    );

    // Create session
    const session = Session.create(
      identityId,
      device.id,
      ipAddress,
      userAgent,
      authenticationMethod
    );

    // Update session with risk score
    const sessionWithRisk = session.updateRiskScore(riskAssessment.riskScore);
    
    await this.sessionRepository.save(sessionWithRisk);

    // Log session creation
    await this.auditLogger.logSecurityEvent(
      EventType.SESSION_CREATED,
      identityId,
      {
        sessionId: session.sessionId.value,
        ipAddress,
        userAgent,
        authenticationMethod,
        riskScore: riskAssessment.riskScore,
        riskLevel: riskAssessment.riskLevel
      },
      riskAssessment.riskLevel
    );

    return sessionWithRisk;
  }

  async terminateSession(sessionId: string, reason: string): Promise<void> {
    const session = await this.sessionRepository.findBySessionId(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const terminatedSession = session.terminate(reason);
    await this.sessionRepository.save(terminatedSession);

    await this.auditLogger.logSecurityEvent(
      EventType.SESSION_EXPIRED,
      session.identityId,
      { sessionId, reason },
      RiskLevel.LOW
    );
  }

  async terminateAllSessions(identityId: Types.ObjectId, reason: string): Promise<void> {
    const sessions = await this.sessionRepository.findActiveByIdentityId(identityId);
    
    for (const session of sessions) {
      const terminatedSession = session.terminate(reason);
      await this.sessionRepository.save(terminatedSession);
    }

    await this.auditLogger.logSecurityEvent(
      EventType.SESSION_EXPIRED,
      identityId,
      { action: 'terminate_all_sessions', reason, count: sessions.length },
      RiskLevel.MEDIUM
    );
  }

  async validateSession(sessionId: string): Promise<Session | null> {
    const session = await this.sessionRepository.findBySessionId(sessionId);
    
    if (!session || !session.isActive()) {
      return null;
    }

    // Update last accessed time
    const updatedSession = session.updateLastAccess();
    await this.sessionRepository.save(updatedSession);

    return updatedSession;
  }

  async cleanupExpiredSessions(): Promise<number> {
    return await this.sessionRepository.cleanupExpiredSessions();
  }

  private inferDeviceType(userAgent: string): DeviceType {
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return DeviceType.MOBILE;
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return DeviceType.TABLET;
    }
    if (ua.includes('postman') || ua.includes('api') || ua.includes('curl')) {
      return DeviceType.API_CLIENT;
    }
    return DeviceType.DESKTOP;
  }

  private extractDeviceName(userAgent: string): string {
    // Simple device name extraction - could be enhanced
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('Linux')) return 'Linux PC';
    return 'Unknown Device';
  }
}