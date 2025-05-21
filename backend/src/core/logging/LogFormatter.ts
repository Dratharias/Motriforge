import { LogEntry } from './LogEntry';

export interface LogFormatter {
  format(entry: LogEntry): string;
  getContentType(): string;
}