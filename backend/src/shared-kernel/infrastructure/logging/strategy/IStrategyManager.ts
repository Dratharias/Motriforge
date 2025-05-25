import { ILogStrategy, ILogFormatter } from '../interfaces/ILogger';

export interface IStrategyManager {
  addStrategy(strategy: ILogStrategy): void;
  removeStrategy(name: string): void;
  getStrategy(name: string): ILogStrategy | undefined;
  getAllStrategies(): readonly ILogStrategy[];
  addFormatter(formatter: ILogFormatter): void;
  getFormatter(name: string): ILogFormatter | undefined;
  checkHealth(): Promise<Record<string, boolean>>;
  flush(): Promise<void>;
  close(): Promise<void>;
}

