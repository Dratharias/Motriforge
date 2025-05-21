export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
  SILENT = 6
}

export const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.TRACE]: 'TRACE',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
  [LogLevel.SILENT]: 'SILENT',
};

export function getLogLevelFromString(level: string): LogLevel {
  const upperLevel = level.toUpperCase();
  const entry = Object.entries(LOG_LEVEL_NAMES).find(([, name]) => name === upperLevel);
  return entry ? Number(entry[0]) as LogLevel : LogLevel.INFO;
}