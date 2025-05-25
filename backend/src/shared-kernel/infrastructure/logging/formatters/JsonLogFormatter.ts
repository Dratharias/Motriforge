
import { LogEntry } from '@/types/shared/infrastructure/logging';
import { ILogFormatter } from '../interfaces/ILogger';

/**
 * JSON log formatter - single responsibility for JSON formatting
 */
export class JsonLogFormatter implements ILogFormatter {
  public readonly name = 'json';

  constructor(
    private readonly includeStackTrace: boolean = true,
    private readonly prettyPrint: boolean = false
  ) {}

  format(entry: LogEntry): string {
    const formattedEntry = {
      '@timestamp': entry.timestamp.toISOString(),
      level: entry.level.toUpperCase(),
      message: entry.message,
      context: entry.context,
      ...(entry.correlationId && { correlationId: entry.correlationId }),
      ...(entry.userId && { userId: entry.userId.toHexString() }),
      ...(entry.organizationId && { organizationId: entry.organizationId.toHexString() }),
      ...(entry.sessionId && { sessionId: entry.sessionId }),
      ...(entry.requestId && { requestId: entry.requestId }),
      ...(entry.data && { data: entry.data }),
      ...(entry.error && {
        error: {
          name: entry.error.name,
          message: entry.error.message,
          ...(this.includeStackTrace && entry.error.stack && { stack: entry.error.stack }),
          ...(entry.error.code && { code: entry.error.code }),
          ...(entry.error.details && { details: entry.error.details })
        }
      }),
      metadata: entry.metadata
    };

    return this.prettyPrint 
      ? JSON.stringify(formattedEntry, null, 2)
      : JSON.stringify(formattedEntry);
  }

  parse(data: string): LogEntry {
    const parsed = JSON.parse(data);
    
    return {
      id: parsed.id,
      timestamp: new Date(parsed['@timestamp'] ?? parsed.timestamp),
      level: parsed.level.toLowerCase(),
      message: parsed.message,
      context: parsed.context,
      correlationId: parsed.correlationId,
      userId: parsed.userId,
      organizationId: parsed.organizationId,
      sessionId: parsed.sessionId,
      requestId: parsed.requestId,
      data: parsed.data,
      error: parsed.error,
      metadata: parsed.metadata
    };
  }
}

