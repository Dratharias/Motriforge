import { ConfigCollection } from "./ConfigManager";
import { ValidationResult, ValidationError, ValidationWarning, EnvironmentConfig, EnvironmentConfigFactory } from "./environment.config";
import { LoggingConfig, LoggingConfigFactory } from "./logging.config";
import { SecurityConfig, SecurityConfigFactory } from "./security.config";
import { DatabaseConfig } from "./database.config";
import { CrossConfigurationValidator } from "./validators/cross/CrossConfigurationValidator";
import { DatabaseValidator } from "./validators/database/DatabaseValidator";

export interface CrossValidationContext {
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

export function mergeValidationResults(results: ValidationResult[]): ValidationResult {
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