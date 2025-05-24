import { ComplianceFramework } from '@/types/shared/enums/common';
import { EncryptionAlgorithm, KeyDerivationFunction } from '@/types/security/encryption/enums';
import { EncryptionConfig } from '@/types/security/encryption/types';

/**
 * Default encryption configuration for medical data
 */
export const MEDICAL_ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: EncryptionAlgorithm.AES_256_GCM,
  keyDerivationFunction: KeyDerivationFunction.PBKDF2,
  keySize: 32, // 256 bits
  ivSize: 16, // 128 bits
  tagSize: 16, // 128 bits
  saltSize: 32, // 256 bits
  iterations: 100000,
  enableKeyRotation: true,
  keyRotationIntervalDays: 90,
  complianceFrameworks: [ComplianceFramework.HIPAA, ComplianceFramework.GDPR]
};

/**
 * Standard encryption configuration for general data
 */
export const STANDARD_ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: EncryptionAlgorithm.AES_256_GCM,
  keyDerivationFunction: KeyDerivationFunction.PBKDF2,
  keySize: 32,
  ivSize: 16,
  tagSize: 16,
  saltSize: 32,
  iterations: 50000,
  enableKeyRotation: true,
  keyRotationIntervalDays: 180,
  complianceFrameworks: [ComplianceFramework.GDPR, ComplianceFramework.ISO27001]
};

/**
 * High-performance encryption configuration for less sensitive data
 */
export const PERFORMANCE_ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: EncryptionAlgorithm.ChaCha20_Poly1305,
  keyDerivationFunction: KeyDerivationFunction.SCRYPT,
  keySize: 32,
  ivSize: 12,
  tagSize: 16,
  saltSize: 16,
  iterations: 32768,
  enableKeyRotation: true,
  keyRotationIntervalDays: 365,
  complianceFrameworks: [ComplianceFramework.ISO27001]
};

/**
 * Encryption algorithm specifications
 */
export const ALGORITHM_SPECS = {
  [EncryptionAlgorithm.AES_256_GCM]: {
    keySize: 32,
    ivSize: 16,
    tagSize: 16,
    nodeAlgorithm: 'aes-256-gcm'
  },
  [EncryptionAlgorithm.AES_256_CBC]: {
    keySize: 32,
    ivSize: 16,
    tagSize: 0,
    nodeAlgorithm: 'aes-256-cbc'
  },
  [EncryptionAlgorithm.ChaCha20_Poly1305]: {
    keySize: 32,
    ivSize: 12,
    tagSize: 16,
    nodeAlgorithm: 'chacha20-poly1305'
  }
} as const;

/**
 * Key derivation function specifications
 */
export const KDF_SPECS = {
  [KeyDerivationFunction.PBKDF2]: {
    hashFunction: 'sha256',
    defaultIterations: 100000
  },
  [KeyDerivationFunction.SCRYPT]: {
    N: 32768,
    r: 8,
    p: 1
  },
  [KeyDerivationFunction.ARGON2]: {
    type: 'argon2id',
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4
  }
} as const;