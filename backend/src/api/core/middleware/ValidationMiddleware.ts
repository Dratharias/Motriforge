import type { Middleware, RequestContext, NextFunction, ValidationResult } from '@/shared/types/api';
import { Logger } from '@/utils/Logger';
import { ValidationEngine } from '../validation/ValidationEngine';

export class ValidationMiddleware implements Middleware {
  private readonly validationEngine: ValidationEngine;
  private readonly logger: Logger;

  constructor(validationEngine: ValidationEngine) {
    this.validationEngine = validationEngine;
    this.logger = new Logger('ValidationMiddleware');
  }

  public async execute(context: RequestContext, next: NextFunction): Promise<void> {
    try {
      const parsedRequest = context.metadata.get('parsedRequest');
      
      if (parsedRequest) {
        const validationResult = await this.validateInput(parsedRequest, context);
        
        if (!validationResult.isValid) {
          const errorMessages = validationResult.errors?.map((e: any) => e.message) ?? ['Validation failed'];
          throw new Error(`Validation failed: ${errorMessages.join(', ')}`);
        }
        
        context.validatedData = validationResult.sanitizedData;
      }
      
      await next();
    } catch (error) {
      this.logger.error('Validation middleware error', error);
      throw error;
    }
  }

  private async validateInput(data: any, context: RequestContext): Promise<ValidationResult> {
    try {
      const url = new URL(context.request.url);
      const path = url.pathname;
      const method = context.request.method;
      
      // Generate schema name from method and path
      const schemaName = `${method.toLowerCase()}_${path.replace(/\//g, '_').replace(/[^a-z0-9_]/g, '_')}`;
      
      try {
        return await this.validationEngine.validate(data, schemaName);
      } catch (error) {
        this.logger.debug(`No validation schema found for ${schemaName}`);
        
        // Return sanitized data even if no schema exists
        return {
          isValid: true,
          errors: [],
          sanitizedData: this.validationEngine.sanitize(data)
        };
      }
    } catch (error) {
      this.logger.error('Validation input processing failed', error);
      throw new Error('Validation processing failed');
    }
  }
}