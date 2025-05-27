import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConsoleLogger } from '../implementations/ConsoleLogger.js';
import { Severity } from '../../../types/core/enums.js';
import { LogLevel } from '../base/Logger.js';

describe('ConsoleLogger', () => {
  let logger: ConsoleLogger;
  let consoleSpy: any;

  beforeEach(() => {
    logger = new ConsoleLogger('test');
    // Set to DEBUG level to capture all messages
    logger.setLevel(LogLevel.DEBUG);
    
    // Mock console methods
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      log: vi.spyOn(console, 'log').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should use appropriate console method for each log level', () => {
    logger.log('Debug message', Severity.DEBUG);
    logger.log('Info message', Severity.INFO);
    logger.log('Warning message', Severity.WARN);
    logger.log('Error message', Severity.ERROR);
    logger.log('Critical message', Severity.CRITICAL);

    expect(consoleSpy.debug).toHaveBeenCalledWith(expect.stringContaining('Debug message'));
    expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringContaining('Info message'));
    expect(consoleSpy.warn).toHaveBeenCalledWith(expect.stringContaining('Warning message'));
    expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('Error message'));
    expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('Critical message'));
  });

  it('should format log entry with timestamp and context', () => {
    logger.log('Test message', Severity.INFO);

    const logCall = consoleSpy.info.mock.calls[0][0];
    expect(logCall).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp
    expect(logCall).toContain('INFO');
    expect(logCall).toContain('[test]');
    expect(logCall).toContain('Test message');
  });

  it('should include metadata in formatted output', () => {
    logger.log('Test with metadata', Severity.INFO, { key: 'value', number: 42 });

    const logCall = consoleSpy.info.mock.calls[0][0];
    expect(logCall).toContain('Test with metadata');
    expect(logCall).toContain('Metadata:');
    expect(logCall).toContain('"key": "value"');
    expect(logCall).toContain('"number": 42');
  });
});

