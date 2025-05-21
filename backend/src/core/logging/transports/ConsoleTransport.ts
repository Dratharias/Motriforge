import { LogTransport, TransportConfig } from '../LogTransport';
import { LogEntry } from '../LogEntry';
import { LogLevel, getLogLevelFromString } from '../LogLevel';
import { LogFormatter } from '../LogFormatter';
import { SimpleFormatter } from '../formatters/SimpleFormatter';

export interface ConsoleTransportConfig extends TransportConfig {
  colorized?: boolean;
  formatter?: LogFormatter;
}

export class ConsoleTransport implements LogTransport {
  public readonly id: string;
  public enabled: boolean;
  public minLevel: LogLevel;
  
  private readonly colorized: boolean;
  private readonly formatter: LogFormatter;

  constructor(config: ConsoleTransportConfig) {
    this.id = config.id || 'console';
    this.enabled = config.enabled !== false;
    this.minLevel = typeof config.minLevel === 'string' 
      ? getLogLevelFromString(config.minLevel) 
      : (config.minLevel ?? LogLevel.INFO);
    this.colorized = config.colorized !== false;
    this.formatter = config.formatter || new SimpleFormatter({ colorize: this.colorized });
  }

  public async transport(entry: LogEntry): Promise<void> {
    if (!this.enabled || entry.level < this.minLevel) {
      return;
    }

    const formatted = this.formatter.format(entry);

    switch (entry.level) {
      case LogLevel.TRACE:
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  public async flush(): Promise<void> {
    // Console output is immediate, no need to flush
    return Promise.resolve();
  }

  public async close(): Promise<void> {
    // Nothing to close for console transport
    return Promise.resolve();
  }
}