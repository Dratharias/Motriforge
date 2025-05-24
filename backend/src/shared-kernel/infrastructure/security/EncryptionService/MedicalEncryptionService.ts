import { ObjectId } from 'mongodb';
import { ContextualLogger } from '../../logging/ContextualLogger';
import { AuditLogger } from '../../logging/AuditLogger';
import { ComplianceFramework } from '@/types/shared/enums/common';
import { EncryptionOperation } from '@/types/security/encryption/enums';
import {
  EncryptionConfig,
  EncryptedData,
  EncryptionContext
} from '@/types/security/encryption/types';
import {
  IKeyManager,
  IComplianceValidator
} from '@/types/security/encryption/interfaces';
import { EncryptionService } from './EncryptionService';
import { MEDICAL_ENCRYPTION_CONFIG } from '@/types/security/encryption/config';

/**
 * Medical-specific encryption context
 */
export interface MedicalEncryptionContext extends EncryptionContext {
  readonly patientId?: ObjectId;
  readonly medicalRecordId?: ObjectId;
  readonly treatmentId?: ObjectId;
  readonly medicalProfessionalId?: ObjectId;
  readonly accessReason: string;
  readonly emergencyAccess?: boolean;
}

/**
 * Medical data encryption service with HIPAA compliance
 */
export class MedicalEncryptionService extends EncryptionService {
  private readonly auditLogger: AuditLogger;

  constructor(
    keyManager: IKeyManager,
    complianceValidator: IComplianceValidator,
    logger: ContextualLogger,
    auditLogger: AuditLogger,
    config: EncryptionConfig = MEDICAL_ENCRYPTION_CONFIG
  ) {
    super(config, keyManager, complianceValidator, logger);
    this.auditLogger = auditLogger;
  }

  /**
   * Encrypts medical data with enhanced auditing
   */
  async encrypt(data: string, context: MedicalEncryptionContext): Promise<EncryptedData> {
    // Validate medical context
    this.validateMedicalContext(context);

    // Enhanced audit logging for medical data
    await this.auditMedicalDataAccess(context, EncryptionOperation.ENCRYPT);

    try {
      const encryptedData = await super.encrypt(data, context);

      // Additional medical-specific metadata
      const enhancedMetadata = {
        ...encryptedData.metadata,
        patientId: context.patientId?.toHexString(),
        medicalRecordId: context.medicalRecordId?.toHexString(),
        treatmentId: context.treatmentId?.toHexString(),
        medicalProfessionalId: context.medicalProfessionalId?.toHexString(),
        accessReason: context.accessReason,
        emergencyAccess: context.emergencyAccess,
        complianceLevel: 'HIPAA_COMPLIANT'
      };

      return {
        ...encryptedData,
        metadata: enhancedMetadata
      };
    } catch (error) {
      // Log encryption failure for audit trail
      await this.auditEncryptionFailure(context, error as Error);
      throw error;
    }
  }

  /**
   * Decrypts medical data with enhanced auditing
   */
  async decrypt(encryptedData: EncryptedData, context: MedicalEncryptionContext): Promise<string> {
    // Validate medical context
    this.validateMedicalContext(context);

    // Enhanced audit logging for medical data
    await this.auditMedicalDataAccess(context, EncryptionOperation.DECRYPT);

    try {
      const decryptedData = await super.decrypt(encryptedData, context);

      // Log successful medical data access
      await this.auditSuccessfulAccess(encryptedData, context);

      return decryptedData;
    } catch (error) {
      // Log decryption failure for audit trail
      await this.auditDecryptionFailure(encryptedData, context, error as Error);
      throw error;
    }
  }

  /**
   * Encrypts medical record with comprehensive logging
   */
  async encryptMedicalRecord<T>(
    medicalRecord: T,
    context: MedicalEncryptionContext
  ): Promise<EncryptedData> {
    const recordJson = JSON.stringify(medicalRecord);
    
    // Add specific medical record metadata
    const enhancedContext: MedicalEncryptionContext = {
      ...context,
      purpose: `medical_record_${context.purpose}`,
      complianceFrameworks: [
        ...context.complianceFrameworks,
        ComplianceFramework.HIPAA
      ]
    };

    return this.encrypt(recordJson, enhancedContext);
  }

  /**
   * Decrypts medical record with access control validation
   */
  async decryptMedicalRecord<T>(
    encryptedData: EncryptedData,
    context: MedicalEncryptionContext
  ): Promise<T> {
    // Validate access permissions for medical records
    await this.validateMedicalRecordAccess(encryptedData, context);

    const recordJson = await this.decrypt(encryptedData, context);
    return JSON.parse(recordJson) as T;
  }

