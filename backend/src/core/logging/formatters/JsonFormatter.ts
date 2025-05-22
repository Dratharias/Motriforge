import { LogFormatter, JsonFormatterOptions, LogEntry, LogLevel, LOG_LEVEL_NAMES } from "@/types/logging";


export class JsonFormatter implements LogFormatter {
  private readonly replacer: (key: string, value: any) => any;
  private readonly includeStack: boolean;
  private readonly maskSensitiveData: boolean;
  private readonly sensitiveKeys: string[];
  private readonly space?: number | string;

  constructor(options: JsonFormatterOptions = {}) {
    this.replacer = options.replacer ?? ((_key, value) => value);
    this.includeStack = options.includeStack ?? true;
    this.maskSensitiveData = options.maskSensitiveData ?? true;
    this.sensitiveKeys = options.sensitiveKeys ?? [
      'password', 'token', 'secret', 'authorization', 'key',
      'apiKey', 'credential', 'refreshToken', 'accessToken'
    ];
    this.space = options.space;
  }

  public format(entry: LogEntry): string {
    const sanitized = this.sanitizeObject(entry);
    
    // Add level name for better readability
    const level = sanitized.level as LogLevel;
    if (LOG_LEVEL_NAMES[level]) {
      sanitized.levelName = LOG_LEVEL_NAMES[level];
    }
    
    return JSON.stringify(sanitized, this.replacer, this.space);
  }

  public getContentType(): string {
    return 'application/json';
  }

  private sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      // Remove stack trace if not included
      if (key === 'stack' && !this.includeStack) continue;

      // Mask sensitive data if enabled
      if (this.maskSensitiveData && this.isSensitiveKey(key)) {
        result[key] = this.maskValue(value);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.sanitizeObject(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private isSensitiveKey(key: string): boolean {
    return this.sensitiveKeys.some(sensitiveKey =>
      key.toLowerCase().includes(sensitiveKey.toLowerCase())
    );
  }

  private maskValue(value: any): string {
    if (value === null || value === undefined) return value;
    
    if (typeof value === 'string') {
      if (value.length <= 4) return '****';
      return value.substring(0, 2) + '****' + value.substring(value.length - 2);
    }
    
    return '****';
  }
}