import { ErrorFormatter, JsonErrorFormatterConfig } from '@/types/errors';
import { ApiError } from '../ApiError';
import { FormattedError } from '../FormattedError';


/**
 * Formatter that converts errors to JSON format
 */
export class JsonErrorFormatter implements ErrorFormatter {
  private readonly includeStack: boolean;
  private readonly masks: Record<string, boolean>;
  private readonly prettyPrint: boolean;
  
  /**
   * Create a new JsonErrorFormatter
   * 
   * @param config - Configuration options
   */
  constructor(config: JsonErrorFormatterConfig = {}) {
    this.includeStack = config.includeStack ?? false;
    this.masks = config.masks ?? {
      password: true,
      token: true,
      secret: true,
      apiKey: true,
      creditCard: true
    };
    this.prettyPrint = config.prettyPrint ?? false;
  }
  
  /**
   * Format an error into JSON
   * 
   * @param error - Error or API error to format
   * @returns Formatted error
   */
  public format(error: Error | ApiError): FormattedError {
    let statusCode = 500;
    let formattedError: Record<string, any>;
    
    // If it's an ApiError, use its properties
    if ('errorCode' in error && 'statusCode' in error) {
      const apiError = error;
      statusCode = apiError.statusCode;
      formattedError = this.formatError(apiError);
    } else {
      // Regular Error, convert to a simple format
      formattedError = {
        error: 'Internal Server Error',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      
      if (this.includeStack && error.stack) {
        formattedError.stack = error.stack;
      }
    }
    
    // Mask sensitive data
    const maskedError = this.maskSensitiveData(formattedError);
    
    // Convert to JSON string
    const content = JSON.stringify(
      maskedError,
      null,
      this.prettyPrint ? 2 : undefined
    );
    
    return {
      content,
      contentType: 'application/json',
      statusCode
    };
  }
  
  /**
   * Get the formats supported by this formatter
   * 
   * @returns Array of supported format identifiers
   */
  public getSupportedFormats(): string[] {
    return ['json'];
  }
  
  /**
   * Format an API error into a plain object
   * 
   * @param error - API error to format
   * @returns Formatted error object
   */
  private formatError(error: ApiError): Record<string, any> {
    const formatted = error.toJSON();
    
    // Remove stack trace if not configured to include it
    if (!this.includeStack) {
      delete formatted.stack;
    }
    
    return formatted;
  }
  
  /**
   * Mask sensitive data in an object
   * 
   * @param data - Data to mask
   * @returns Masked data
   */
  private maskSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    // If it's an array, mask each item
    if (Array.isArray(data)) {
      return data.map(item => this.maskSensitiveData(item));
    }
    
    // It's an object, check each key
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      // Check if this key should be masked
      if (this.masks[key.toLowerCase()]) {
        result[key] = '***REDACTED***';
      } else if (typeof value === 'object' && value !== null) {
        // Recursively mask nested objects
        result[key] = this.maskSensitiveData(value);
      } else {
        // Pass through non-sensitive values
        result[key] = value;
      }
    }
    
    return result;
  }
}