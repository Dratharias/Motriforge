import { DatabaseConfig } from "@/config/database.config";
import { ValidationResult, ValidationError, ValidationWarning } from "@/config/environment.config";

export interface IDatabaseValidator {
  validate(config: DatabaseConfig): ValidationResult;
}

export class DatabaseConfigValidator implements IDatabaseValidator {
  private readonly validators: IDatabaseValidator[];

  constructor() {
    this.validators = [
      new ConnectionValidator(),
      new MonitoringValidator(),
      new BackupValidator(),
      new SecurityValidator()
    ];
  }

  public validate(config: DatabaseConfig): ValidationResult {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationWarning[] = [];

    for (const validator of this.validators) {
      const result = validator.validate(config);
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

// src/config/validators/database/ConnectionValidator.ts
export class ConnectionValidator implements IDatabaseValidator {
  public validate(config: DatabaseConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    this.validateRequiredFields(config.connection, errors);
    this.validatePort(config.connection.port, errors);
    this.validateMaxConnections(config.connection.max, errors);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateRequiredFields(connection: any, errors: ValidationError[]): void {
    const requiredFields = [
      { field: 'host', value: connection.host },
      { field: 'database', value: connection.database },
      { field: 'user', value: connection.user },
      { field: 'password', value: connection.password }
    ];

    for (const { field, value } of requiredFields) {
      if (!value) {
        errors.push({
          field: `connection.${field}`,
          message: `Database ${field} is required`,
          code: 'REQUIRED_FIELD',
          value
        });
      }
    }
  }

  private validatePort(port: number, errors: ValidationError[]): void {
    if (port < 1 || port > 65535) {
      errors.push({
        field: 'connection.port',
        message: 'Database port must be between 1 and 65535',
        code: 'INVALID_RANGE',
        value: port
      });
    }
  }

  private validateMaxConnections(max: number | undefined, errors: ValidationError[]): void {
    if (max && max < 1) {
      errors.push({
        field: 'connection.max',
        message: 'Maximum connections must be at least 1',
        code: 'INVALID_RANGE',
        value: max
      });
    }
  }
}

// src/config/validators/database/MonitoringValidator.ts
export class MonitoringValidator implements IDatabaseValidator {
  private static readonly MIN_SLOW_QUERY_THRESHOLD = 100;

  public validate(config: DatabaseConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (config.monitoring) {
      this.validateSlowQueryThreshold(config.monitoring.slowQueryThreshold, warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateSlowQueryThreshold(threshold: number, warnings: ValidationWarning[]): void {
    if (threshold < MonitoringValidator.MIN_SLOW_QUERY_THRESHOLD) {
      warnings.push({
        field: 'monitoring.slowQueryThreshold',
        message: 'Very low slow query threshold may generate excessive logs',
        recommendation: 'Consider increasing threshold to reduce noise'
      });
    }
  }
}

// src/config/validators/database/BackupValidator.ts
export class BackupValidator implements IDatabaseValidator {
  public validate(config: DatabaseConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (config.backup?.enabled) {
      this.validateBackupLocation(config.backup.location, errors);
      this.validateRetentionPeriod(config.backup.retention, errors);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateBackupLocation(location: string | undefined, errors: ValidationError[]): void {
    if (!location) {
      errors.push({
        field: 'backup.location',
        message: 'Backup location is required when backup is enabled',
        code: 'REQUIRED_FIELD',
        value: location
      });
    }
  }

  private validateRetentionPeriod(retention: number, errors: ValidationError[]): void {
    if (retention < 1) {
      errors.push({
        field: 'backup.retention',
        message: 'Backup retention must be at least 1 day',
        code: 'INVALID_RANGE',
        value: retention
      });
    }
  }
}

// src/config/validators/database/SecurityValidator.ts
export class SecurityValidator implements IDatabaseValidator {
  public validate(config: DatabaseConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    this.validateSecurityCompliance(config.security, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateSecurityCompliance(security: any, warnings: ValidationWarning[]): void {
    if (security?.enableRowLevelSecurity && !security?.auditLogging) {
      warnings.push({
        field: 'security.auditLogging',
        message: 'Audit logging recommended when row-level security is enabled',
        recommendation: 'Enable audit logging for security compliance'
      });
    }
  }
}