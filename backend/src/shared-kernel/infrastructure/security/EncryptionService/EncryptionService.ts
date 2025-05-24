import { ObjectId } from 'mongodb';
import * as crypto from 'crypto';
import { ContextualLogger } from '../../logging/ContextualLogger';
import { DataClassification } from '@/types/shared/enums/common';
import { 
  EncryptionAlgorithm, 
  KeyDerivationFunction,
  EncryptionOperation 
} from '@/types/security/encryption/enums';
import {
  EncryptionConfig,
  EncryptedData,
  EncryptionContext,
  EncryptionKeyMetadata,
  KeyRotationResult,
  EncryptionMetrics
} from '@/types/security/encryption/types';
import {
  IEncryptionService,
  IKeyManager,
  IComplianceValidator
} from '@/types/security/encryption/interfaces';
import { ALGORITHM_SPECS, KDF_SPECS } from '@/types/security/encryption/config';

/**
 * Core encryption service implementation
 */
export class EncryptionService implements IEncryptionService {
  protected readonly config: EncryptionConfig;
  protected readonly keyManager: IKeyManager;
  protected readonly complianceValidator: IComplianceValidator;
  protected readonly logger: ContextualLogger;

  constructor(
    config: EncryptionConfig,
    keyManager: IKeyManager,
    complianceValidator: IComplianceValidator,
    logger: ContextualLogger
  ) {
    this.config = config;
    this.keyManager = keyManager;
    this.complianceValidator = complianceValidator;
    this.logger = logger;
  }

  /**
   * Encrypts string data
   */
  async encrypt(data: string, context: EncryptionContext): Promise<EncryptedData> {
    const startTime = Date.now();
    const requestId = context.requestId;

    this.logger.startOperation('encrypt-data', {
      requestId: requestId.toHexString(),
      dataClassification: context.dataClassification,
      purpose: context.purpose,
      dataSize: data.length
    });

    try {
      // Validate input
      this.validateInputData(data);

      // Get or generate encryption key
      const keyMetadata = await this.getOrGenerateKey(context);
      const masterKey = await this.keyManager.getKey(keyMetadata.keyId);
      
      if (!masterKey) {
        throw new Error(`Encryption key ${keyMetadata.keyId.toHexString()} not found`);
      }

      // Generate cryptographic components
      const iv = this.generateRandomBytes(this.config.ivSize);
      const salt = this.generateRandomBytes(this.config.saltSize);
      
      // Derive key from master key using salt
      const derivedKey = await this.deriveKey(masterKey, salt);
      
      // Encrypt data
      const encrypted = await this.performEncryption(data, derivedKey, iv);
      
      const encryptedData: EncryptedData = {
        keyId: keyMetadata.keyId,
        algorithm: this.config.algorithm,
        ciphertext: encrypted.ciphertext,
        iv: iv.toString('base64'),
        tag: encrypted.tag,
        salt: salt.toString('base64'),
        version: keyMetadata.version,
        encryptedAt: new Date(),
        metadata: {
          purpose: context.purpose,
          dataClassification: context.dataClassification,
          complianceFrameworks: context.complianceFrameworks,
          requestId: requestId.toHexString()
        }
      };

      // Validate compliance
      const complianceResult = await this.complianceValidator.validateEncryption(
        encryptedData,
        context
      );

      if (!complianceResult.compliant) {
        throw new Error(`Encryption does not meet compliance requirements: ${complianceResult.violations.join(', ')}`);
      }

      const duration = Date.now() - startTime;
      this.logger.completeOperation('encrypt-data', duration, {
        requestId: requestId.toHexString(),
        keyId: keyMetadata.keyId.toHexString(),
        algorithm: this.config.algorithm,
        originalSize: data.length,
        encryptedSize: encryptedData.ciphertext.length
      });

      // Record metrics
      this.recordMetrics({
        operationType: EncryptionOperation.ENCRYPT,
        duration,
        dataSize: data.length,
        keyId: keyMetadata.keyId.toHexString(),
        algorithm: this.config.algorithm,
        timestamp: new Date()
      });

      return encryptedData;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.failOperation('encrypt-data', error as Error, duration, {
        requestId: requestId.toHexString(),
        purpose: context.purpose
      });
      throw error;
    }
  }

