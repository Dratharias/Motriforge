import { LogLevel } from '@/types/shared/enums/common';
import {
  LogConfiguration,
  LogOutputType,
  LogFilterOperator,
  LogFilterAction
} from '@/types/shared/infrastructure/logging';
import { IEnvironmentConfigFactory } from './IEnvironmentConfigFactory';

/**
 * Environment Config Factory - Single responsibility: creating environment-specific configurations
 */
export class EnvironmentConfigFactory implements IEnvironmentConfigFactory {
  private readonly baseConfig: LogConfiguration;

  constructor(baseConfig: LogConfiguration) {
    this.baseConfig = baseConfig;
  }

  createForEnvironment(environment: string): LogConfiguration {
    const environmentConfigs = {
      development: () => this.createDevelopmentConfig(),
      testing: () => this.createTestingConfig(),
      staging: () => this.createStagingConfig(),
      production: () => this.createProductionConfig()
    };

    const factory = environmentConfigs[environment as keyof typeof environmentConfigs];
    return factory ? factory() : this.baseConfig;
  }

  createDevelopmentConfig(): LogConfiguration {
    return {
      ...this.baseConfig,
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

  createTestingConfig(): LogConfiguration {
    return {
      ...this.baseConfig,
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

  createStagingConfig(): LogConfiguration {
    return {
      ...this.baseConfig,
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
        }
      ]
    };
  }

  createProductionConfig(): LogConfiguration {
    return {
      ...this.baseConfig,
      level: LogLevel.INFO,
      enableConsole: false,
      enableFile: true,
      enableRemote: true,
      enableAudit: true,
      enableMetrics: true,
      samplingRate: 0.1,
      outputs: [
        {
          name: 'file',
          type: LogOutputType.FILE,
          enabled: true,
          level: LogLevel.INFO,
          format: 'json',
          destination: './logs/production.log'
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
        }
      ]
    };
  }
}

