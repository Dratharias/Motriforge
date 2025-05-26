
import { Types } from 'mongoose';
import { IAuditLogger } from '@/domain/iam/ports/IAuditLogger';
import { EventType, RiskLevel } from '@/types/iam/interfaces';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/factory/LoggerFactory';
import { AuditLogDocument } from '../repositories/types/DocumentInterfaces';
import { IAuditLogModel } from '../repositories/types/ModelInterfaces';

export class SecurityAuditAdapter implements IAuditLogger {
  private readonly logger = LoggerFactory.getContextualLogger('SecurityAuditAdapter');

  constructor(private readonly model: IAuditLogModel) {}

  async logSecurityEvent(
    type: EventType,
    identityId: Types.ObjectId | null,
    details: Record<string, unknown>,
    riskLevel: RiskLevel
  ): Promise<void> {
    try {
      await this.model.create({
        eventType: type,
        identityId: identityId || undefined,
        details,
        riskLevel,
        timestamp: new Date(),
        correlationId: details.correlationId as string
      });

      this.logger.info('Security event logged', {
        eventType: type,
        identityId: identityId?.toString(),
        riskLevel
      });
    } catch (error) {
      this.logger.error('Failed to log security event', error as Error, {
        eventType: type,
        identityId: identityId?.toString()
      });
      throw error;
    }
  }

  async logAccessAttempt(
    identityId: Types.ObjectId | null,
    success: boolean,
    ipAddress: string,
    userAgent: string,
    details: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.model.create({
        eventType: EventType.LOGIN_ATTEMPT,
        identityId: identityId || undefined,
        ipAddress,
        userAgent,
        details: {
          ...details,
          success
        },
        riskLevel: success ? RiskLevel.LOW : RiskLevel.MEDIUM,
        timestamp: new Date()
      });

      this.logger.info('Access attempt logged', {
        identityId: identityId?.toString(),
        success,
        ipAddress
      });
    } catch (error) {
      this.logger.error('Failed to log access attempt', error as Error, {
        identityId: identityId?.toString(),
        ipAddress
      });
      throw error;
    }
  }

  async logDataChange(
    identityId: Types.ObjectId,
    entityType: string,
    entityId: string,
    changes: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.model.create({
        eventType: EventType.IDENTITY_UPDATED,
        identityId,
        details: {
          entityType,
          entityId,
          changes
        },
        riskLevel: RiskLevel.LOW,
        timestamp: new Date()
      });

      this.logger.info('Data change logged', {
        identityId: identityId.toString(),
        entityType,
        entityId
      });
    } catch (error) {
      this.logger.error('Failed to log data change', error as Error, {
        identityId: identityId.toString(),
        entityType,
        entityId
      });
      throw error;
    }
  }
}