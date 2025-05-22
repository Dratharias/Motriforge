export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
  SILENT = 6,
}

// Reverse mapping for LogLevel (numeric -> string)
export const LOG_LEVEL_NAMES: Record<LogLevel, keyof typeof LogLevel> = {
  [LogLevel.TRACE]: 'TRACE',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
  [LogLevel.SILENT]: 'SILENT',
};

// Type for string-based log level keys
export type LogLevelValue = keyof typeof LogLevel;

/**
 * Returns the corresponding LogLevel enum from a string.
 * Defaults to LogLevel.INFO if not matched.
 *
 * @param level - The string representation of the log level
 * @returns LogLevel enum
 */
export function getLogLevelFromString(level: string): LogLevel {
  const upperLevel = level.toUpperCase() as LogLevelValue;
  if (upperLevel in LogLevel) {
    return LogLevel[upperLevel];
  }
  return LogLevel.INFO;
}
