import { ConfigCollection } from "@/config/ConfigManager";
import { CrossValidationContext } from "@/config/ConfigValidator";
import { ValidationResult, ValidationWarning } from "@/config/environment.config";

export class GeneralCrossValidator {
  public validate(context: CrossValidationContext): ValidationResult {
    const { configs } = context;
    const warnings: ValidationWarning[] = [];

    warnings.push(...this.validateLoggingConsistency(configs));
    warnings.push(...this.validateDatabaseIntegration(configs));
    warnings.push(...this.validatePerformanceImplications(configs));
    warnings.push(...this.validateResourceUtilization(configs));

    return { isValid: true, errors: [], warnings };
  }

  private validateLoggingConsistency(configs: ConfigCollection): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if ((configs.logging.level === 'debug' || configs.logging.level === 'trace') && configs.environment.isProduction) {
      warnings.push({
        field: 'logging.level',
        message: 'Debug/trace logging in production may impact performance and security',
        recommendation: 'Use INFO or WARN level in production environments'
      });
    }

    return warnings;
  }

  private validateDatabaseIntegration(configs: ConfigCollection): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (configs.database.monitoring?.logQueries && !configs.logging.enableFile) {
      warnings.push({
        field: 'database.monitoring.logQueries',
        message: 'Database query logging enabled but file logging disabled',
        recommendation: 'Enable file logging to persist database query logs'
      });
    }

    if (configs.database.security?.auditLogging && !configs.logging.enableStructured) {
      warnings.push({
        field: 'database.security.auditLogging',
        message: 'Database audit logging enabled but structured logging disabled',
        recommendation: 'Enable structured logging for better audit log analysis'
      });
    }

    return warnings;
  }

  private validatePerformanceImplications(configs: ConfigCollection): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    const loggingFeatures = [
      configs.logging.enableCorrelation,
      configs.logging.enableStructured,
      configs.logging.performance.enabled,
      configs.logging.sampling.enabled
    ].filter(Boolean).length;

    if (loggingFeatures >= 3 && configs.environment.isProduction) {
      warnings.push({
        field: 'logging',
        message: 'Multiple logging features enabled may impact performance',
        recommendation: 'Profile application performance with current logging configuration'
      });
    }

    if (configs.database.connection.max && configs.database.connection.max > 50) {
      warnings.push({
        field: 'database.connection.max',
        message: 'Very high database connection pool size may impact performance',
        recommendation: 'Consider reducing connection pool size or implementing connection pooling strategies'
      });
    }

    return warnings;
  }

  private validateResourceUtilization(configs: ConfigCollection): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (configs.environment.port === 0 && !configs.environment.isTesting) {
      warnings.push({
        field: 'environment.port',
        message: 'Random port assignment outside of testing environment',
        recommendation: 'Specify explicit port for non-test environments'
      });
    }

    if (configs.logging.file.enabled && configs.logging.file.maxFiles > 100) {
      warnings.push({
        field: 'logging.file.maxFiles',
        message: 'Large number of log files may consume significant disk space',
        recommendation: 'Consider reducing max files or implementing log rotation'
      });
    }

    return warnings;
  }
}