import { LogLevel } from '@/types/shared/enums/common';
import { LogConfiguration, LogOutputType } from '@/types/shared/infrastructure/logging';

/**
 * Default Config Factory - Single responsibility: creating default configurations
 */
export class DefaultConfigFactory {
  static create(): LogConfiguration {
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
}

