import { LogConfiguration, LogFilter } from '@/types/shared/infrastructure/logging';
import { ILogConfigurationManager } from '../interfaces/ILogger';
import { IConfigurationValidator, ValidationResult } from './IConfigurationValidator';
import { IEnvironmentConfigFactory } from './IEnvironmentConfigFactory';
import { ConfigurationValidator } from './ConfigurationValidator';
import { EnvironmentConfigFactory } from './EnvironmentConfigFactory';
import { DefaultConfigFactory } from './DefaultConfigFactory';

/**
 * Log Configuration Manager - Single responsibility: managing log configuration
 * Now uses decomposed validation system with low cognitive complexity
 */
export class LogConfigurationManager implements ILogConfigurationManager {
  private configuration: LogConfiguration;
  private readonly validator: IConfigurationValidator;
  private readonly environmentFactory: IEnvironmentConfigFactory;
  private readonly strategies: Set<string> = new Set();
  private readonly formatters: Set<string> = new Set();
  private readonly filters: LogFilter[] = [];

  constructor(
    initialConfig?: Partial<LogConfiguration>,
    validator?: IConfigurationValidator,
    environmentFactory?: IEnvironmentConfigFactory
  ) {
    this.configuration = DefaultConfigFactory.create();
    if (initialConfig) {
      this.configuration = { ...this.configuration, ...initialConfig };
    }

    // Uses new command-based validator with low complexity
    this.validator = validator ?? new ConfigurationValidator();
    this.environmentFactory = environmentFactory ?? new EnvironmentConfigFactory(this.configuration);
    this.initializeDefaults();
  }

  getConfiguration(): LogConfiguration {
    return { ...this.configuration };
  }

  async updateConfiguration(config: Partial<LogConfiguration>): Promise<void> {
    const newConfig = { ...this.configuration, ...config };
    
    const validationResult = this.validateConfigurationWithResult(newConfig);
    if (!validationResult.isValid) {
      throw new Error(`Invalid configuration provided: ${this.formatValidationErrors(validationResult)}`);
    }

    this.configuration = newConfig;
  }

  validateConfiguration(config: LogConfiguration): boolean {
    const result = this.validateConfigurationWithResult(config);
    if (!result.isValid) {
      console.error('Configuration validation failed:', result.errors);
    }
    return result.isValid;
  }

  /**
   * Get detailed validation result with all errors
   */
  validateConfigurationWithResult(config: LogConfiguration): ValidationResult {
    return this.validator.validate(config);
  }

  getStrategies(): string[] {
    return Array.from(this.strategies);
  }

  getFormatters(): string[] {
    return Array.from(this.formatters);
  }

  getFilters(): string[] {
    return this.filters.map(filter => filter.name);
  }

  addStrategy(strategyName: string): void {
    this.strategies.add(strategyName);
  }

  addFormatter(formatterName: string): void {
    this.formatters.add(formatterName);
  }

  addFilter(filter: LogFilter): void {
    if (this.validator.validateFilter(filter)) {
      this.filters.push(filter);
    } else {
      console.warn(`Invalid filter configuration ignored: ${filter.name}`);
    }
  }

  removeFilter(filterName: string): void {
    const index = this.filters.findIndex(f => f.name === filterName);
    if (index !== -1) {
      this.filters.splice(index, 1);
    }
  }

  getEnvironmentConfiguration(environment: string): LogConfiguration {
    return this.environmentFactory.createForEnvironment(environment);
  }

  /**
   * Format validation errors for user-friendly display
   */
  private formatValidationErrors(validationResult: ValidationResult): string {
    return validationResult.errors
      .map(error => `${error.field}: ${error.message}`)
      .join('; ');
  }

  private initializeDefaults(): void {
    this.strategies.add('console');
    this.strategies.add('file');
    this.strategies.add('database');
    this.strategies.add('remote');

    this.formatters.add('json');
    this.formatters.add('text');
  }
}