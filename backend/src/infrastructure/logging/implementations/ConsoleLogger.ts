import { Logger, LogEntry, LogFormatter } from '../base/Logger.js';

/**
 * Simple console formatter
 */
export class ConsoleFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toString().padEnd(8);
    const context = entry.context ? `[${entry.context}]` : '';
    
    let output = `${timestamp} ${level} ${context} ${entry.message}`;
    
    if (entry.traceId) {
      output += ` (trace: ${entry.traceId})`;
    }
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      output += `\n  Metadata: ${JSON.stringify(entry.metadata, null, 2)}`;
    }
    
    return output;
  }
}

/**
 * Console logger implementation
 */
export class ConsoleLogger extends Logger {
  private readonly formatter: LogFormatter;

  constructor(context: string, formatter?: LogFormatter) {
    super(context);
    this.formatter = formatter ?? new ConsoleFormatter();
  }

  protected writeLog(entry: LogEntry): void {
    const formattedMessage = this.formatter.format(entry);
    
    // Use appropriate console method based on log level
    switch (entry.level) {
      case 0: // DEBUG
        console.debug(formattedMessage);
        break;
      case 1: // INFO
        console.info(formattedMessage);
        break;
      case 2: // WARN
        console.warn(formattedMessage);
        break;
      case 3: // ERROR
      case 4: // CRITICAL
        console.error(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }
  }
}