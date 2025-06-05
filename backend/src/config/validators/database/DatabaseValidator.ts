import { DatabaseConfigFactory } from "@/config";
import { DatabaseConfig } from "@/config/database.config";
import { EnvironmentConfig, ValidationResult, ValidationError, ValidationWarning } from "@/config/environment.config";

export class DatabaseValidator {
  public validate(config: DatabaseConfig, envConfig: EnvironmentConfig): ValidationResult {
    const result = DatabaseConfigFactory.validateConfig(config);
    const additionalValidation = this.validateEnvironmentSpecific(config, envConfig);
    
    return {
      isValid: result.isValid && additionalValidation.isValid,
      errors: [...result.errors, ...additionalValidation.errors],
      warnings: [...result.warnings, ...additionalValidation.warnings]
    };
  }

  private validateEnvironmentSpecific(config: DatabaseConfig, envConfig: EnvironmentConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (envConfig.isProduction) {
      errors.push(...this.validateProductionDatabase(config));
      warnings.push(...this.validateProductionRecommendations(config));
    }

    if (envConfig.isDevelopment) {
      warnings.push(...this.validateDevelopmentDatabase(config));
    }

    if (envConfig.isTesting) {
      warnings.push(...this.validateTestingDatabase(config));
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private validateProductionDatabase(config: DatabaseConfig): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!config.connection.password) {
      errors.push({
        field: 'database.connection.password',
        message: 'Database password is required in production',
        code: 'PRODUCTION_SECURITY_VIOLATION',
        value: config.connection.password
      });
    }

    return errors;
  }

  private validateProductionRecommendations(config: DatabaseConfig): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (!config.connection.ssl) {
      warnings.push({
        field: 'database.connection.ssl',
        message: 'SSL connection recommended for production database',
        recommendation: 'Enable SSL for production database connections'
      });
    }

    if (!config.backup?.enabled) {
      warnings.push({
        field: 'database.backup.enabled',
        message: 'Database backup should be enabled in production',
        recommendation: 'Enable automated database backups in production'
      });
    }

    if (!config.monitoring?.enabled) {
      warnings.push({
        field: 'database.monitoring.enabled',
        message: 'Database monitoring should be enabled in production',
        recommendation: 'Enable database monitoring in production'
      });
    }

    return warnings;
  }

  private validateDevelopmentDatabase(config: DatabaseConfig): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (config.connection.max && config.connection.max > 10) {
      warnings.push({
        field: 'database.connection.max',
        message: 'High connection pool size in development may consume unnecessary resources',
        recommendation: 'Consider reducing connection pool size in development'
      });
    }

    return warnings;
  }

  private validateTestingDatabase(config: DatabaseConfig): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (config.backup?.enabled) {
      warnings.push({
        field: 'database.backup.enabled',
        message: 'Database backup not needed in test environment',
        recommendation: 'Disable database backup in test environment'
      });
    }

    if (config.monitoring?.enabled) {
      warnings.push({
        field: 'database.monitoring.enabled',
        message: 'Database monitoring not needed in test environment',
        recommendation: 'Disable database monitoring in test environment'
      });
    }

    return warnings;
  }
}
