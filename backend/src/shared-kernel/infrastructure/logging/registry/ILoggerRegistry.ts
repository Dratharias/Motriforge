import { ILogger } from '../interfaces/ILogger';

export interface ILoggerRegistry {
  getLogger(name: string): ILogger;
  hasLogger(name: string): boolean;
  removeLogger(name: string): void;
  getAllLoggers(): readonly ILogger[];
  clear(): void;
}

