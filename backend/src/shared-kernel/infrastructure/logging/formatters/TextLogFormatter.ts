import { Types } from "mongoose";
import { LogEntry } from "@/types/shared/infrastructure/logging";
import { ILogFormatter } from "../interfaces/ILogger";

/**
 * Text log formatter - single responsibility for human-readable text formatting
 */
export class TextLogFormatter implements ILogFormatter {
  public readonly name = 'text';

  constructor(
    private readonly includeTimestamp: boolean = true,
    private readonly includeContext: boolean = true,
    private readonly includeMetadata: boolean = false,
    private readonly dateFormat: string = 'ISO'
  ) {}

  format(entry: LogEntry): string {
    const parts: string[] = [];

    // Timestamp
    if (this.includeTimestamp) {
      const timestamp = this.dateFormat === 'ISO' 
        ? entry.timestamp.toISOString()
        : entry.timestamp.toLocaleString();
      parts.push(`[${timestamp}]`);
    }

    // Level
    parts.push(`[${entry.level.toUpperCase()}]`);

    // Context
    if (this.includeContext && entry.context) {
      parts.push(`[${entry.context}]`);
    }

    // Correlation ID
    if (entry.correlationId) {
      parts.push(`[${entry.correlationId.substring(0, 8)}]`);
    }

    // Message
    parts.push(entry.message);

    // Data
    if (entry.data) {
      parts.push(`- Data: ${JSON.stringify(entry.data)}`);
    }

    // Error
    if (entry.error) {
      parts.push(`- Error: ${entry.error.name}: ${entry.error.message}`);
      if (entry.error.stack) {
        parts.push(`\n${entry.error.stack}`);
      }
    }

    // Metadata
    if (this.includeMetadata && entry.metadata) {
      parts.push(`- Metadata: ${JSON.stringify(entry.metadata)}`);
    }

    return parts.join(' ');
  }

  parse(data: string): LogEntry {
    // Basic parsing for text format (simplified)
    const timestampMatch = data.match(/\[([^\]]+)\]/);
    const levelMatch = data.match(/\[([A-Z]+)\]/);
    const messageMatch = data.match(/\] (.+?)(?:\s-\s|$)/);

    return {
      id: new Types.ObjectId(),
      timestamp: timestampMatch ? new Date(timestampMatch[1]) : new Date(),
      level: levelMatch ? levelMatch[1].toLowerCase() as any : 'info',
      message: messageMatch ? messageMatch[1] : data,
      context: 'user' as any,
      metadata: {
        source: 'text-parser',
        version: '1.0.0',
        environment: 'unknown',
        hostname: 'unknown',
        pid: 0
      }
    };
  }
}

