import { LogEntry } from "@/types/shared/infrastructure/logging";

export class TextLogFormattingStrategy implements ILogFormattingStrategy {
  format(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const context = entry.correlationId ? `[${entry.correlationId}]` : '';
    
    let formatted = `${timestamp} ${level} ${context} ${entry.message}`;
    
    if (entry.data) {
      formatted += ` | data: ${JSON.stringify(entry.data)}`;
    }
    
    if (entry.error) {
      formatted += ` | error: ${entry.error.message}`;
      if (entry.error.stack) {
        formatted += `\n${entry.error.stack}`;
      }
    }
    
    return formatted;
  }
}

// ===== DECORATOR PATTERN FOR LOG ENRICHMENT =====

