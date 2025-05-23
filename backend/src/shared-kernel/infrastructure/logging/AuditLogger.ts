import { ObjectId } from 'mongodb';
import { ContextualLogger } from './ContextualLogger';
import { AuditEventType, ApplicationContext, ComplianceFramework } from '@/types/shared/enums/common';
import { ISecurityContext } from '@/types/shared/base-types';

/**
 * Data sensitivity level for compliance and security classification
 */
export type SensitivityLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Audit outcome types
 */
export type AuditOutcome = 'success' | 'failure' | 'denied';

/**
 * Data modification action types
 */
export type DataModificationAction = 'create' | 'update' | 'delete';

/**
 * Data access action types
 */
export type DataAccessAction = 'view' | 'download' | 'export';

/**
 * Security violation severity levels
 */
export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
  readonly auditId: ObjectId;
  readonly timestamp: Date;
  readonly eventType: AuditEventType;
  readonly userId?: ObjectId;
  readonly organizationId?: ObjectId;
  readonly sessionId?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly resource?: string;
  readonly resourceId?: ObjectId;
  readonly action: string;
  readonly outcome: AuditOutcome;
  readonly context: ApplicationContext;
  readonly sensitivityLevel: SensitivityLevel;
  readonly complianceFrameworks: readonly ComplianceFramework[];
  readonly details?: Record<string, any>;
  readonly beforeState?: Record<string, any>;
  readonly afterState?: Record<string, any>;
  readonly correlationId?: string;
  readonly riskScore?: number;
}

/**
 * Data modification parameters
 */
export interface DataModificationParams {
  readonly resource: string;
  readonly resourceId: ObjectId;
  readonly action: DataModificationAction;
  readonly context: ApplicationContext;
  readonly beforeState?: Record<string, any>;
  readonly afterState?: Record<string, any>;
  readonly sensitivityLevel?: SensitivityLevel;
}

/**
 * Data access parameters
 */
export interface DataAccessParams {
  readonly resource: string;
  readonly resourceId: ObjectId;
  readonly action: DataAccessAction;
  readonly context: ApplicationContext;
  readonly sensitivityLevel?: SensitivityLevel;
  readonly details?: Record<string, any>;
}

/**
 * Access control parameters
 */
export interface AccessControlParams {
  readonly resource: string;
  readonly resourceId: ObjectId;
  readonly action: string;
  readonly outcome: AuditOutcome;
  readonly context: ApplicationContext;
  readonly details?: Record<string, any>;
}

/**
 * Security violation parameters
 */
export interface SecurityViolationParams {
  readonly violationType: string;
  readonly severity: SecuritySeverity;
  readonly context: ApplicationContext;
  readonly details: Record<string, any>;
}

/**
 * Medical data access parameters
 */
export interface MedicalDataAccessParams {
  readonly patientId: ObjectId;
  readonly medicalRecordId: ObjectId;
  readonly action: string;
  readonly details?: Record<string, any>;
}

/**
 * Authentication outcome types (subset of AuditOutcome)
 */
export type AuthenticationOutcome = 'success' | 'failure';

/**
 * Audit logger for compliance and security logging
 */
export class AuditLogger {
  private readonly contextualLogger: ContextualLogger;
  private readonly auditRepository: IAuditRepository;
  private readonly defaultComplianceFrameworks: readonly ComplianceFramework[];

  constructor(
    contextualLogger: ContextualLogger,
    auditRepository: IAuditRepository,
    complianceFrameworks: readonly ComplianceFramework[] = []
  ) {
    this.contextualLogger = contextualLogger;
    this.auditRepository = auditRepository;
    this.defaultComplianceFrameworks = complianceFrameworks;
  }

  /**
   * Logs user authentication events
   */
  async logAuthentication(
    eventType: AuditEventType.LOGIN | AuditEventType.LOGOUT,
    securityContext: ISecurityContext,
    outcome: AuthenticationOutcome,
    details?: Record<string, any>
  ): Promise<void> {
    const entry = this.createAuditEntry({
      eventType,
      userId: securityContext.userId,
      organizationId: securityContext.organizationId,
      sessionId: securityContext.sessionId,
      ipAddress: securityContext.ipAddress,
      userAgent: securityContext.userAgent,
      action: eventType,
      outcome,
      context: ApplicationContext.AUTHENTICATION,
      sensitivityLevel: 'high',
      complianceFrameworks: [ComplianceFramework.SOX, ComplianceFramework.ISO27001],
      details,
      riskScore: outcome === 'failure' ? 7 : 3
    });

    await this.writeAuditEntry(entry);
  }

