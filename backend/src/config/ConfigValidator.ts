import { ConfigCollection } from "./ConfigManager";
import { ValidationResult, ValidationError, ValidationWarning, EnvironmentConfig, EnvironmentConfigFactory } from "./environment.config";
import { LoggingConfig, LoggingConfigFactory } from "./logging.config";
import { SecurityConfig, SecurityConfigFactory } from "./security.config";
import { DatabaseConfig, DatabaseConfigFactory } from "./database.config";

interface CrossValidationContext {
  readonly configs: ConfigCollection;
}

class EnvironmentValidator {
  public validate(config: EnvironmentConfig): ValidationResult {
    return EnvironmentConfigFactory.validateConfig(config);
  }
}

class LoggingValidator {
  public validate(config: LoggingConfig, envConfig: EnvironmentConfig): ValidationResult {
    return LoggingConfigFactory.validateConfig(config, envConfig);
  }
}

class SecurityValidator {
  public validate(config: SecurityConfig, envConfig: EnvironmentConfig): ValidationResult {
    return SecurityConfigFactory.validateConfig(config, envConfig);
  }
}

function mergeValidationResults(results: ValidationResult[]): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationWarning[] = [];

  for (const result of results) {
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

class DatabaseValidator {
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

class ProductionCrossValidator {
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

class DevelopmentCrossValidator {
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

class TestingCrossValidator {
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

class GeneralCrossValidator {
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

class CrossConfigurationValidator {
  private readonly productionValidator = new ProductionCrossValidator();
  private readonly developmentValidator = new DevelopmentCrossValidator();
  private readonly testingValidator = new TestingCrossValidator();
  private readonly generalValidator = new GeneralCrossValidator();

  public validate(configs: ConfigCollection): ValidationResult {
    const context: CrossValidationContext = { configs };
    const results: ValidationResult[] = [];

    // Environment-specific validation
    if (configs.environment.isProduction) {
      results.push(this.productionValidator.validate(context));
    } else if (configs.environment.isDevelopment) {
      results.push(this.developmentValidator.validate(context));
    } else if (configs.environment.isTesting) {
      results.push(this.testingValidator.validate(context));
    }

    // General cross-configuration validation
    results.push(this.generalValidator.validate(context));

    return mergeValidationResults(results);
  }

}

export class ConfigValidator {
  private readonly environmentValidator = new EnvironmentValidator();
  private readonly loggingValidator = new LoggingValidator();
  private readonly securityValidator = new SecurityValidator();
  private readonly databaseValidator = new DatabaseValidator();
  private readonly crossValidator = new CrossConfigurationValidator();

  public validateAll(configs: ConfigCollection): ValidationResult {
    const individualResults = this.validateIndividualConfigs(configs);
    const crossValidationResult = this.crossValidator.validate(configs);

    return mergeValidationResults([...individualResults, crossValidationResult]);
  }

  public validateEnvironment(config: EnvironmentConfig): ValidationResult {
    return this.environmentValidator.validate(config);
  }

  public validateLogging(config: LoggingConfig, envConfig: EnvironmentConfig): ValidationResult {
    return this.loggingValidator.validate(config, envConfig);
  }

  public validateSecurity(config: SecurityConfig, envConfig: EnvironmentConfig): ValidationResult {
    return this.securityValidator.validate(config, envConfig);
  }

  public validateDatabase(config: DatabaseConfig, envConfig: EnvironmentConfig): ValidationResult {
    return this.databaseValidator.validate(config, envConfig);
  }

  private validateIndividualConfigs(configs: ConfigCollection): ValidationResult[] {
    return [
      this.environmentValidator.validate(configs.environment),
      this.loggingValidator.validate(configs.logging, configs.environment),
      this.securityValidator.validate(configs.security, configs.environment),
      this.databaseValidator.validate(configs.database, configs.environment)
    ];
  }

  // Utility validation methods
  public validateRequired(value: any, field: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (value === undefined || value === null || value === '') {
      errors.push({
        field,
        message: `${field} is required`,
        code: 'REQUIRED_FIELD',
        value
      });
    }
    
    return errors;
  }

  public validateType(value: any, expectedType: string, field: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const actualType = typeof value;
    
    if (actualType !== expectedType) {
      errors.push({
        field,
        message: `${field} must be of type ${expectedType}, got ${actualType}`,
        code: 'INVALID_TYPE',
        value
      });
    }
    
    return errors;
  }

  public validateRange(value: number, min: number, max: number, field: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (value < min || value > max) {
      errors.push({
        field,
        message: `${field} must be between ${min} and ${max}`,
        code: 'INVALID_RANGE',
        value
      });
    }
    
    return errors;
  }

  public validateEnum<T>(value: T, allowedValues: readonly T[], field: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (!allowedValues.includes(value)) {
      errors.push({
        field,
        message: `${field} must be one of: ${allowedValues.join(', ')}`,
        code: 'INVALID_ENUM',
        value
      });
    }
    
    return errors;
  }

  public validateUrl(value: string, field: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    try {
      new URL(value);
    } catch {
      errors.push({
        field,
        message: `${field} must be a valid URL`,
        code: 'INVALID_URL',
        value
      });
    }
    
    return errors;
  }

  public validateEmail(value: string, field: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(value)) {
      errors.push({
        field,
        message: `${field} must be a valid email address`,
        code: 'INVALID_EMAIL',
        value
      });
    }
    
    return errors;
  }

  public validatePattern(value: string, pattern: RegExp, field: string, patternName?: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (!pattern.test(value)) {
      const patternStr = patternName ? ` (${patternName})` : '';
      errors.push({
        field,
        message: `${field} does not match required pattern${patternStr}`,
        code: 'INVALID_PATTERN',
        value
      });
    }
    
    return errors;
  }

  public validateArrayNotEmpty<T>(value: readonly T[], field: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (!Array.isArray(value) || value.length === 0) {
      errors.push({
        field,
        message: `${field} must be a non-empty array`,
        code: 'EMPTY_ARRAY',
        value
      });
    }
    
    return errors;
  }

  public validateDependency(
    condition: boolean, 
    dependentField: string, 
    requiredField: string,
    requiredValue?: any
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (condition && requiredValue === undefined) {
      errors.push({
        field: dependentField,
        message: `${dependentField} requires ${requiredField} to be set`,
        code: 'MISSING_DEPENDENCY',
        value: { dependentField, requiredField }
      });
    }
    
    return errors;
  }
}