import { ILogger } from "@/types/shared/infrastructure/logging";

export class LoggerFactory {
  static createSecurePerformanceLogger(baseLogger: ILogger): ILogger {
    return new SecureLogDecorator(
      new PerformanceLogDecorator(baseLogger)
    );
  }

  static createBuilderFor(logger: ILogger): LogBuilder {
    return new LogBuilder(logger);
  }

  static createFormattingStrategy(format: 'json' | 'text'): ILogFormattingStrategy {
    switch (format) {
      case 'json':
        return new JsonLogFormattingStrategy();
      case 'text':
        return new TextLogFormattingStrategy();
      default:
        throw new Error(`Unknown log format: ${format}`);
    }
  }
}

// ===== USAGE EXAMPLES =====