  /**
   * Logs data access events
   */
  async logDataAccess(
    params: DataAccessParams,
    securityContext: ISecurityContext
  ): Promise<void> {
    const {
      resource,
      resourceId,
      action,
      context,
      sensitivityLevel = 'medium',
      details
    } = params;

    const entry = this.createAuditEntry({
      eventType: AuditEventType.DATA_VIEWED,
      userId: securityContext.userId,
      organizationId: securityContext.organizationId,
      sessionId: securityContext.sessionId,
      ipAddress: securityContext.ipAddress,
      userAgent: securityContext.userAgent,
      resource,
      resourceId,
      action,
      outcome: 'success',
      context,
      sensitivityLevel,
      complianceFrameworks: this.getComplianceFrameworksForData(sensitivityLevel),
      details,
      riskScore: this.calculateRiskScore(action, sensitivityLevel)
    });

    await this.writeAuditEntry(entry);
  }

  /**
   * Logs data modification events
   */
  async logDataModification(
    params: DataModificationParams,
    securityContext: ISecurityContext
  ): Promise<void> {
    const {
      resource,
      resourceId,
      action,
      context,
      beforeState,
      afterState,
      sensitivityLevel = 'medium'
    } = params;

    const eventTypeMap = {
      create: AuditEventType.DATA_CREATED,
      update: AuditEventType.DATA_UPDATED,
      delete: AuditEventType.DATA_DELETED
    };

    const entry = this.createAuditEntry({
      eventType: eventTypeMap[action],
      userId: securityContext.userId,
      organizationId: securityContext.organizationId,
      sessionId: securityContext.sessionId,
      ipAddress: securityContext.ipAddress,
      userAgent: securityContext.userAgent,
      resource,
      resourceId,
      action,
      outcome: 'success',
      context,
      sensitivityLevel,
      complianceFrameworks: this.getComplianceFrameworksForData(sensitivityLevel),
      beforeState,
      afterState,
      riskScore: this.calculateRiskScore(action, sensitivityLevel)
    });

    await this.writeAuditEntry(entry);
  }

  /**
   * Logs access control events
   */
  async logAccessControl(
    params: AccessControlParams,
    securityContext: ISecurityContext
  ): Promise<void> {
    const { resource, resourceId, action, outcome, context, details } = params;

    const eventType = outcome === 'success' 
      ? AuditEventType.ACCESS_GRANTED 
      : AuditEventType.ACCESS_DENIED;

    const entry = this.createAuditEntry({
      eventType,
      userId: securityContext.userId,
      organizationId: securityContext.organizationId,
      sessionId: securityContext.sessionId,
      ipAddress: securityContext.ipAddress,
      userAgent: securityContext.userAgent,
      resource,
      resourceId,
      action,
      outcome,
      context,
      sensitivityLevel: outcome === 'denied' ? 'high' : 'medium',
      complianceFrameworks: [ComplianceFramework.SOX, ComplianceFramework.ISO27001],
      details,
      riskScore: outcome === 'denied' ? 8 : 2
    });

    await this.writeAuditEntry(entry);
  }

  /**
   * Logs security violations
   */
  async logSecurityViolation(
    params: SecurityViolationParams,
    securityContext: ISecurityContext
  ): Promise<void> {
    const { violationType, severity, context, details } = params;

    const entry = this.createAuditEntry({
      eventType: AuditEventType.SECURITY_VIOLATION,
      userId: securityContext.userId,
      organizationId: securityContext.organizationId,
      sessionId: securityContext.sessionId,
      ipAddress: securityContext.ipAddress,
      userAgent: securityContext.userAgent,
      action: violationType,
      outcome: 'failure',
      context,
      sensitivityLevel: 'critical',
      complianceFrameworks: this.defaultComplianceFrameworks,
      details,
      riskScore: this.getSeverityRiskScore(severity)
    });

    await this.writeAuditEntry(entry);
  }

