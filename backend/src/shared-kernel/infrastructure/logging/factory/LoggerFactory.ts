import { ILogFormatter, ILogger } from '../interfaces/ILogger';
import { LogBuilder } from '../core/LogBuilder';
import { JsonLogFormatter } from '../formatters/JsonLogFormatter';
import { TextLogFormatter } from '../formatters/TextLogFormatter';
import { SecureLogDecorator } from '../decorators/SecureLogDecorator';
import { PerformanceLogDecorator } from '../decorators/PerformanceLogDecorator';

/**
 * Logger Factory - Updated to use formatters/ instead of strategies/
 */
export class LoggerFactory {
  static createSecurePerformanceLogger(baseLogger: ILogger): ILogger {
    return new SecureLogDecorator(
      new PerformanceLogDecorator(baseLogger)
    );
  }

  static createBuilderFor(logger: ILogger): LogBuilder {
    return new LogBuilder(logger);
  }

  /**
   * Create log formatter - Updated to use formatters/ approach
   */
  static createFormatter(format: 'json' | 'text'): ILogFormatter {
    switch (format) {
      case 'json':
        return new JsonLogFormatter();
      case 'text':
        return new TextLogFormatter();
      default:
        throw new Error(`Unknown log format: ${format}`);
    }
  }

  /**
   * @deprecated Use createFormatter() instead
   */
  static createFormattingStrategy(format: 'json' | 'text'): ILogFormatter {
    console.warn('createFormattingStrategy() is deprecated. Use createFormatter() instead.');
    return this.createFormatter(format);
  }
}