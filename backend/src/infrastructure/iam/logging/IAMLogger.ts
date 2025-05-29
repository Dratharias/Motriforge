import { ResourceType, Action, Severity } from '../../../types/core/enums';
import { IEvent } from '../../../types/core/interfaces';
import { LogEntry, Logger, LogLevel } from '../../logging/base/Logger';
import { IAccessLogEntry } from '../permissions/core/interfaces';

export class IAMLogger extends Logger {
  private readonly accessHistory: IAccessLogEntry[] = [];
  private readonly maxHistorySize: number = 1000;

  constructor(context: string = 'IAM') {
    super(context, LogLevel.INFO);
  }

  protected writeLog(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toString().padEnd(8);
    const context = entry.context ? `[${entry.context}]` : '';
    const message = entry.message;

    let logLine = `${timestamp} ${level} ${context} ${message}`;

    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      logLine += ` ${JSON.stringify(entry.metadata)}`;
    }

    switch (entry.level) {
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(logLine);
        break;
      case LogLevel.WARN:
        console.warn(logLine);
        break;
      case LogLevel.DEBUG:
        console.debug(logLine);
        break;
      case LogLevel.INFO:
      default:
        console.log(logLine);
        break;
    }
  }

  logDecision(
    userId: string,
    resource: ResourceType,
    action: Action,
    granted: boolean,
    reason?: string
  ): void {
    const entry: IAccessLogEntry = {
      userId,
      resource,
      action,
      granted,
      reason,
      timestamp: new Date()
    };

    // Add to history
    this.accessHistory.push(entry);
    if (this.accessHistory.length > this.maxHistorySize) {
      this.accessHistory.shift();
    }

    // Log the decision
    const because = reason ? ` - ${reason}` : '';
    const message = `${granted ? 'GRANTED' : 'DENIED'}: ${userId} ${action} ${resource}${because}`;
    
    this.log(message, granted ? Severity.INFO : Severity.WARN, {
      userId,
      resource,
      action,
      granted,
      reason
    });
  }

  logSharing(
    ownerId: string,
    targetUserId: string,
    resourceType: ResourceType,
    action: Action
  ): void {
    const message = `SHARING: ${ownerId} shared ${resourceType} with ${targetUserId} (${action})`;
    this.log(message, Severity.INFO, {
      ownerId,
      targetUserId,
      resourceType,
      action
    });
  }

  logSecurityEvent(event: IEvent): void {
    const message = `SECURITY: ${event.type} - ${event.source}`;
    this.log(message, Severity.WARN, {
      eventId: event.id,
      userId: event.originUserId,
      payload: event.payload
    });
  }

  getAccessHistory(userId: string, limit?: number): readonly IAccessLogEntry[] {
    const userHistory = this.accessHistory.filter(entry => entry.userId === userId);
    if (limit) {
      return userHistory.slice(-limit);
    }
    return userHistory;
  }

  getRecentDecisions(limit: number = 50): readonly IAccessLogEntry[] {
    return this.accessHistory.slice(-limit);
  }

  clearHistory(): void {
    this.accessHistory.length = 0;
  }
}