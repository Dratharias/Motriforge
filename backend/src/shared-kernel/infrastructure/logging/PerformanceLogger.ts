import { LogLevel } from '@/types/shared/common';
import { ApplicationContext } from '@/types/shared/enums/common';
import { LogContext, PerformanceLogEntry } from '@/types/shared/infrastructure/logging';
import { ILogger, IPerformanceLogger, IPerformanceTimer } from './interfaces/ILogger';

/**
 * Performance Logger - single responsibility for performance monitoring
 */
export class PerformanceLogger implements IPerformanceLogger {
  constructor(
    private readonly baseLogger: ILogger,
    public readonly name: string = 'performance'
  ) {}

  startTimer(operationName: string, context?: LogContext): IPerformanceTimer {
    return new PerformanceTimer(operationName, this, context);
  }

  async logPerformance(entry: Omit<PerformanceLogEntry, 'id' | 'timestamp'>): Promise<void> {

    await this.baseLogger.log(
      entry.level,
      `PERFORMANCE: ${entry.operationName} completed in ${entry.duration}ms`,
      {
        operationName: entry.operationName,
        startTime: entry.startTime.toISOString(),
        endTime: entry.endTime.toISOString(),
        duration: entry.duration,
        memoryUsage: entry.memoryUsage,
        cpuUsage: entry.cpuUsage,
        ioOperations: entry.ioOperations,
        networkOperations: entry.networkOperations,
        ...entry.data
      },
      {
        applicationContext: entry.context,
        correlationId: entry.correlationId,
        userId: entry.userId,
        organizationId: entry.organizationId,
        sessionId: entry.sessionId,
        requestId: entry.requestId
      }
    );
  }

  async measureAsync<T>(operationName: string, operation: () => Promise<T>, context?: LogContext): Promise<T> {
    const timer = this.startTimer(operationName, context);
    try {
      const result = await operation();
      await timer.stop();
      return result;
    } catch (error) {
      await timer.stop({ error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  measureSync<T>(operationName: string, operation: () => T, context?: LogContext): T {
    const timer = this.startTimer(operationName, context);
    try {
      const result = operation();
      timer.stop();
      return result;
    } catch (error) {
      timer.stop({ error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}

/**
 * Performance Timer implementation
 */
class PerformanceTimer implements IPerformanceTimer {
  private data: Record<string, any> = {};
  private stopped = false;

  constructor(
    public readonly operationName: string,
    private readonly performanceLogger: PerformanceLogger,
    private readonly context?: LogContext,
    public readonly startTime: Date = new Date()
  ) {}

  async stop(data?: any): Promise<void> {
    if (this.stopped) return;
    
    this.stopped = true;
    const endTime = new Date();
    const duration = endTime.getTime() - this.startTime.getTime();

    await this.performanceLogger.logPerformance({
      level: LogLevel.DEBUG,
      message: `Performance measurement for ${this.operationName}`,
      context: this.context?.applicationContext ?? ApplicationContext.USER,
      correlationId: this.context?.correlationId,
      userId: this.context?.userId,
      organizationId: this.context?.organizationId,
      sessionId: this.context?.sessionId,
      requestId: this.context?.requestId,
      operationName: this.operationName,
      startTime: this.startTime,
      endTime,
      duration,
      data: { ...this.data, ...data }
    });
  }

  addData(key: string, value: any): void {
    this.data[key] = value;
  }

  addMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    this.data.memoryUsage = {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss
    };
  }

  addCpuUsage(): void {
    const cpuUsage = process.cpuUsage();
    this.data.cpuUsage = {
      user: cpuUsage.user,
      system: cpuUsage.system
    };
  }
}