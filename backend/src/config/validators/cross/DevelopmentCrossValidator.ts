import { ConfigCollection } from "@/config/ConfigManager";
import { CrossValidationContext } from "@/config/ConfigValidator";
import { ValidationResult, ValidationWarning } from "@/config/environment.config";

export class DevelopmentCrossValidator {
  public validate(context: CrossValidationContext): ValidationResult {
    const { configs } = context;
    const warnings: ValidationWarning[] = [];

    warnings.push(...this.validateDevelopmentSettings(configs));

    return { isValid: true, errors: [], warnings };
  }

  private validateDevelopmentSettings(configs: ConfigCollection): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (configs.security.session.cookieSecure) {
      warnings.push({
        field: 'security.session.cookieSecure',
        message: 'Secure cookies may not work in development without HTTPS',
        recommendation: 'Consider disabling secure cookies in development'
      });
    }

    if (configs.security.helmet.hsts.enabled) {
      warnings.push({
        field: 'security.helmet.hsts.enabled',
        message: 'HSTS in development may cause browser caching issues',
        recommendation: 'Disable HSTS in development environments'
      });
    }

    if (configs.security.csp.enabled && this.hasStrictCSP(configs.security.csp.directives.scriptSrc)) {
      warnings.push({
        field: 'security.csp.directives.scriptSrc',
        message: 'Strict CSP in development may break development tools',
        recommendation: 'Consider allowing unsafe-eval and unsafe-inline in development'
      });
    }

    return warnings;
  }

  private hasStrictCSP(scriptSrc: readonly string[]): boolean {
    return scriptSrc.every(src => 
      !src.includes('unsafe-eval') && !src.includes('unsafe-inline')
    );
  }
}