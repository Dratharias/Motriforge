import { ConfigCollection } from "@/config/ConfigManager";
import { CrossValidationContext } from "@/config/ConfigValidator";
import { ValidationResult, ValidationError, ValidationWarning } from "@/config/environment.config";

export class ProductionCrossValidator {
  public validate(context: CrossValidationContext): ValidationResult {
    const { configs } = context;
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    errors.push(...this.validateSecurityRequirements(configs));
    warnings.push(...this.validateProductionRecommendations(configs));

    return { isValid: errors.length === 0, errors, warnings };
  }

  private validateSecurityRequirements(configs: ConfigCollection): ValidationError[] {
    const errors: ValidationError[] = [];

    if (configs.security.cors.origins.includes('*')) {
      errors.push({
        field: 'security.cors.origins',
        message: 'Wildcard CORS origins not allowed in production',
        code: 'PRODUCTION_SECURITY_VIOLATION',
        value: configs.security.cors.origins
      });
    }

    return errors;
  }

  private validateProductionRecommendations(configs: ConfigCollection): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (!configs.logging.enableFile) {
      warnings.push({
        field: 'logging.enableFile',
        message: 'File logging should be enabled in production for audit trails',
        recommendation: 'Enable file logging in production environments'
      });
    }

    if (!configs.logging.enableStructured) {
      warnings.push({
        field: 'logging.enableStructured',
        message: 'Structured logging recommended for production log analysis',
        recommendation: 'Enable structured logging in production'
      });
    }

    if (!configs.security.helmet.enabled) {
      warnings.push({
        field: 'security.helmet.enabled',
        message: 'Security headers should be enabled in production',
        recommendation: 'Enable Helmet security headers in production'
      });
    }

    if (!configs.security.helmet.hsts.enabled) {
      warnings.push({
        field: 'security.helmet.hsts.enabled',
        message: 'HSTS should be enabled in production',
        recommendation: 'Enable HSTS for HTTPS enforcement'
      });
    }

    return warnings;
  }
}