  /**
   * Decrypts string data
   */
  async decrypt(encryptedData: EncryptedData, context: EncryptionContext): Promise<string> {
    const startTime = Date.now();
    const requestId = context.requestId;

    this.logger.startOperation('decrypt-data', {
      requestId: requestId.toHexString(),
      keyId: encryptedData.keyId.toHexString(),
      algorithm: encryptedData.algorithm,
      version: encryptedData.version
    });

    try {
      // Validate encrypted data
      const isValid = await this.validateEncryptedData(encryptedData);
      if (!isValid) {
        throw new Error('Invalid encrypted data format or integrity check failed');
      }

      // Get decryption key
      const masterKey = await this.keyManager.getKey(encryptedData.keyId);
      if (!masterKey) {
        throw new Error(`Decryption key ${encryptedData.keyId.toHexString()} not found`);
      }

      // Parse components
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const salt = Buffer.from(encryptedData.salt, 'base64');
      
      // Derive key
      const derivedKey = await this.deriveKey(masterKey, salt);
      
      // Decrypt data
      const decryptedData = await this.performDecryption(
        encryptedData.ciphertext,
        derivedKey,
        iv,
        encryptedData.tag
      );

      const duration = Date.now() - startTime;
      this.logger.completeOperation('decrypt-data', duration, {
        requestId: requestId.toHexString(),
        keyId: encryptedData.keyId.toHexString(),
        decryptedSize: decryptedData.length
      });

      // Record metrics
      this.recordMetrics({
        operationType: EncryptionOperation.DECRYPT,
        duration,
        dataSize: decryptedData.length,
        keyId: encryptedData.keyId.toHexString(),
        algorithm: encryptedData.algorithm,
        timestamp: new Date()
      });

      return decryptedData;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.failOperation('decrypt-data', error as Error, duration, {
        requestId: requestId.toHexString(),
        keyId: encryptedData.keyId.toHexString()
      });
      throw error;
    }
  }

  /**
   * Encrypts object data
   */
  async encryptObject<T>(obj: T, context: EncryptionContext): Promise<EncryptedData> {
    const jsonString = JSON.stringify(obj);
    return this.encrypt(jsonString, context);
  }

  /**
   * Decrypts object data
   */
  async decryptObject<T>(encryptedData: EncryptedData, context: EncryptionContext): Promise<T> {
    const jsonString = await this.decrypt(encryptedData, context);
    return JSON.parse(jsonString) as T;
  }

  /**
   * Rotates encryption key
   */
  async rotateKey(keyId: ObjectId): Promise<KeyRotationResult> {
    this.logger.startOperation('rotate-key', {
      keyId: keyId.toHexString()
    });

    try {
      const result = await this.keyManager.rotateKey(keyId);
      
      this.logger.completeOperation('rotate-key', 0, {
        previousKeyId: result.previousKeyId.toHexString(),
        newKeyId: result.newKeyId.toHexString(),
        affectedRecords: result.affectedRecords,
        status: result.migrationStatus
      });

      return result;
    } catch (error) {
      this.logger.failOperation('rotate-key', error as Error, 0, {
        keyId: keyId.toHexString()
      });
      throw error;
    }
  }

  /**
   * Generates a data encryption key
   */
  async generateDataKey(purpose: string, classification: DataClassification): Promise<EncryptionKeyMetadata> {
    return this.keyManager.generateKey(purpose, classification);
  }

  /**
   * Validates encrypted data integrity and format
   */
  async validateEncryptedData(encryptedData: EncryptedData): Promise<boolean> {
    try {
      // Check required fields
      if (!encryptedData.keyId || !encryptedData.ciphertext || !encryptedData.iv || !encryptedData.tag) {
        return false;
      }

      // Validate algorithm
      if (!Object.values(EncryptionAlgorithm).includes(encryptedData.algorithm)) {
        return false;
      }

      // Validate base64 encoding
      try {
        Buffer.from(encryptedData.iv, 'base64');
        Buffer.from(encryptedData.salt, 'base64');
      } catch {
        return false;
      }

      // Additional integrity checks could be performed here
      return true;
    } catch (error) {
      this.logger.warn('Encrypted data validation failed', {
        error: (error as Error).message,
        keyId: encryptedData.keyId?.toHexString()
      });
      return false;
    }
  }

  /**
   * Validates input data before encryption
   */
  protected validateInputData(data: string): void {
    if (!data || data.length === 0) {
      throw new Error('Data to encrypt cannot be empty');
    }

    // Add additional validation as needed
    if (data.length > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('Data too large for encryption');
    }
  }

  /**
   * Gets or generates appropriate encryption key
   */
  protected async getOrGenerateKey(context: EncryptionContext): Promise<EncryptionKeyMetadata> {
    // For this implementation, we'll generate a new key
    // In a real system, you might cache or reuse keys based on context
    return this.keyManager.generateKey(context.purpose, context.dataClassification);
  }

