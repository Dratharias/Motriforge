import { ErrorInfo } from "@/core/error/ErrorInfo";
import { LogContext } from "../common";
import { LogLevel } from ".";

export interface ClientInfo {
  userAgent?: string;
  ip?: string;
  deviceType?: string;
  browser?: string;
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context: LogContext;
  component?: string;
  error?: ErrorInfo;
  metadata?: Record<string, any>;
  requestId?: string;
  userId?: string;
  organizationId?: string;
  sessionId?: string;
  correlationId?: string;
  resourceId?: string;
  clientInfo?: ClientInfo;
  duration?: number;
}