  /**
   * Logs medical data access (HIPAA compliance)
   */
  async logMedicalDataAccess(
    params: MedicalDataAccessParams,
    securityContext: ISecurityContext
  ): Promise<void> {
    const { patientId, medicalRecordId, action, details } = params;

    const entry = this.createAuditEntry({
      eventType: AuditEventType.DATA_VIEWED,
      userId: securityContext.userId,
      organizationId: securityContext.organizationId,
      sessionId: securityContext.sessionId,
      ipAddress: securityContext.ipAddress,
      userAgent: securityContext.userAgent,
      resource: 'MedicalRecord',
      resourceId: medicalRecordId,
      action,
      outcome: 'success',
      context: ApplicationContext.MEDICAL,
      sensitivityLevel: 'critical',
      complianceFrameworks: [ComplianceFramework.HIPAA, ComplianceFramework.SOX],
      details: {
        ...details,
        patientId: patientId.toHexString(),
        dataType: 'medical'
      },
      riskScore: 9
    });

    await this.writeAuditEntry(entry);
  }

  /**
   * Creates an audit entry
   */
  private createAuditEntry(params: Omit<AuditLogEntry, 'auditId' | 'timestamp'>): AuditLogEntry {
    return {
      auditId: new ObjectId(),
      timestamp: new Date(),
      ...params,
      // Override with provided compliance frameworks if specified, otherwise use defaults
      complianceFrameworks: params.complianceFrameworks || this.defaultComplianceFrameworks
    };
  }

  /**
   * Writes audit entry to storage and logs
   */
  private async writeAuditEntry(entry: AuditLogEntry): Promise<void> {
    try {
      // Store in audit repository
      await this.auditRepository.save(entry);

      // Log to contextual logger
      this.contextualLogger.info('Audit event recorded', {
        auditId: entry.auditId.toHexString(),
        eventType: entry.eventType,
        userId: entry.userId?.toHexString(),
        resource: entry.resource,
        action: entry.action,
        outcome: entry.outcome,
        sensitivityLevel: entry.sensitivityLevel,
        riskScore: entry.riskScore
      });
    } catch (error) {
      // Critical: audit logging failure
      this.contextualLogger.fatal('Failed to write audit entry', error as Error, {
        auditEntry: entry
      });
      throw error;
    }
  }

  /**
   * Gets compliance frameworks based on data sensitivity
   */
  private getComplianceFrameworksForData(sensitivityLevel: SensitivityLevel): ComplianceFramework[] {
    const frameworks: ComplianceFramework[] = [];

    switch (sensitivityLevel) {
      case 'critical':
        frameworks.push(
          ComplianceFramework.HIPAA,
          ComplianceFramework.SOX,
          ComplianceFramework.GDPR,
          ComplianceFramework.ISO27001
        );
        break;
      case 'high':
        frameworks.push(
          ComplianceFramework.GDPR,
          ComplianceFramework.SOX,
          ComplianceFramework.ISO27001
        );
        break;
      case 'medium':
        frameworks.push(ComplianceFramework.GDPR, ComplianceFramework.ISO27001);
        break;
      case 'low':
        frameworks.push(ComplianceFramework.ISO27001);
        break;
    }

    return frameworks;
  }

  /**
   * Calculates risk score based on action and sensitivity
   */
  private calculateRiskScore(action: string, sensitivityLevel: SensitivityLevel): number {
    const baseScores = {
      view: 1,
      download: 3,
      export: 5,
      create: 2,
      update: 4,
      delete: 8
    };

    const sensitivityMultipliers = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4
    };

    const baseScore = baseScores[action as keyof typeof baseScores] || 1;
    const multiplier = sensitivityMultipliers[sensitivityLevel as keyof typeof sensitivityMultipliers] || 1;

    return Math.min(baseScore * multiplier, 10);
  }

  /**
   * Gets risk score based on severity
   */
  private getSeverityRiskScore(severity: SecuritySeverity): number {
    const severityScores = {
      low: 3,
      medium: 5,
      high: 8,
      critical: 10
    };

    return severityScores[severity as keyof typeof severityScores] || 5;
  }
}

/**
 * Audit repository interface
 */
export interface IAuditRepository {
  save(entry: AuditLogEntry): Promise<void>;
  findByUserId(userId: ObjectId, limit?: number): Promise<readonly AuditLogEntry[]>;
  findByResource(resource: string, resourceId: ObjectId): Promise<readonly AuditLogEntry[]>;
  findByTimeRange(startDate: Date, endDate: Date): Promise<readonly AuditLogEntry[]>;
  findSecurityViolations(severity?: string): Promise<readonly AuditLogEntry[]>;
}