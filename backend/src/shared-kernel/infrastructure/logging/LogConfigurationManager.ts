
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
import { ILogConfigurationManager } from './interfaces/ILogger';

/**
 * Log Configuration Manager - single responsibility for managing log configuration
 */
export class LogConfigurationManager implements ILogConfigurationManager {
  private configuration: LogConfiguration;
  private readonly strategies: Set<string> = new Set();
  private readonly formatters: Set<string> = new Set();
  private readonly filters: LogFilter[] = [];

  constructor(initialConfig?: Partial<LogConfiguration>) {
    this.configuration = this.createDefaultConfiguration();
    if (initialConfig) {
      this.configuration = { ...this.configuration, ...initialConfig };
    }
    this.initializeDefaults();
  }

  getConfiguration(): LogConfiguration {
    return { ...this.configuration };
  }

  async updateConfiguration(config: Partial<LogConfiguration>): Promise<void> {
    const newConfig = { ...this.configuration, ...config };
    
    if (!this.validateConfiguration(newConfig)) {
      throw new Error('Invalid configuration provided');
    }

    this.configuration = newConfig;
  }

  validateConfiguration(config: LogConfiguration): boolean {
    try {
      // Validate log level
      if (!Object.values(LogLevel).includes(config.level)) {
        throw new Error(`Invalid log level: ${config.level}`);
      }

      // Validate outputs
      for (const output of config.outputs) {
        if (!this.validateOutput(output)) {
          throw new Error(`Invalid output configuration: ${output.name}`);
        }
      }

      // Validate formats
      for (const format of config.formats) {
        if (!this.validateFormat(format)) {
          throw new Error(`Invalid format configuration: ${format.name}`);
        }
      }

      // Validate filters
      for (const filter of config.filters) {
        if (!this.validateFilter(filter)) {
          throw new Error(`Invalid filter configuration: ${filter.name}`);
        }
      }

      // Validate numeric ranges
      if (config.samplingRate !== undefined && (config.samplingRate < 0 || config.samplingRate > 1)) {
        throw new Error('Sampling rate must be between 0 and 1');
      }

      if (config.bufferSize !== undefined && config.bufferSize < 1) {
        throw new Error('Buffer size must be at least 1');
      }

      if (config.flushInterval !== undefined && config.flushInterval < 100) {
        throw new Error('Flush interval must be at least 100ms');
      }

      return true;
    } catch (error) {
      console.error('Configuration validation failed:', error);
      return false;
    }
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

  /**
   * Add a strategy to the available strategies
   */
  addStrategy(strategyName: string): void {
    this.strategies.add(strategyName);
  }

  /**
   * Add a formatter to the available formatters
   */
  addFormatter(formatterName: string): void {
    this.formatters.add(formatterName);
  }

  /**
   * Add a filter configuration
   */
  addFilter(filter: LogFilter): void {
    if (this.validateFilter(filter)) {
      this.filters.push(filter);
    }
  }

  /**
   * Remove a filter by name
   */
  removeFilter(filterName: string): void {
    const index = this.filters.findIndex(f => f.name === filterName);
    if (index !== -1) {
      this.filters.splice(index, 1);
    }
  }

  /**
   * Get configuration for a specific environment
   */
  getEnvironmentConfiguration(environment: string): LogConfiguration {
    const environmentConfigs = {
      development: this.createDevelopmentConfig(),
      testing: this.createTestingConfig(),
      staging: this.createStagingConfig(),
      production: this.createProductionConfig()
    };

    const envConfig = environmentConfigs[environment as keyof typeof environmentConfigs];
    return envConfig || this.configuration;
  }

  private createDefaultConfiguration(): LogConfiguration {
    return {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: false,
      enableRemote: false,
      enableAudit: false,
      enableMetrics: false,
      enableContext: true,
      formats: [
        {
          name: 'json',
          template: '{"timestamp":"${timestamp}","level":"${level}","message":"${message}","context":"${context}"}',
          dateFormat: 'ISO',
          includeStack: true,
          includeContext: true,
          colorize: false,
          compress: false
        },
        {
          name: 'text',
          template: '[${timestamp}] [${level}] [${context}] ${message}',
          dateFormat: 'ISO',
          includeStack: false,
          includeContext: true,
          colorize: true,
          compress: false
        }
      ],
      outputs: [
        {
          name: 'console',
          type: LogOutputType.CONSOLE,
          enabled: true,
          level: LogLevel.DEBUG,
          format: 'text',
          destination: 'stdout'
        }
      ],
      filters: [],
      bufferSize: 100,
      flushInterval: 5000
    };
  }

  private createDevelopmentConfig(): LogConfiguration {
    return {
      ...this.configuration,
      level: LogLevel.DEBUG,
      enableConsole: true,
      enableFile: true,
      enableMetrics: true,
      outputs: [
        {
          name: 'console',
          type: LogOutputType.CONSOLE,
          enabled: true,
          level: LogLevel.DEBUG,
          format: 'text',
          destination: 'stdout'
        },
        {
          name: 'file',
          type: LogOutputType.FILE,
          enabled: true,
          level: LogLevel.DEBUG,
          format: 'json',
          destination: './logs/development.log'
        }
      ]
    };
  }

  private createTestingConfig(): LogConfiguration {
    return {
      ...this.configuration,
      level: LogLevel.WARN,
      enableConsole: false,
      enableFile: true,
      outputs: [
        {
          name: 'file',
          type: LogOutputType.FILE,
          enabled: true,
          level: LogLevel.WARN,
          format: 'json',
          destination: './logs/test.log'
        }
      ]
    };
  }

  private createStagingConfig(): LogConfiguration {
    return {
      ...this.configuration,
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: true,
      enableRemote: true,
      enableAudit: true,
      enableMetrics: true,
      outputs: [
        {
          name: 'console',
          type: LogOutputType.CONSOLE,
          enabled: true,
          level: LogLevel.INFO,
          format: 'json',
          destination: 'stdout'
        },
        {
          name: 'file',
          type: LogOutputType.FILE,
          enabled: true,
          level: LogLevel.DEBUG,
          format: 'json',
          destination: './logs/staging.log'
        },
        {
          name: 'remote',
          type: LogOutputType.REMOTE,
          enabled: true,
          level: LogLevel.INFO,
          format: 'json',
          destination: process.env.LOG_ENDPOINT || 'https://logs.example.com'
        }
      ]
    };
  }

  private createProductionConfig(): LogConfiguration {
    return {
      ...this.configuration,
      level: LogLevel.INFO,
      enableConsole: false,
      enableFile: true,
      enableRemote: true,
      enableAudit: true,
      enableMetrics: true,
      samplingRate: 0.1, // Sample 10% of logs in production
      outputs: [
        {
          name: 'file',
          type: LogOutputType.FILE,
          enabled: true,
          level: LogLevel.INFO,
          format: 'json',
          destination: './logs/production.log'
        },
        {
          name: 'remote',
          type: LogOutputType.REMOTE,
          enabled: true,
          level: LogLevel.WARN,
          format: 'json',
          destination: process.env.LOG_ENDPOINT || 'https://logs.example.com'
        },
        {
          name: 'audit',
          type: LogOutputType.DATABASE,
          enabled: true,
          level: LogLevel.INFO,
          format: 'json',
          destination: process.env.AUDIT_DB_CONNECTION || 'mongodb://localhost/audit'
        }
      ],
      filters: [
        {
          name: 'exclude-debug',
          enabled: true,
          conditions: [
            {
              field: 'level',
              operator: LogFilterOperator.EQUALS,
              value: LogLevel.DEBUG
            }
          ],
          action: LogFilterAction.EXCLUDE
        },
        {
          name: 'sample-info',
          enabled: true,
          conditions: [
            {
              field: 'level',
              operator: LogFilterOperator.EQUALS,
              value: LogLevel.INFO
            }
          ],
          action: LogFilterAction.SAMPLE
        }
      ]
    };
  }

  private validateOutput(output: LogOutput): boolean {
    if (!output.name || !output.type || !output.destination) {
      return false;
    }

    if (!Object.values(LogOutputType).includes(output.type)) {
      return false;
    }

    if (!Object.values(LogLevel).includes(output.level)) {
      return false;
    }

    return true;
  }

  private validateFormat(format: LogFormat): boolean {
    if (!format.name || !format.template) {
      return false;
    }

    // Validate template has required placeholders
    const requiredPlaceholders = ['timestamp', 'level', 'message'];
    const hasAllPlaceholders = requiredPlaceholders.every(placeholder =>
      format.template.includes(`\${${placeholder}}`)
    );

    return hasAllPlaceholders;
  }

  private validateFilter(filter: LogFilter): boolean {
    if (!filter.name || !filter.conditions || filter.conditions.length === 0) {
      return false;
    }

    // Validate all conditions
    for (const condition of filter.conditions) {
      if (!condition.field || !condition.operator || condition.value === undefined) {
        return false;
      }

      if (!Object.values(LogFilterOperator).includes(condition.operator)) {
        return false;
      }
    }

    if (!Object.values(LogFilterAction).includes(filter.action)) {
      return false;
    }

    return true;
  }

  private initializeDefaults(): void {
    // Add default strategies
    this.strategies.add('console');
    this.strategies.add('file');
    this.strategies.add('database');
    this.strategies.add('remote');

    // Add default formatters
    this.formatters.add('json');
    this.formatters.add('text');
  }
}

