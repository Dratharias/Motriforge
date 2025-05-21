import { LogFormatter } from '../LogFormatter';
import { LogEntry } from '../LogEntry';
import { LOG_LEVEL_NAMES } from '../LogLevel';

export interface SimpleFormatterOptions {
  template?: string;
  dateFormat?: string;
  colorize?: boolean;
}

export class SimpleFormatter implements LogFormatter {
  private readonly template: string;
  private readonly dateFormat: string;
  private readonly colorize: boolean;

  // ANSI color codes for terminal output
  private readonly colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
  };

  constructor(options: SimpleFormatterOptions = {}) {
    this.template = options.template ??
      '{{timestamp}} [{{level}}] {{component}}{{requestId}}: {{message}}';
    this.dateFormat = options.dateFormat ?? 'ISO';
    this.colorize = options.colorize ?? true;
  }

  public format(entry: LogEntry): string {
    let formatted = this.template;
    
    // Replace common placeholders
    formatted = formatted.replace('{{timestamp}}', this.formatDate(entry.timestamp));
    formatted = formatted.replace('{{level}}', LOG_LEVEL_NAMES[entry.level]);
    formatted = formatted.replace('{{message}}', entry.message);
    
    // Format component
    const component = entry.component ? `[${entry.component}]` : '';
    formatted = formatted.replace('{{component}}', component);
    
    // Format requestId
    const requestId = entry.requestId ? `(${entry.requestId})` : '';
    formatted = formatted.replace('{{requestId}}', requestId);
    
    // Replace other context values
    if (entry.userId) {
      formatted = formatted.replace('{{userId}}', entry.userId);
    }
    
    if (entry.organizationId) {
      formatted = formatted.replace('{{organizationId}}', entry.organizationId);
    }
    
    // Handle error
    if (entry.error) {
      const errorInfo = entry.error.stack ?? `${entry.error.name}: ${entry.error.message}`;
      formatted = formatted.replace('{{error}}', errorInfo);
    } else {
      formatted = formatted.replace('{{error}}', '');
    }
    
    // Apply color if enabled
    if (this.colorize) {
      formatted = this.colorizeByLevel(formatted, entry.level);
    }
    
    return formatted;
  }

  public getContentType(): string {
    return 'text/plain';
  }

  private formatDate(date: Date): string {
    if (this.dateFormat === 'ISO') {
      return date.toISOString();
    }
    
    if (this.dateFormat === 'locale') {
      return date.toLocaleString();
    }
    
    // Custom format could be implemented here
    return date.toISOString();
  }

  private colorizeByLevel(message: string, level: number): string {
    switch (level) {
      case 0: // TRACE
        return `${this.colors.dim}${message}${this.colors.reset}`;
      case 1: // DEBUG
        return `${this.colors.cyan}${message}${this.colors.reset}`;
      case 2: // INFO
        return `${this.colors.green}${message}${this.colors.reset}`;
      case 3: // WARN
        return `${this.colors.yellow}${message}${this.colors.reset}`;
      case 4: // ERROR
        return `${this.colors.red}${message}${this.colors.reset}`;
      case 5: // FATAL
        return `${this.colors.bright}${this.colors.red}${message}${this.colors.reset}`;
      default:
        return message;
    }
  }
}