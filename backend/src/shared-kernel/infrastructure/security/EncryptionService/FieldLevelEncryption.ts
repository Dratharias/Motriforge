import { ContextualLogger } from '../../logging/ContextualLogger';
import {
  EncryptedData,
  EncryptionContext
} from '@/types/security/encryption/types';
import {
  IEncryptionService,
  IFieldLevelEncryption
} from '@/types/security/encryption/interfaces';

/**
 * Field encryption configuration
 */
export interface FieldEncryptionConfig {
  readonly fieldsToEncrypt: readonly string[];
  readonly preserveNullValues: boolean;
  readonly encryptEmptyStrings: boolean;
  readonly customPurposePrefix?: string;
}

/**
 * Field encryption result
 */
export interface FieldEncryptionResult<T> {
  readonly data: T;
  readonly encryptedFields: readonly string[];
  readonly errors: readonly { field: string; error: string }[];
}

/**
 * Field-level encryption utility for selective encryption
 */
export class FieldLevelEncryption implements IFieldLevelEncryption {
  private readonly encryptionService: IEncryptionService;
  private readonly logger: ContextualLogger;

  constructor(encryptionService: IEncryptionService, logger: ContextualLogger) {
    this.encryptionService = encryptionService;
    this.logger = logger;
  }

  /**
   * Encrypts specific fields in an object
   */
  async encryptFields<T extends Record<string, any>>(
    obj: T,
    fieldsToEncrypt: readonly (keyof T)[],
    context: EncryptionContext
  ): Promise<T> {
    const result = await this.encryptFieldsWithResult(obj, fieldsToEncrypt, context);
    
    if (result.errors.length > 0) {
      this.logger.warn('Field encryption completed with errors', {
        requestId: context.requestId.toHexString(),
        errors: result.errors,
        encryptedFields: result.encryptedFields
      });
    }

    return result.data;
  }

  /**
   * Encrypts specific fields in an object with detailed results
   */
  async encryptFieldsWithResult<T extends Record<string, any>>(
    obj: T,
    fieldsToEncrypt: readonly (keyof T)[],
    context: EncryptionContext,
    config?: Partial<FieldEncryptionConfig>
  ): Promise<FieldEncryptionResult<T>> {
    const startTime = Date.now();
    const result = { ...obj };
    const encryptedFields: string[] = [];
    const errors: { field: string; error: string }[] = [];

    this.logger.startOperation('field-level-encryption', {
      requestId: context.requestId.toHexString(),
      fieldsToEncrypt: fieldsToEncrypt.map(f => String(f)),
      totalFields: fieldsToEncrypt.length
    });

    for (const field of fieldsToEncrypt) {
      try {
        const fieldValue = obj[field];
        
        // Skip encryption based on configuration
        if (this.shouldSkipField(fieldValue, config)) {
          continue;
        }

        const serializedValue = this.serializeFieldValue(fieldValue);
        const fieldContext = this.createFieldContext(context, String(field), config);
        
        const encrypted = await this.encryptionService.encrypt(serializedValue, fieldContext);
        result[field] = encrypted as any;
        encryptedFields.push(String(field));

        this.logger.debug('Field encrypted successfully', {
          field: String(field),
          originalType: typeof fieldValue,
          requestId: context.requestId.toHexString()
        });
      } catch (error) {
        const err = error as Error;
        errors.push({
          field: String(field),
          error: err.message
        });

        this.logger.error(`Failed to encrypt field: ${String(field)}`, err, {
          requestId: context.requestId.toHexString(),
          field: String(field)
        });
      }
    }

    const duration = Date.now() - startTime;
    this.logger.completeOperation('field-level-encryption', duration, {
      requestId: context.requestId.toHexString(),
      encryptedFields: encryptedFields.length,
      errors: errors.length,
      totalFields: fieldsToEncrypt.length
    });

    return {
      data: result,
      encryptedFields,
      errors
    };
  }

  /**
   * Decrypts specific fields in an object
   */
  async decryptFields<T extends Record<string, any>>(
    obj: T,
    fieldsToDecrypt: readonly (keyof T)[],
    context: EncryptionContext
  ): Promise<T> {
    const result = await this.decryptFieldsWithResult(obj, fieldsToDecrypt, context);
    
    if (result.errors.length > 0) {
      this.logger.warn('Field decryption completed with errors', {
        requestId: context.requestId.toHexString(),
        errors: result.errors,
        decryptedFields: result.encryptedFields
      });
    }

    return result.data;
  }

