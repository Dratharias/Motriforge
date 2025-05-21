export class ErrorMetrics {
  private readonly metricCollector: any;
  private readonly errorCounts: Map<string, number>;
  private readonly errorCountsByType: Map<string, number>;
  private readonly errorCountsByStatus: Map<number, number>;
  private readonly errorResponseTimes: Map<string, number[]>;

  constructor(metricCollector?: any) {
    this.metricCollector = metricCollector;
    this.errorCounts = new Map();
    this.errorCountsByType = new Map();
    this.errorCountsByStatus = new Map();
    this.errorResponseTimes = new Map();
  }

  public incrementErrorCount(code: string): void {
    const count = this.errorCounts.get(code) ?? 0;
    this.errorCounts.set(code, count + 1);
    
    // Report to metric collector if available
    if (this.metricCollector) {
      this.metricCollector.incrementCounter(`errors.count.${code}`);
    }
  }

  public recordErrorTypes(error: Error): void {
    const type = error.constructor.name;
    const count = this.errorCountsByType.get(type) ?? 0;
    this.errorCountsByType.set(type, count + 1);
    
    if (this.metricCollector) {
      this.metricCollector.incrementCounter(`errors.types.${type}`);
    }
  }

  public recordStatusCode(statusCode: number): void {
    const count = this.errorCountsByStatus.get(statusCode) ?? 0;
    this.errorCountsByStatus.set(statusCode, count + 1);
    
    if (this.metricCollector) {
      this.metricCollector.incrementCounter(`errors.status.${statusCode}`);
    }
  }

  public recordResponseTime(code: string, durationMs: number): void {
    const times = this.errorResponseTimes.get(code) ?? [];
    times.push(durationMs);
    this.errorResponseTimes.set(code, times);
    
    if (this.metricCollector) {
      this.metricCollector.recordValue(`errors.responseTimes.${code}`, durationMs);
    }
  }

  public getErrorCounts(): Record<string, number> {
    return Object.fromEntries(this.errorCounts);
  }

  public getErrorCountsByType(): Record<string, number> {
    return Object.fromEntries(this.errorCountsByType);
  }

  public getErrorCountsByStatus(): Record<number, number> {
    return Object.fromEntries(this.errorCountsByStatus);
  }

  public getAverageResponseTime(code: string): number {
    const times = this.errorResponseTimes.get(code) ?? [];
    if (times.length === 0) return 0;
    
    const sum = times.reduce((acc, time) => acc + time, 0);
    return sum / times.length;
  }

  public resetMetrics(): void {
    this.errorCounts.clear();
    this.errorCountsByType.clear();
    this.errorCountsByStatus.clear();
    this.errorResponseTimes.clear();
    
    if (this.metricCollector && typeof this.metricCollector.resetMetrics === 'function') {
      this.metricCollector.resetMetrics();
    }
  }
}