import { LogEntry } from "@/types/shared/infrastructure/logging";

export class JsonLogFormattingStrategy implements ILogFormattingStrategy {
  format(entry: LogEntry): string {
    return JSON.stringify({
      timestamp: entry.timestamp.toISOString(),
      level: entry.level,
      message: entry.message,
      context: entry.context,
      correlationId: entry.correlationId,
      userId: entry.userId?.toHexString(),
      organizationId: entry.organizationId?.toHexString(),
      sessionId: entry.sessionId,
      requestId: entry.requestId,
      data: entry.data,
      error: entry.error,
      metadata: entry.metadata
    });
  }
}