  /**
   * Decrypts specific fields in an object with detailed results
   */
  async decryptFieldsWithResult<T extends Record<string, any>>(
    obj: T,
    fieldsToDecrypt: readonly (keyof T)[],
    context: EncryptionContext
  ): Promise<FieldEncryptionResult<T>> {
    const startTime = Date.now();
    const result = { ...obj };
    const decryptedFields: string[] = [];
    const errors: { field: string; error: string }[] = [];

    this.logger.startOperation('field-level-decryption', {
      requestId: context.requestId.toHexString(),
      fieldsToDecrypt: fieldsToDecrypt.map(f => String(f)),
      totalFields: fieldsToDecrypt.length
    });

    for (const field of fieldsToDecrypt) {
      try {
        const fieldValue = obj[field];
        
        if (!this.isEncryptedData(fieldValue)) {
          this.logger.debug('Field is not encrypted data, skipping', {
            field: String(field),
            requestId: context.requestId.toHexString()
          });
          continue;
        }

        const encrypted = fieldValue as EncryptedData;
        const fieldContext = this.createFieldContext(context, String(field));
        
        const decrypted = await this.encryptionService.decrypt(encrypted, fieldContext);
        const deserializedValue = this.deserializeFieldValue(decrypted);
        
        result[field] = deserializedValue;
        decryptedFields.push(String(field));

        this.logger.debug('Field decrypted successfully', {
          field: String(field),
          keyId: encrypted.keyId.toHexString(),
          requestId: context.requestId.toHexString()
        });
      } catch (error) {
        const err = error as Error;
        errors.push({
          field: String(field),
          error: err.message
        });

        this.logger.error(`Failed to decrypt field: ${String(field)}`, err, {
          requestId: context.requestId.toHexString(),
          field: String(field)
        });
      }
    }

    const duration = Date.now() - startTime;
    this.logger.completeOperation('field-level-decryption', duration, {
      requestId: context.requestId.toHexString(),
      decryptedFields: decryptedFields.length,
      errors: errors.length,
      totalFields: fieldsToDecrypt.length
    });

    return {
      data: result,
      encryptedFields: decryptedFields,
      errors
    };
  }

  /**
   * Encrypts all fields matching a pattern
   */
  async encryptFieldsByPattern<T extends Record<string, any>>(
    obj: T,
    pattern: RegExp,
    context: EncryptionContext,
    config?: Partial<FieldEncryptionConfig>
  ): Promise<T> {
    const matchingFields = Object.keys(obj).filter(key => pattern.test(key)) as (keyof T)[];
    return this.encryptFields(obj, matchingFields, context);
  }

  /**
   * Decrypts all fields matching a pattern
   */
  async decryptFieldsByPattern<T extends Record<string, any>>(
    obj: T,
    pattern: RegExp,
    context: EncryptionContext
  ): Promise<T> {
    const matchingFields = Object.keys(obj).filter(key => pattern.test(key)) as (keyof T)[];
    return this.decryptFields(obj, matchingFields, context);
  }

  /**
   * Checks if all specified fields are encrypted
   */
  areFieldsEncrypted<T extends Record<string, any>>(
    obj: T,
    fields: readonly (keyof T)[]
  ): boolean {
    return fields.every(field => this.isEncryptedData(obj[field]));
  }

  /**
   * Gets all encrypted field names in an object
   */
  getEncryptedFields<T extends Record<string, any>>(obj: T): readonly string[] {
    return Object.keys(obj).filter(key => this.isEncryptedData(obj[key]));
  }

  /**
   * Creates field-specific encryption context
   */
  private createFieldContext(
    baseContext: EncryptionContext,
    fieldName: string,
    config?: Partial<FieldEncryptionConfig>
  ): EncryptionContext {
    const purposePrefix = config?.customPurposePrefix ?? 'field';
    return {
      ...baseContext,
      purpose: `${purposePrefix}_${fieldName}_${baseContext.purpose}`
    };
  }

  /**
   * Serializes field value for encryption
   */
  private serializeFieldValue(value: any): string {
    if (typeof value === 'string') {
      return value;
    }
    return JSON.stringify(value);
  }

  /**
   * Deserializes field value after decryption
   */
  private deserializeFieldValue(value: string): any {
    // Try to parse as JSON, fallback to string
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  /**
   * Checks if a field should be skipped during encryption
   */
  private shouldSkipField(
    value: any,
    config?: Partial<FieldEncryptionConfig>
  ): boolean {
    const preserveNullValues = config?.preserveNullValues ?? true;
    const encryptEmptyStrings = config?.encryptEmptyStrings ?? false;

    if (value === null || value === undefined) {
      return preserveNullValues;
    }

    if (typeof value === 'string' && value === '' && !encryptEmptyStrings) {
      return true;
    }

    return false;
  }

  /**
   * Checks if a value is encrypted data
   */
  private isEncryptedData(value: any): value is EncryptedData {
    return (
      value &&
      typeof value === 'object' &&
      'keyId' in value &&
      'algorithm' in value &&
      'ciphertext' in value &&
      'iv' in value &&
      'tag' in value
    );
  }
}