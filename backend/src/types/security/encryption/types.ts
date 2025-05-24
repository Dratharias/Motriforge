import { ObjectId } from 'mongodb';
import { ComplianceFramework, DataClassification } from '@/types/shared/enums/common';
import { EncryptionAlgorithm, KeyDerivationFunction, KeyRotationStatus } from './enums';

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  readonly algorithm: EncryptionAlgorithm;
  readonly keyDerivationFunction: KeyDerivationFunction;
  readonly keySize: number;
  readonly ivSize: number;
  readonly tagSize: number;
  readonly saltSize: number;
  readonly iterations: number;
  readonly enableKeyRotation: boolean;
  readonly keyRotationIntervalDays: number;
  readonly complianceFrameworks: readonly ComplianceFramework[];
}

/**
 * Encryption key metadata
 */
export interface EncryptionKeyMetadata {
  readonly keyId: ObjectId;
  readonly version: number;
  readonly algorithm: EncryptionAlgorithm;
  readonly createdAt: Date;
  readonly expiresAt?: Date;
  readonly isActive: boolean;
  readonly complianceLevel: DataClassification;
  readonly purpose: string;
  readonly rotationSchedule?: Date;
}

/**
 * Encrypted data envelope
 */
export interface EncryptedData {
  readonly keyId: ObjectId;
  readonly algorithm: EncryptionAlgorithm;
  readonly ciphertext: string;
  readonly iv: string;
  readonly tag: string;
  readonly salt: string;
  readonly version: number;
  readonly encryptedAt: Date;
  readonly metadata?: Record<string, any>;
}

/**
 * Encryption context for auditing and compliance
 */
export interface EncryptionContext {
  readonly requestId: ObjectId;
  readonly userId?: ObjectId;
  readonly organizationId?: ObjectId;
  readonly dataClassification: DataClassification;
  readonly purpose: string;
  readonly complianceFrameworks: readonly ComplianceFramework[];
  readonly retentionPeriod?: number;
}

/**
 * Key rotation result
 */
export interface KeyRotationResult {
  readonly previousKeyId: ObjectId;
  readonly newKeyId: ObjectId;
  readonly rotatedAt: Date;
  readonly affectedRecords: number;
  readonly migrationStatus: KeyRotationStatus;
  readonly errors?: readonly string[];
}

/**
 * Encryption performance metrics
 */
export interface EncryptionMetrics {
  readonly operationType: string;
  readonly duration: number;
  readonly dataSize: number;
  readonly keyId: string;
  readonly algorithm: EncryptionAlgorithm;
  readonly timestamp: Date;
}

/**
 * Compliance validation result
 */
export interface ComplianceValidationResult {
  readonly compliant: boolean;
  readonly violations: readonly string[];
  readonly framework: ComplianceFramework;
  readonly validatedAt: Date;
}

/**
 * Key usage validation result
 */
export interface KeyUsageValidationResult {
  readonly valid: boolean;
  readonly issues: readonly string[];
  readonly validatedAt: Date;
}