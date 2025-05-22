import { LogEntry, LogFormatter, LogLevel } from ".";

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

export interface ConsoleTransportConfig extends TransportConfig {
  colorized?: boolean;
  formatter?: LogFormatter;
}

export interface RetryStrategy {
  maxRetries: number;
  initialDelayMs: number;
  backoffMultiplier: number;
}

export interface FileRotationConfig {
  maxSize?: number; // in bytes
  maxFiles?: number;
  interval?: 'daily' | 'hourly'; // time-based rotation
  compress?: boolean;
}

export interface FileTransportConfig extends TransportConfig {
  path: string;
  formatter?: LogFormatter;
  rotationConfig?: FileRotationConfig;
  flushInterval?: number; // in milliseconds
}