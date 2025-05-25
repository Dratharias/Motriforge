import { ILogStrategy, ILogFormatter } from '../interfaces/ILogger';
import { IStrategyManager } from './IStrategyManager';

/**
 * Strategy Manager - Single responsibility: managing logging strategies and formatters
 */
export class StrategyManager implements IStrategyManager {
  private readonly strategies: Map<string, ILogStrategy> = new Map();
  private readonly formatters: Map<string, ILogFormatter> = new Map();

  addStrategy(strategy: ILogStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  removeStrategy(name: string): void {
    this.strategies.delete(name);
  }

  getStrategy(name: string): ILogStrategy | undefined {
    return this.strategies.get(name);
  }

  getAllStrategies(): readonly ILogStrategy[] {
    return Array.from(this.strategies.values());
  }

  addFormatter(formatter: ILogFormatter): void {
    this.formatters.set(formatter.name, formatter);
  }

  getFormatter(name: string): ILogFormatter | undefined {
    return this.formatters.get(name);
  }

  async checkHealth(): Promise<Record<string, boolean>> {
    const healthPromises = Array.from(this.strategies.entries()).map(async ([name, strategy]) => {
      const healthy = await strategy.isHealthy();
      return [name, healthy] as const;
    });

    const results = await Promise.allSettled(healthPromises);
    const healthStatus: Record<string, boolean> = {};

    results.forEach((result, index) => {
      const strategyName = Array.from(this.strategies.keys())[index];
      healthStatus[strategyName] = result.status === 'fulfilled' ? result.value[1] : false;
    });

    return healthStatus;
  }

  async flush(): Promise<void> {
    const flushPromises = Array.from(this.strategies.values()).map(strategy => 
      strategy.flush().catch(error => 
        console.error(`Failed to flush strategy ${strategy.name}:`, error)
      )
    );

    await Promise.allSettled(flushPromises);
  }

  async close(): Promise<void> {
    await this.flush();

    const closePromises = Array.from(this.strategies.values()).map(strategy =>
      strategy.close().catch(error =>
        console.error(`Failed to close strategy ${strategy.name}:`, error)
      )
    );

    await Promise.allSettled(closePromises);
    this.strategies.clear();
  }
}

