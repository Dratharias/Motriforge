import { describe, it, expect, beforeEach } from 'vitest';
import { Logger, LogLevel, LogEntry } from '../base/Logger.js';
import { EventType, Severity } from '../../../types/core/enums.js';

class TestLogger extends Logger {
  public logEntries: LogEntry[] = [];

  protected writeLog(entry: LogEntry): void {
    this.logEntries.push(entry);
  }

  getLastEntry(): LogEntry | undefined {
    return this.logEntries[this.logEntries.length - 1];
  }
}

describe('Logger', () => {
  let logger: TestLogger;

  beforeEach(() => {
    logger = new TestLogger('test-context', LogLevel.DEBUG);
  });

  it('should log message with correct level', () => {
    logger.log('Test message', Severity.INFO);
    
    const entry = logger.getLastEntry();
    expect(entry).toBeDefined();
    expect(entry!.message).toBe('[INFO] Test message');
    expect(entry!.level).toBe(LogLevel.INFO);
    expect(entry!.context).toBe('test-context');
  });

  it('should respect log level filtering', () => {
    logger.setLevel(LogLevel.WARN);
    
    logger.log('Debug message', Severity.DEBUG);
    logger.log('Warning message', Severity.WARN);
    
    expect(logger.logEntries).toHaveLength(1);
    // The message should contain '[WARN]' not 'WARNING'
    expect(logger.getLastEntry()!.message).toContain('[WARN]');
  });

  it('should log error with metadata', () => {
    const error = {
      code: 'TEST_ERROR',
      message: 'Test error',
      severity: Severity.ERROR,
      timestamp: new Date(),
      traceId: 'trace-123'
    };

    logger.logError(error, { extra: 'metadata' });
    
    const entry = logger.getLastEntry();
    expect(entry!.message).toBe('Test error');
    expect(entry!.metadata).toMatchObject({
      extra: 'metadata',
      code: 'TEST_ERROR',
      errorTimestamp: error.timestamp.toISOString()
    });
    expect(entry!.traceId).toBe('trace-123');
  });

  it('should log event with payload', () => {
    const event = {
      id: 'event-123',
      type: EventType.USER_ACTION,
      timestamp: new Date(),
      source: 'test',
      payload: { action: 'login' },
      traceId: 'trace-456'
    };

    logger.logEvent(event);
    
    const entry = logger.getLastEntry();
    expect(entry!.message).toBe('Event: USER_ACTION');
    expect(entry!.metadata).toMatchObject({
      eventId: 'event-123',
      eventSource: 'test',
      payload: { action: 'login' }
    });
  });

  it('should convert severity to log level correctly', () => {
    const testCases = [
      { severity: Severity.DEBUG, expected: LogLevel.DEBUG },
      { severity: Severity.INFO, expected: LogLevel.INFO },
      { severity: Severity.WARN, expected: LogLevel.WARN },
      { severity: Severity.ERROR, expected: LogLevel.ERROR },
      { severity: Severity.CRITICAL, expected: LogLevel.CRITICAL }
    ];

    testCases.forEach(({ severity, expected }) => {
      logger.log('Test', severity);
      expect(logger.getLastEntry()!.level).toBe(expected);
    });
  });
});