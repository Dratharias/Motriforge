
import { LogEntry } from '@/types/shared/infrastructure/logging';
import { LogLevel } from '@/types/shared/enums/common';
import { ILogStrategy, ILogFormatter } from '../interfaces/ILogger';

/**
 * Console logging strategy - single responsibility for console output
 */
export class ConsoleLogStrategy implements ILogStrategy {
  public readonly name = 'console';
  public readonly outputType = 'console';

  constructor(
    private readonly formatter: ILogFormatter,
    private readonly enableColors: boolean = true,
    private readonly minLevel: LogLevel = LogLevel.DEBUG
  ) {}

  async write(entry: LogEntry): Promise<void> {
    if (!this.shouldWrite(entry)) {
      return;
    }

    const formatted = this.formatter.format(entry);
    const colorized = this.enableColors ? this.colorize(entry.level, formatted) : formatted;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(colorized);
        break;
      case LogLevel.INFO:
        console.info(colorized);
        break;
      case LogLevel.WARN:
        console.warn(colorized);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(colorized);
        break;
      default:
        console.log(colorized);
    }
  }

  async flush(): Promise<void> {
    // Console doesn't need explicit flushing
  }

  async close(): Promise<void> {
    // Console doesn't need closing
  }

  async isHealthy(): Promise<boolean> {
    return true; // Console is always available
  }

  private shouldWrite(entry: LogEntry): boolean {
    const levelPriority = this.getLevelPriority(entry.level);
    const minLevelPriority = this.getLevelPriority(this.minLevel);
    return levelPriority >= minLevelPriority;
  }

  private getLevelPriority(level: LogLevel): number {
    switch (level) {
      case LogLevel.DEBUG: return 1;
      case LogLevel.INFO: return 2;
      case LogLevel.WARN: return 3;
      case LogLevel.ERROR: return 4;
      case LogLevel.FATAL: return 5;
      default: return 0;
    }
  }

  private colorize(level: LogLevel, message: string): string {
    if (!this.enableColors) return message;

    const colors = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m',  // Green
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.FATAL]: '\x1b[35m'  // Magenta
    };

    const reset = '\x1b[0m';
    const color = colors[level] || '';
    return `${color}${message}${reset}`;
  }
}

