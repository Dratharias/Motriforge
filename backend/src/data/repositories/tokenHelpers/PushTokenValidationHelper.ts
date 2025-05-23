import { ValidationResult } from '@/types/repositories';
import { ValidationHelpers } from '../helpers';
import { IPushToken } from '@/types/repositories/tokens';
import { LoggerFacade } from '@/core/logging';

/**
 * Validation helper for push token operations
 */
export class PushTokenValidationHelper {
  /**
   * Validate complete push token data
   */
  public static validateData(data: Partial<IPushToken>): ValidationResult {
    const validationResults = [
      this.validateToken(data.token),
      this.validateDeviceType(data.deviceType),
      this.validatePlatform(data.platform),
      this.validateDeviceId(data.deviceId),
      this.validateNotificationPreferences(data.notificationPreferences),
      this.validateExpiration(data.expiresAt),
      this.validateMetadata(data.metadata)
    ];

    return ValidationHelpers.combineValidationResults(...validationResults);
  }

  /**
   * Validate token string
   */
  public static validateToken(token?: string): ValidationResult {
    if (token === undefined) {
      return { valid: true };
    }

    const tokenValidation = ValidationHelpers.validateFieldLength(token, 'token', 10, 4096);
    if (!tokenValidation.valid) {
      return tokenValidation;
    }

    // Additional token format validation
    const errors: string[] = [];
    
    // Check for valid characters (base64, hex, etc.)
    if (!/^[A-Za-z0-9+/=_-]+$/.test(token)) {
      errors.push('Token contains invalid characters');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate device type
   */
  public static validateDeviceType(deviceType?: string): ValidationResult {
    if (deviceType === undefined) {
      return { valid: true };
    }

    return ValidationHelpers.validateEnum(
      deviceType, 
      { ios: 'ios', android: 'android', web: 'web' }, 
      'deviceType'
    );
  }

  /**
   * Validate platform
   */
  public static validatePlatform(platform?: string): ValidationResult {
    if (platform === undefined) {
      return { valid: true };
    }

    return ValidationHelpers.validateEnum(
      platform, 
      { ios: 'ios', android: 'android', web: 'web', desktop: 'desktop' }, 
      'platform'
    );
  }

  /**
   * Validate device ID
   */
  public static validateDeviceId(deviceId?: string): ValidationResult {
    if (deviceId === undefined) {
      return { valid: true };
    }

    return ValidationHelpers.validateFieldLength(deviceId, 'deviceId', 1, 255);
  }

  /**
   * Validate notification preferences
   */
  public static validateNotificationPreferences(
    preferences?: IPushToken['notificationPreferences']
  ): ValidationResult {
    if (preferences === undefined) {
      return { valid: true };
    }

    const errors: string[] = [];

    if (typeof preferences !== 'object' || preferences === null) {
      errors.push('Notification preferences must be an object');
      return { valid: false, errors };
    }

    const requiredBooleanFields = [
      'workoutReminders', 
      'achievements', 
      'messages', 
      'systemNotifications'
    ];

    requiredBooleanFields.forEach(field => {
      const value = (preferences as any)[field];
      if (value !== undefined && typeof value !== 'boolean') {
        errors.push(`${field} must be a boolean value`);
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate expiration date
   */
  public static validateExpiration(expiresAt?: Date): ValidationResult {
    if (expiresAt === undefined) {
      return { valid: true };
    }

    const errors: string[] = [];
    const now = new Date();

    if (!(expiresAt instanceof Date) || isNaN(expiresAt.getTime())) {
      errors.push('Expiration date must be a valid date');
      return { valid: false, errors };
    }

    if (expiresAt <= now) {
      errors.push('Expiration date must be in the future');
    }

    // Check if expiration is too far in the future (more than 2 years)
    const maxExpiration = new Date();
    maxExpiration.setFullYear(maxExpiration.getFullYear() + 2);
    
    if (expiresAt > maxExpiration) {
      errors.push('Expiration date cannot be more than 2 years in the future');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate metadata object
   */
  public static validateMetadata(
    metadata?: Record<string, any>,
    logger?: LoggerFacade
  ): ValidationResult {
    if (metadata === undefined) {
      return { valid: true };
    }
  
    const errors = this.getMetadataValidationErrors(metadata, logger);
  
    if (errors.length > 0) {
      this.handleMetadataErrors(errors, metadata, logger);
    }
  
    return { valid: true };
  }
  
  private static getMetadataValidationErrors(
    metadata: any,
    logger?: LoggerFacade
  ): string[] {
    const errors: string[] = [];
  
    if (!this.isValidObject(metadata)) {
      errors.push('Metadata must be a non-null object');
      return errors;
    }
  
    if (!this.isJsonSerializable(metadata, logger)) {
      errors.push('Metadata must be JSON serializable');
    } else if (this.isTooLarge(metadata)) {
      errors.push('Metadata JSON cannot exceed 2KB');
    }
  
    return errors;
  }
  
  private static isValidObject(value: any): boolean {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
  
  private static isJsonSerializable(value: any, logger?: LoggerFacade): boolean {
    try {
      JSON.stringify(value);
      return true;
    } catch (error: unknown) {
      if (logger) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Metadata must be JSON serializable: ${message}`);
      }
      return false;
    }
  }
  
  private static isTooLarge(value: any): boolean {
    return JSON.stringify(value).length > 2048;
  }
  
  private static handleMetadataErrors(
    errors: string[],
    metadata: Record<string, any>,
    logger?: LoggerFacade
  ): never {
    const errorMessage = `Invalid metadata: ${errors.join('; ')}`;
    if (logger) {
      logger.warn(errorMessage, { metadata });
    }
    throw new Error(errorMessage);
  }  
}