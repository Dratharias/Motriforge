import { Types } from "mongoose";
import { LogLevel } from "@/types/shared/common";
import { ApplicationContext } from "@/types/shared/enums/common";

export interface LogContext {
  readonly correlationId?: string;
  readonly userId?: Types.ObjectId;
  readonly organizationId?: Types.ObjectId;
  readonly sessionId?: string;
  readonly requestId?: string;
  readonly applicationContext?: ApplicationContext;
}

export interface LogMetadata {
  readonly source: string;
  readonly version: string;
  readonly environment: string;
  readonly hostname: string;
  readonly pid: number;
  readonly builtAt: Date;
}

export interface LogEntry {
  readonly id: Types.ObjectId;
  readonly timestamp: Date;
  readonly level: LogLevel;
  readonly message: string;
  readonly context: ApplicationContext;
  readonly correlationId?: string;
  readonly userId?: Types.ObjectId;
  readonly organizationId?: Types.ObjectId;
  readonly sessionId?: string;
  readonly requestId?: string;
  readonly data?: Record<string, any>;
  readonly error?: {
    readonly name: string;
    readonly message: string;
    readonly stack?: string;
  };
  readonly metadata: LogMetadata;
}

export interface ILogger {
  readonly name: string;
  debug(message: string, data?: Record<string, any>, context?: LogContext): Promise<void>;
  info(message: string, data?: Record<string, any>, context?: LogContext): Promise<void>;
  warn(message: string, data?: Record<string, any>, context?: LogContext): Promise<void>;
  logError(message: string, errorInfo?: Error, data?: Record<string, any>, context?: LogContext): Promise<void>;
  fatal(message: string, errorInfo?: Error, data?: Record<string, any>, context?: LogContext): Promise<void>;
  log(level: LogLevel, message: string, data?: Record<string, any>, context?: LogContext): Promise<void>;
}

export interface IFluentLogBuilder<T> {
  withLevel(level: LogLevel): T;
  withMessage(message: string): T;
  withContext(context: LogContext): T;
  withData(data: Record<string, any>): T;
  withError(errorInfo: Error): T;
  debug(message: string): T;
  info(message: string): T;
  warn(message: string): T;
  logError(message: string, errorInfo?: Error): T;
  fatal(message: string, errorInfo?: Error): T;
  build(): LogEntry;
  log(): Promise<void>;
}

// ===== FACADE LAYER =====
