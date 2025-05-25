import { LogHealthStatus, LogHealthReport, StrategyHealthDetail, LogPerformanceMetrics } from '@/types/shared/infrastructure/logging';
import { 
  ILogHealthChecker, 
} from '../interfaces/ILogger';
import { IStrategyManager } from '../strategy/IStrategyManager';

/**
 * Log Health Checker - Single responsibility: checking logging system health
 */
export class LogHealthChecker implements ILogHealthChecker {
  constructor(private readonly strategyManager: IStrategyManager) {}

  async checkHealth(): Promise<LogHealthStatus> {
    const strategies = await this.strategyManager.checkHealth();
    const healthy = Object.values(strategies).every(status => status);
    const errors: string[] = [];

    Object.entries(strategies).forEach(([name, status]) => {
      if (!status) {
        errors.push(`Strategy '${name}' is unhealthy`);
      }
    });

    return {
      healthy,
      strategies,
      errors,
      timestamp: new Date()
    };
  }

  async checkStrategyHealth(strategyName: string): Promise<boolean> {
    const strategy = this.strategyManager.getStrategy(strategyName);
    if (!strategy) {
      return false;
    }
    return await strategy.isHealthy();
  }

  async getHealthReport(): Promise<LogHealthReport> {
    const overall = await this.checkHealth();
    const strategies: Record<string, StrategyHealthDetail> = {};

    for (const strategyName of Object.keys(overall.strategies)) {
      const strategy = this.strategyManager.getStrategy(strategyName);
      if (strategy) {
        strategies[strategyName] = {
          healthy: overall.strategies[strategyName],
          lastWrite: new Date(), // This would be tracked in a real implementation
          errorCount: 0, // This would be tracked in a real implementation
          latency: 0 // This would be tracked in a real implementation
        };
      }
    }

    const performance: LogPerformanceMetrics = {
      logsPerSecond: 0, // This would be calculated from metrics
      averageLatency: 0, // This would be calculated from metrics
      queueSize: 0, // This would be tracked in strategies
      memoryUsage: process.memoryUsage().heapUsed
    };

    return {
      overall,
      strategies,
      performance
    };
  }
}