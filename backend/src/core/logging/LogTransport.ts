import { LogEntry } from './LogEntry';
import { LogLevel } from './LogLevel';

export interface LogTransport {
  id: string;
  enabled: boolean;
  minLevel: LogLevel;
  transport(entry: LogEntry): Promise<void>;
  flush(): Promise<void>;
  close(): Promise<void>;
}

export interface TransportConfig {
  id: string;
  enabled?: boolean;
  minLevel?: LogLevel | string;
  [key: string]: any;
}