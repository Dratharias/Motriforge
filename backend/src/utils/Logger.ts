interface LogLevel {
  readonly level: number;
  readonly name: string;
}

const LOG_LEVELS: Record<string, LogLevel> = {
  ERROR: { level: 0, name: 'ERROR' },
  WARN: { level: 1, name: 'WARN' },
  INFO: { level: 2, name: 'INFO' },
  DEBUG: { level: 3, name: 'DEBUG' }
} as const;

export class Logger {
  private readonly context: string;
  private readonly currentLevel: LogLevel;

  constructor(context: string) {
    this.context = context;
    this.currentLevel = LOG_LEVELS[process.env.LOG_LEVEL ?? 'INFO'];
  }

  public error(message: string, data?: any): void {
    this.log(LOG_LEVELS.ERROR, message, data);
  }

  public warn(message: string, data?: any): void {
    this.log(LOG_LEVELS.WARN, message, data);
  }

  public info(message: string, data?: any): void {
    this.log(LOG_LEVELS.INFO, message, data);
  }

  public debug(message: string, data?: any): void {
    this.log(LOG_LEVELS.DEBUG, message, data);
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (level.level <= this.currentLevel.level) {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level: level.name,
        context: this.context,
        message,
        ...(data && { data })
      };

      console.log(JSON.stringify(logEntry));
    }
  }
}