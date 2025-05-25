
import { LogLevel } from '@/types/shared/common';
import { ApplicationContext } from '@/types/shared/enums/common';
import { AuditLogEntry, AuditLogType, AuditResult, AuditRiskLevel } from '@/types/shared/infrastructure/logging';
import { ObjectId } from 'mongoose';
import { IAuditLogger, ILogger } from './interfaces/ILogger';

/**
 * Audit Logger - single responsibility for compliance and audit logging
 */
export class AuditLogger implements IAuditLogger {
  constructor(
    private readonly baseLogger: ILogger,
    public readonly name: string = 'audit'
  ) {}

  async audit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const auditEntry: AuditLogEntry = {
      id: new ObjectId(),
      timestamp: new Date(),
      ...entry
    };

    await this.baseLogger.log(
      entry.level,
      `AUDIT: ${entry.action} - ${entry.result}`,
      {
        auditType: entry.auditType,
        resourceId: entry.resourceId?.toHexString(),
        resourceType: entry.resourceType,
        action: entry.action,
        result: entry.result,
        riskLevel: entry.riskLevel,
        complianceFrameworks: entry.complianceFrameworks,
        sensitiveData: entry.sensitiveData,
        retention: entry.retention,
        ...entry.data
      },
      {
        applicationContext: entry.context,
        correlationId: entry.correlationId,
        userId: entry.userId,
        organizationId: entry.organizationId,
        sessionId: entry.sessionId,
        requestId: entry.requestId
      }
    );
  }

  async auditSuccess(action: string, resourceId?: ObjectId, data?: any): Promise<void> {
    await this.audit({
      level: LogLevel.INFO,
      message: `Successful ${action}`,
      context: ApplicationContext.AUDIT,
      auditType: AuditLogType.SYSTEM_ACCESS,
      resourceId,
      action,
      result: AuditResult.SUCCESS,
      riskLevel: AuditRiskLevel.LOW,
      complianceFrameworks: ['GDPR'],
      sensitiveData: false,
      retention: {
        days: 365,
        archiveAfterDays: 90,
        deleteAfterDays: 2555, // 7 years
        immutable: true
      },
      data
    });
  }

  async auditFailure(action: string, error: Error, resourceId?: ObjectId, data?: any): Promise<void> {
    await this.audit({
      level: LogLevel.ERROR,
      message: `Failed ${action}: ${error.message}`,
      context: ApplicationContext.AUDIT,
      auditType: AuditLogType.SYSTEM_ACCESS,
      resourceId,
      action,
      result: AuditResult.FAILURE,
      riskLevel: AuditRiskLevel.MEDIUM,
      complianceFrameworks: ['GDPR'],
      sensitiveData: false,
      retention: {
        days: 365,
        archiveAfterDays: 90,
        deleteAfterDays: 2555,
        immutable: true
      },
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      data
    });
  }

  async auditAccess(resourceType: string, resourceId: ObjectId, action: string): Promise<void> {
    await this.audit({
      level: LogLevel.INFO,
      message: `Data access: ${action} on ${resourceType}`,
      context: ApplicationContext.AUDIT,
      auditType: AuditLogType.DATA_ACCESS,
      resourceType,
      resourceId,
      action,
      result: AuditResult.SUCCESS,
      riskLevel: AuditRiskLevel.LOW,
      complianceFrameworks: ['GDPR', 'HIPAA'],
      sensitiveData: true,
      retention: {
        days: 365,
        archiveAfterDays: 90,
        deleteAfterDays: 2555,
        immutable: true
      }
    });
  }

  async auditDataChange(resourceType: string, resourceId: ObjectId, changes: Record<string, any>): Promise<void> {
    await this.audit({
      level: LogLevel.INFO,
      message: `Data modification on ${resourceType}`,
      context: ApplicationContext.AUDIT,
      auditType: AuditLogType.DATA_MODIFICATION,
      resourceType,
      resourceId,
      action: 'update',
      result: AuditResult.SUCCESS,
      riskLevel: AuditRiskLevel.MEDIUM,
      complianceFrameworks: ['GDPR', 'HIPAA'],
      sensitiveData: true,
      retention: {
        days: 365,
        archiveAfterDays: 90,
        deleteAfterDays: 2555,
        immutable: true
      },
      data: { changes }
    });
  }

  async auditSecurityEvent(eventType: string, severity: string, details: any): Promise<void> {
    const riskLevel = severity === 'critical' ? AuditRiskLevel.CRITICAL :
                     severity === 'high' ? AuditRiskLevel.HIGH :
                     severity === 'medium' ? AuditRiskLevel.MEDIUM : AuditRiskLevel.LOW;

    await this.audit({
      level: severity === 'critical' ? LogLevel.FATAL : LogLevel.ERROR,
      message: `Security event: ${eventType}`,
      context: ApplicationContext.AUDIT,
      auditType: AuditLogType.SECURITY_EVENT,
      action: eventType,
      result: AuditResult.SUCCESS,
      riskLevel,
      complianceFrameworks: ['SOC2', 'ISO27001'],
      sensitiveData: true,
      retention: {
        days: 365,
        archiveAfterDays: 90,
        deleteAfterDays: 2555,
        immutable: true
      },
      data: details
    });
  }
}

