import { ConfigCollection } from "@/config/ConfigManager";
import { CrossValidationContext } from "@/config/ConfigValidator";
import { ValidationResult, ValidationWarning } from "@/config/environment.config";

export class TestingCrossValidator {
  public validate(context: CrossValidationContext): ValidationResult {
    const { configs } = context;
    const warnings: ValidationWarning[] = [];

    warnings.push(...this.validateTestingSettings(configs));

    return { isValid: true, errors: [], warnings };
  }

  private validateTestingSettings(configs: ConfigCollection): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (configs.logging.enableFile) {
      warnings.push({
        field: 'logging.enableFile',
        message: 'File logging in tests may slow down test execution',
        recommendation: 'Disable file logging in test environments'
      });
    }

    if (configs.security.rateLimiting.enabled) {
      warnings.push({
        field: 'security.rateLimiting.enabled',
        message: 'Rate limiting in tests may cause test failures',
        recommendation: 'Disable rate limiting in test environments'
      });
    }

    return warnings;
  }
}