import { LogLevel, TransportConfig } from ".";

export interface LogConfig {
  defaultLevel: LogLevel | string;
  enabledTransports: string[];
  transports: Record<string, TransportConfig>;
  formatter?: any;  // FormatterConfig
  context?: any;    // ContextConfig
  sampling?: any;   // SamplingConfig
  redaction?: any;  // RedactionConfig
}