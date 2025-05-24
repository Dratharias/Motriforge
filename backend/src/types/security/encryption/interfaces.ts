import { ObjectId } from 'mongodb';
import { DataClassification } from '@/types/shared/enums/common';
import {
  EncryptedData,
  EncryptionContext,
  EncryptionKeyMetadata,
  KeyRotationResult,
  ComplianceValidationResult,
  KeyUsageValidationResult
} from './types';

/**
 * Core encryption service interface
 */
export interface IEncryptionService {
  encrypt(data: string, context: EncryptionContext): Promise<EncryptedData>;
  decrypt(encryptedData: EncryptedData, context: EncryptionContext): Promise<string>;
  encryptObject<T>(obj: T, context: EncryptionContext): Promise<EncryptedData>;
  decryptObject<T>(encryptedData: EncryptedData, context: EncryptionContext): Promise<T>;
  rotateKey(keyId: ObjectId): Promise<KeyRotationResult>;
  generateDataKey(purpose: string, classification: DataClassification): Promise<EncryptionKeyMetadata>;
  validateEncryptedData(encryptedData: EncryptedData): Promise<boolean>;
}

/**
 * Key management interface
 */
export interface IKeyManager {
  generateKey(purpose: string, classification: DataClassification): Promise<EncryptionKeyMetadata>;
  getKey(keyId: ObjectId): Promise<Buffer | null>;
  rotateKey(keyId: ObjectId): Promise<KeyRotationResult>;
  deactivateKey(keyId: ObjectId): Promise<void>;
  getActiveKeys(): Promise<readonly EncryptionKeyMetadata[]>;
  scheduleKeyRotation(keyId: ObjectId, rotationDate: Date): Promise<void>;
}

/**
 * Compliance validator interface
 */
export interface IComplianceValidator {
  validateEncryption(
    data: EncryptedData,
    context: EncryptionContext
  ): Promise<ComplianceValidationResult>;
  
  validateKeyUsage(
    keyMetadata: EncryptionKeyMetadata,
    context: EncryptionContext
  ): Promise<KeyUsageValidationResult>;
}

/**
 * Field-level encryption interface
 */
export interface IFieldLevelEncryption {
  encryptFields<T extends Record<string, any>>(
    obj: T,
    fieldsToEncrypt: readonly (keyof T)[],
    context: EncryptionContext
  ): Promise<T>;

  decryptFields<T extends Record<string, any>>(
    obj: T,
    fieldsToDecrypt: readonly (keyof T)[],
    context: EncryptionContext
  ): Promise<T>;
}

/**
 * Encryption audit logger interface
 */
export interface IEncryptionAuditLogger {
  logEncryptionOperation(
    operation: string,
    encryptedData: EncryptedData,
    context: EncryptionContext
  ): Promise<void>;

  logKeyOperation(
    operation: string,
    keyMetadata: EncryptionKeyMetadata,
    context: EncryptionContext
  ): Promise<void>;

  logComplianceValidation(
    result: ComplianceValidationResult,
    context: EncryptionContext
  ): Promise<void>;
}