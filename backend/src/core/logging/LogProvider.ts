import { LogEntry } from './LogEntry';

export interface LogProviderCapabilities {
  supportsBatching: boolean;
  supportsAsyncLogging: boolean;
  supportsClustering: boolean;
  supportsStructuredLogs: boolean;
}

export interface LogProvider {
  log(entry: LogEntry): void;
  flush(): Promise<void>;
  getCapabilities(): LogProviderCapabilities;
}