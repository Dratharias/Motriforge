import { LogLevel } from '@/types/shared/enums/common';
import {
  LogConfiguration,
  LogFormat,
  LogOutput,
  LogFilter,
  LogOutputType,
  LogFilterOperator,
  LogFilterAction
} from '@/types/shared/infrastructure/logging';
import { IConfigurationValidator, ValidationResult, ValidationError } from './IConfigurationValidator';

/**
 * Configuration Validator - Single responsibility: validating log configurations
 */
export class ConfigurationValidator implements IConfigurationValidator {
  validate(config: LogConfiguration): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate log level
    this.validateLogLevel(config.level, errors);

    // Validate outputs
    this.validateOutputs(config.outputs, errors);

    // Validate formats
    this.validateFormats(config.formats, errors);

    // Validate filters
    this.validateFilters(config.filters, errors);

    // Validate numeric ranges
    this.validateNumericRanges(config, errors);

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateOutput(output: LogOutput): boolean {
    if (!output.name || !output.type || !output.destination) {
      return false;
    }

    if (!Object.values(LogOutputType).includes(output.type)) {
      return false;
    }

    return Object.values(LogLevel).includes(output.level);
  }

  validateFormat(format: LogFormat): boolean {
    if (!format.name || !format.template) {
      return false;
    }

    const requiredPlaceholders = ['timestamp', 'level', 'message'];
    return requiredPlaceholders.every(placeholder =>
      format.template.includes(`\${${placeholder}}`)
    );
  }

  validateFilter(filter: LogFilter): boolean {
    if (!filter.name || !filter.conditions || filter.conditions.length === 0) {
      return false;
    }

    for (const condition of filter.conditions) {
      if (!condition.field || !condition.operator || condition.value === undefined) {
        return false;
      }

      if (!Object.values(LogFilterOperator).includes(condition.operator)) {
        return false;
      }
    }

    return Object.values(LogFilterAction).includes(filter.action);
  }

  private validateLogLevel(level: LogLevel, errors: ValidationError[]): void {
    if (!Object.values(LogLevel).includes(level)) {
      errors.push({
        field: 'level',
        message: `Invalid log level: ${level}`,
        code: 'INVALID_LOG_LEVEL'
      });
    }
  }

  private validateOutputs(outputs: LogOutput[], errors: ValidationError[]): void {
    outputs.forEach((output, index) => {
      if (!this.validateOutput(output)) {
        errors.push({
          field: `outputs[${index}]`,
          message: `Invalid output configuration: ${output.name}`,
          code: 'INVALID_OUTPUT'
        });
      }
    });
  }

  private validateFormats(formats: LogFormat[], errors: ValidationError[]): void {
    formats.forEach((format, index) => {
      if (!this.validateFormat(format)) {
        errors.push({
          field: `formats[${index}]`,
          message: `Invalid format configuration: ${format.name}`,
          code: 'INVALID_FORMAT'
        });
      }
    });
  }

  private validateFilters(filters: LogFilter[], errors: ValidationError[]): void {
    filters.forEach((filter, index) => {
      if (!this.validateFilter(filter)) {
        errors.push({
          field: `filters[${index}]`,
          message: `Invalid filter configuration: ${filter.name}`,
          code: 'INVALID_FILTER'
        });
      }
    });
  }

  private validateNumericRanges(config: LogConfiguration, errors: ValidationError[]): void {
    if (config.samplingRate !== undefined && (config.samplingRate < 0 || config.samplingRate > 1)) {
      errors.push({
        field: 'samplingRate',
        message: 'Sampling rate must be between 0 and 1',
        code: 'INVALID_SAMPLING_RATE'
      });
    }

    if (config.bufferSize !== undefined && config.bufferSize < 1) {
      errors.push({
        field: 'bufferSize',
        message: 'Buffer size must be at least 1',
        code: 'INVALID_BUFFER_SIZE'
      });
    }

    if (config.flushInterval !== undefined && config.flushInterval < 100) {
      errors.push({
        field: 'flushInterval',
        message: 'Flush interval must be at least 100ms',
        code: 'INVALID_FLUSH_INTERVAL'
      });
    }
  }
}