  /**
   * Derives encryption key from master key using salt
   */
  protected async deriveKey(masterKey: Buffer, salt: Buffer): Promise<Buffer> {
    switch (this.config.keyDerivationFunction) {
      case KeyDerivationFunction.PBKDF2: {
        const spec = KDF_SPECS[KeyDerivationFunction.PBKDF2];
        return new Promise((resolve, reject) => {
          crypto.pbkdf2(
            masterKey, 
            salt, 
            this.config.iterations, 
            this.config.keySize, 
            spec.hashFunction, 
            (err, derivedKey) => {
              if (err) reject(err);
              else resolve(derivedKey);
            }
          );
        });
      }

      case KeyDerivationFunction.SCRYPT: {
        const spec = KDF_SPECS[KeyDerivationFunction.SCRYPT];
        return new Promise((resolve, reject) => {
          crypto.scrypt(
            masterKey, 
            salt, 
            this.config.keySize, 
            { 
              N: spec.N, 
              r: spec.r, 
              p: spec.p 
            }, 
            (err, derivedKey) => {
              if (err) reject(err);
              else resolve(derivedKey);
            }
          );
        });
      }
      
      default:
        throw new Error(`Unsupported key derivation function: ${this.config.keyDerivationFunction}`);
    }
  }

  /**
   * Performs actual encryption using the specified algorithm
   */
  protected async performEncryption(
    data: string,
    key: Buffer,
    iv: Buffer
  ): Promise<{ ciphertext: string; tag: string }> {
    const algorithmSpec = ALGORITHM_SPECS[this.config.algorithm];
    
    switch (this.config.algorithm) {
      case EncryptionAlgorithm.AES_256_GCM:
      case EncryptionAlgorithm.ChaCha20_Poly1305:
        return this.performAuthenticatedEncryption(algorithmSpec.nodeAlgorithm, data, key, iv);
      
      case EncryptionAlgorithm.AES_256_CBC:
        return this.performNonAuthenticatedEncryption(algorithmSpec.nodeAlgorithm, data, key, iv);
      
      default:
        throw new Error(`Unsupported encryption algorithm: ${this.config.algorithm}`);
    }
  }

  /**
   * Performs actual decryption using the specified algorithm
   */
  protected async performDecryption(
    ciphertext: string,
    key: Buffer,
    iv: Buffer,
    tag: string
  ): Promise<string> {
    const algorithmSpec = ALGORITHM_SPECS[this.config.algorithm];
    
    switch (this.config.algorithm) {
      case EncryptionAlgorithm.AES_256_GCM:
      case EncryptionAlgorithm.ChaCha20_Poly1305:
        return this.performAuthenticatedDecryption(algorithmSpec.nodeAlgorithm, ciphertext, key, iv, tag);
      
      case EncryptionAlgorithm.AES_256_CBC:
        return this.performNonAuthenticatedDecryption(algorithmSpec.nodeAlgorithm, ciphertext, key, iv);
      
      default:
        throw new Error(`Unsupported encryption algorithm: ${this.config.algorithm}`);
    }
  }

  /**
   * Performs authenticated encryption (GCM, ChaCha20-Poly1305)
   */
  private performAuthenticatedEncryption(
    algorithm: string,
    data: string,
    key: Buffer,
    iv: Buffer
  ): { ciphertext: string; tag: string } {
    const cipher = crypto.createCipheriv(algorithm, key, iv) as crypto.CipherGCM;
    let ciphertext = cipher.update(data, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    const tag = cipher.getAuthTag().toString('base64');
    return { ciphertext, tag };
  }

  /**
   * Performs authenticated decryption (GCM, ChaCha20-Poly1305)
   */
  private performAuthenticatedDecryption(
    algorithm: string,
    ciphertext: string,
    key: Buffer,
    iv: Buffer,
    tag: string
  ): string {
    const decipher = crypto.createDecipheriv(algorithm, key, iv) as crypto.DecipherGCM;
    if (tag) {
      decipher.setAuthTag(Buffer.from(tag, 'base64'));
    }
    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Performs non-authenticated encryption (CBC)
   */
  private performNonAuthenticatedEncryption(
    algorithm: string,
    data: string,
    key: Buffer,
    iv: Buffer
  ): { ciphertext: string; tag: string } {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let ciphertext = cipher.update(data, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    return { ciphertext, tag: '' };
  }

  /**
   * Performs non-authenticated decryption (CBC)
   */
  private performNonAuthenticatedDecryption(
    algorithm: string,
    ciphertext: string,
    key: Buffer,
    iv: Buffer
  ): string {
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Generates cryptographically secure random bytes
   */
  protected generateRandomBytes(size: number): Buffer {
    return crypto.randomBytes(size);
  }

  /**
   * Records encryption metrics
   */
  protected recordMetrics(metrics: EncryptionMetrics): void {
    this.logger.performance(
      `encryption_${metrics.operationType}`,
      metrics.duration,
      'ms',
      {
        dataSize: metrics.dataSize,
        keyId: metrics.keyId,
        algorithm: metrics.algorithm
      }
    );
  }
}