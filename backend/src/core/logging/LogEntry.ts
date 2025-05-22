import { LogContext } from "@/types/common";
import { LogEntry, LogLevel } from "@/types/logging";


export function createLogEntry(
  level: LogLevel,
  message: string,
  context: LogContext,
  options: Partial<Omit<LogEntry, 'timestamp' | 'level' | 'message' | 'context'>> = {}
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date(),
    level,
    message,
    context,
    ...options
  };
  
  // Copy context fields into top-level properties for easier access
  if (context.requestId) entry.requestId = context.requestId;
  if (context.userId) entry.userId = context.userId;
  if (context.organizationId) entry.organizationId = context.organizationId;
  if (context.sessionId) entry.sessionId = context.sessionId;
  if (context.correlationId) entry.correlationId = context.correlationId;
  if (context.component) entry.component = context.component;
  
  return entry;
}