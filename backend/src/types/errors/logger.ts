import { ErrorContext } from "@/core/error/ErrorContext";
import { ErrorSeverity } from "@/core/error/ErrorLoggerService";

export interface ErrorLogEntry {
  error: Error;
  context?: ErrorContext;
  severity: ErrorSeverity;
  timestamp: Date;
  formattedError: Record<string, any>;
}

export interface ErrorLoggerConfig {
  maxLogEntries?: number;
  includeStack?: boolean;
  maskSensitiveData?: boolean;
  sensitiveKeys?: string[];
  enableMetrics?: boolean;
}