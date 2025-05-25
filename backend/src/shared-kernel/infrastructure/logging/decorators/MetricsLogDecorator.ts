import { LogEntry } from "@/types/shared/infrastructure/logging";
import { ILogStrategy } from "../interfaces/ILogger";

/**
 * Metrics decorator for log strategies - single responsibility for metrics collection
 */
export class MetricsLogDecorator implements ILogStrategy {
  public readonly name: string;
  public readonly outputType: string;

  private metrics = {
    totalLogs: 0,
    logsByLevel: new Map<string, number>(),
    logsByContext: new Map<string, number>(),
    errors: 0,
    avgWriteTime: 0,
    writeTimes: [] as number[]
  };

  constructor(
    private readonly decoratedStrategy: ILogStrategy,
    private readonly maxWriteTimeSamples: number = 100
  ) {
    this.name = `metrics-${decoratedStrategy.name}`;
    this.outputType = decoratedStrategy.outputType;
  }

  async write(entry: LogEntry): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.decoratedStrategy.write(entry);
      this.recordSuccess(entry, Date.now() - startTime);
    } catch (error) {
      this.recordError(entry, error as Error);
      throw error;
    }
  }

  async flush(): Promise<void> {
    await this.decoratedStrategy.flush();
  }

  async close(): Promise<void> {
    await this.decoratedStrategy.close();
  }

  async isHealthy(): Promise<boolean> {
    return await this.decoratedStrategy.isHealthy();
  }

  /**
   * Get collected metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      logsByLevel: Object.fromEntries(this.metrics.logsByLevel),
      logsByContext: Object.fromEntries(this.metrics.logsByContext)
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalLogs: 0,
      logsByLevel: new Map(),
      logsByContext: new Map(),
      errors: 0,
      avgWriteTime: 0,
      writeTimes: []
    };
  }

  private recordSuccess(entry: LogEntry, writeTime: number): void {
    this.metrics.totalLogs++;
    
    // Track by level
    const levelCount = this.metrics.logsByLevel.get(entry.level) ?? 0;
    this.metrics.logsByLevel.set(entry.level, levelCount + 1);
    
    // Track by context
    const contextCount = this.metrics.logsByContext.get(entry.context) ?? 0;
    this.metrics.logsByContext.set(entry.context, contextCount + 1);
    
    // Track write times
    this.metrics.writeTimes.push(writeTime);
    if (this.metrics.writeTimes.length > this.maxWriteTimeSamples) {
      this.metrics.writeTimes.shift();
    }
    
    // Calculate average write time
    this.metrics.avgWriteTime = this.metrics.writeTimes.reduce((a, b) => a + b, 0) / this.metrics.writeTimes.length;
  }

  private recordError(_entry: LogEntry, error: Error): void {
    this.metrics.errors++;
    console.error(`Metrics decorator recorded error for ${this.decoratedStrategy.name}:`, error);
  }
}