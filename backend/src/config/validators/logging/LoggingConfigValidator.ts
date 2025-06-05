import { EnvironmentConfig, ValidationResult, ValidationError, ValidationWarning } from "@/config/environment.config";
import { LoggingConfig, LogLevel } from "@/config/logging.config";


export interface ILoggingValidator {
  validate(config: LoggingConfig, envConfig?: EnvironmentConfig): ValidationResult;
}

export class LoggingConfigValidator implements ILoggingValidator {
  private readonly validators: ILoggingValidator[];

  constructor() {
    this.validators = [
      new LogLevelValidator(),
      new FileLoggingValidator(),
      new SamplingValidator(),
      new PerformanceValidator(),
      new EnvironmentValidator()
    ];
  }

  public validate(config: LoggingConfig, envConfig?: EnvironmentConfig): ValidationResult {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationWarning[] = [];

    for (const validator of this.validators) {
      const result = validator.validate(config, envConfig);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }
}

// src/config/validators/logging/LogLevelValidator.ts
export class LogLevelValidator implements ILoggingValidator {
  public validate(config: LoggingConfig, _envConfig?: EnvironmentConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    this.validateLogLevelEnum(config.level, errors);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateLogLevelEnum(level: LogLevel, errors: ValidationError[]): void {
    if (!Object.values(LogLevel).includes(level)) {
      errors.push({
        field: 'level',
        message: 'Invalid log level',
        code: 'INVALID_ENUM',
        value: level
      });
    }
  }
}

// src/config/validators/logging/FileLoggingValidator.ts
export class FileLoggingValidator implements ILoggingValidator {
  private static readonly MIN_MAX_FILES = 1;
  private static readonly MAX_MAX_FILES = 365;

  public validate(config: LoggingConfig, _envConfig?: EnvironmentConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (config.enableFile) {
      this.validateFilePath(config.file.path, errors);
      this.validateMaxFiles(config.file.maxFiles, warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateFilePath(path: string, errors: ValidationError[]): void {
    if (!path) {
      errors.push({
        field: 'file.path',
        message: 'File logging path is required when file logging is enabled',
        code: 'REQUIRED_FIELD',
        value: path
      });
    }
  }

  private validateMaxFiles(maxFiles: number, warnings: ValidationWarning[]): void {
    if (maxFiles < FileLoggingValidator.MIN_MAX_FILES || maxFiles > FileLoggingValidator.MAX_MAX_FILES) {
      warnings.push({
        field: 'file.maxFiles',
        message: 'Maximum files should be between 1 and 365',
        recommendation: 'Set a reasonable retention period for log files'
      });
    }
  }
}

// src/config/validators/logging/SamplingValidator.ts
export class SamplingValidator implements ILoggingValidator {
  private static readonly MIN_SAMPLING_RATE = 0;
  private static readonly MAX_SAMPLING_RATE = 1;
  private static readonly PRODUCTION_SAMPLING_THRESHOLD = 0.5;

  public validate(config: LoggingConfig, envConfig?: EnvironmentConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (config.sampling.enabled) {
      this.validateSamplingRate(config.sampling.rate, errors);
      this.validateProductionSamplingRate(config.sampling.rate, envConfig, warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateSamplingRate(rate: number, errors: ValidationError[]): void {
    if (rate < SamplingValidator.MIN_SAMPLING_RATE || rate > SamplingValidator.MAX_SAMPLING_RATE) {
      errors.push({
        field: 'sampling.rate',
        message: 'Sampling rate must be between 0 and 1',
        code: 'INVALID_RANGE',
        value: rate
      });
    }
  }

  private validateProductionSamplingRate(rate: number, envConfig: EnvironmentConfig | undefined, warnings: ValidationWarning[]): void {
    if (envConfig?.isProduction && rate > SamplingValidator.PRODUCTION_SAMPLING_THRESHOLD) {
      warnings.push({
        field: 'sampling.rate',
        message: 'High sampling rate in production may impact performance',
        recommendation: 'Consider reducing sampling rate in production'
      });
    }
  }
}

// src/config/validators/logging/PerformanceValidator.ts
export class PerformanceValidator implements ILoggingValidator {
  private static readonly MIN_SLOW_QUERY_THRESHOLD = 100;
  private static readonly MIN_SLOW_REQUEST_THRESHOLD = 500;

  public validate(config: LoggingConfig, _envConfig?: EnvironmentConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    this.validateSlowQueryThreshold(config.performance.slowQueryThreshold, warnings);
    this.validateSlowRequestThreshold(config.performance.slowRequestThreshold, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateSlowQueryThreshold(threshold: number, warnings: ValidationWarning[]): void {
    if (threshold < PerformanceValidator.MIN_SLOW_QUERY_THRESHOLD) {
      warnings.push({
        field: 'performance.slowQueryThreshold',
        message: 'Very low slow query threshold may generate excessive logs',
        recommendation: 'Consider increasing threshold to reduce noise'
      });
    }
  }

  private validateSlowRequestThreshold(threshold: number, warnings: ValidationWarning[]): void {
    if (threshold < PerformanceValidator.MIN_SLOW_REQUEST_THRESHOLD) {
      warnings.push({
        field: 'performance.slowRequestThreshold',
        message: 'Very low slow request threshold may generate excessive logs',
        recommendation: 'Consider increasing threshold to reduce noise'
      });
    }
  }
}

// src/config/validators/logging/EnvironmentValidator.ts
export class EnvironmentValidator implements ILoggingValidator {
  public validate(config: LoggingConfig, envConfig?: EnvironmentConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (envConfig) {
      this.validateProductionSettings(config, envConfig, warnings);
      this.validateDevelopmentSettings(config, envConfig, warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateProductionSettings(config: LoggingConfig, envConfig: EnvironmentConfig, warnings: ValidationWarning[]): void {
    if (!envConfig.isProduction) return;

    this.validateProductionLogLevel(config.level, warnings);
    this.validateProductionStructuredLogging(config.enableStructured, warnings);
    this.validateProductionPrettyPrint(config.format.prettyPrint, warnings);
  }

  private validateDevelopmentSettings(config: LoggingConfig, envConfig: EnvironmentConfig, warnings: ValidationWarning[]): void {
    if (!envConfig.isDevelopment) return;

    this.validateDevelopmentConsoleLogging(config.enableConsole, warnings);
  }

  private validateProductionLogLevel(level: LogLevel, warnings: ValidationWarning[]): void {
    if (level === LogLevel.DEBUG || level === LogLevel.TRACE) {
      warnings.push({
        field: 'level',
        message: 'Debug/trace logging in production may impact performance',
        recommendation: 'Use INFO or WARN level in production'
      });
    }
  }

  private validateProductionStructuredLogging(enableStructured: boolean, warnings: ValidationWarning[]): void {
    if (!enableStructured) {
      warnings.push({
        field: 'enableStructured',
        message: 'Structured logging recommended for production',
        recommendation: 'Enable structured logging for better log analysis'
      });
    }
  }

  private validateProductionPrettyPrint(prettyPrint: boolean, warnings: ValidationWarning[]): void {
    if (prettyPrint) {
      warnings.push({
        field: 'format.prettyPrint',
        message: 'Pretty printing not recommended for production',
        recommendation: 'Disable pretty printing in production for better performance'
      });
    }
  }

  private validateDevelopmentConsoleLogging(enableConsole: boolean, warnings: ValidationWarning[]): void {
    if (!enableConsole) {
      warnings.push({
        field: 'enableConsole',
        message: 'Console logging disabled in development',
        recommendation: 'Enable console logging for better development experience'
      });
    }
  }
}