import { LogConfiguration, LogFormat, LogOutput, LogFilter } from '@/types/shared/infrastructure/logging';

export interface IConfigurationValidator {
  validate(config: LogConfiguration): ValidationResult;
  validateOutput(output: LogOutput): boolean;
  validateFormat(format: LogFormat): boolean;
  validateFilter(filter: LogFilter): boolean;
}

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly ValidationError[];
}

export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly code: string;
}

