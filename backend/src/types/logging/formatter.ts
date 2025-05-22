import { LogEntry } from ".";

export interface LogFormatter {
  format(entry: LogEntry): string;
  getContentType(): string;
}

export interface SimpleFormatterOptions {
  template?: string;
  dateFormat?: string;
  colorize?: boolean;
}

export interface JsonFormatterOptions {
  replacer?: (key: string, value: any) => any;
  includeStack?: boolean;
  maskSensitiveData?: boolean;
  sensitiveKeys?: string[];
  space?: number | string;
}