  /**
   * Emergency access decryption with special audit logging
   */
  async emergencyDecrypt(
    encryptedData: EncryptedData,
    context: MedicalEncryptionContext,
    emergencyReason: string
  ): Promise<string> {
    const emergencyContext: MedicalEncryptionContext = {
      ...context,
      emergencyAccess: true,
      accessReason: `EMERGENCY: ${emergencyReason}`,
      complianceFrameworks: [ComplianceFramework.HIPAA]
    };

    // Special audit logging for emergency access
    await this.auditEmergencyAccess(encryptedData, emergencyContext, emergencyReason);

    return this.decrypt(encryptedData, emergencyContext);
  }

  /**
   * Validates medical encryption context
   */
  private validateMedicalContext(context: MedicalEncryptionContext): void {
    if (!context.accessReason) {
      throw new Error('Medical data access requires a valid access reason');
    }

    if (!context.medicalProfessionalId && !context.emergencyAccess) {
      throw new Error('Medical data access requires medical professional identification');
    }

    if (!context.complianceFrameworks.includes(ComplianceFramework.HIPAA)) {
      throw new Error('Medical data encryption must include HIPAA compliance framework');
    }
  }

  /**
   * Validates access to medical records
   */
  private async validateMedicalRecordAccess(
    encryptedData: EncryptedData,
    context: MedicalEncryptionContext
  ): Promise<void> {
    // Check if emergency access is being used
    if (context.emergencyAccess) {
      this.logger.warn('Emergency access to medical data', {
        requestId: context.requestId.toHexString(),
        patientId: context.patientId?.toHexString(),
        medicalProfessionalId: context.medicalProfessionalId?.toHexString(),
        reason: context.accessReason
      });
      return;
    }

    // Validate normal access permissions
    const metadata = encryptedData.metadata;
    if (metadata?.patientId && context.patientId) {
      const encryptedPatientId = metadata.patientId;
      const requestPatientId = context.patientId.toHexString();
      
      if (encryptedPatientId !== requestPatientId) {
        throw new Error('Access denied: Patient ID mismatch');
      }
    }
  }

  /**
   * Audits medical data access for HIPAA compliance
   */
  private async auditMedicalDataAccess(
    context: MedicalEncryptionContext,
    operation: EncryptionOperation
  ): Promise<void> {
    const securityContext = {
      userId: context.userId,
      organizationId: context.organizationId,
      sessionId: context.requestId.toHexString(),
      ipAddress: '0.0.0.0', // This should come from the request
      userAgent: 'medical-encryption-service'
    };

    await this.auditLogger.logMedicalDataAccess(
      {
        patientId: context.patientId || new ObjectId(),
        medicalRecordId: context.medicalRecordId || new ObjectId(),
        action: operation,
        details: {
          purpose: context.purpose,
          accessReason: context.accessReason,
          emergencyAccess: context.emergencyAccess,
          medicalProfessionalId: context.medicalProfessionalId?.toHexString()
        }
      },
      securityContext as any
    );
  }

  /**
   * Audits successful medical data access
   */
  private async auditSuccessfulAccess(
    encryptedData: EncryptedData,
    context: MedicalEncryptionContext
  ): Promise<void> {
    this.logger.info('Medical data access successful', {
      requestId: context.requestId.toHexString(),
      keyId: encryptedData.keyId.toHexString(),
      patientId: context.patientId?.toHexString(),
      medicalProfessionalId: context.medicalProfessionalId?.toHexString(),
      accessReason: context.accessReason,
      emergencyAccess: context.emergencyAccess,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Audits emergency access to medical data
   */
  private async auditEmergencyAccess(
    encryptedData: EncryptedData,
    context: MedicalEncryptionContext,
    emergencyReason: string
  ): Promise<void> {
    this.logger.warn('Emergency access to medical data', {
      requestId: context.requestId.toHexString(),
      keyId: encryptedData.keyId.toHexString(),
      patientId: context.patientId?.toHexString(),
      medicalProfessionalId: context.medicalProfessionalId?.toHexString(),
      emergencyReason,
      accessReason: context.accessReason,
      timestamp: new Date().toISOString(),
      requiresReview: true
    });

    // Additional alert for emergency access
    this.logger.security('medical_emergency_access', 'high', {
      patientId: context.patientId?.toHexString(),
      emergencyReason,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Audits encryption failures
   */
  private async auditEncryptionFailure(
    context: MedicalEncryptionContext,
    error: Error
  ): Promise<void> {
    this.logger.error('Medical data encryption failed', error, {
      requestId: context.requestId.toHexString(),
      patientId: context.patientId?.toHexString(),
      medicalProfessionalId: context.medicalProfessionalId?.toHexString(),
      purpose: context.purpose,
      accessReason: context.accessReason
    });
  }

  /**
   * Audits decryption failures
   */
  private async auditDecryptionFailure(
    encryptedData: EncryptedData,
    context: MedicalEncryptionContext,
    error: Error
  ): Promise<void> {
    this.logger.error('Medical data decryption failed', error, {
      requestId: context.requestId.toHexString(),
      keyId: encryptedData.keyId.toHexString(),
      patientId: context.patientId?.toHexString(),
      medicalProfessionalId: context.medicalProfessionalId?.toHexString(),
      accessReason: context.accessReason
    });
  }
}