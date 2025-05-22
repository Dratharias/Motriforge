import { LogLevel } from "@/types/logging";

export class LogMetrics {
  private readonly counters: Map<string, number> = new Map();
  private readonly gauges: Map<string, () => number> = new Map();
  private readonly histograms: Map<string, number[]> = new Map();
  private readonly metricRegistry: any = null; // This would be connected to your metrics system
  
  private readonly DEFAULT_WINDOW_SIZE = 100; // for histograms

  constructor() {
    // Initialize default metrics
    this.counters.set('logs.total', 0);
    Object.values(LogLevel).forEach(level => {
      if (typeof level === 'number') {
        this.counters.set(`logs.level.${LogLevel[level].toLowerCase()}`, 0);
      }
    });
    
    this.gauges.set('logs.rate.1m', () => this.getLogRate(60 * 1000));
    
    this.histograms.set('logs.size', []);
  }

  public incrementCounter(name: string, value: number = 1): void {
    const current = this.counters.get(name) ?? 0;
    this.counters.set(name, current + value);
  }

  public setGauge(name: string, value: number | (() => number)): void {
    if (typeof value === 'function') {
      this.gauges.set(name, value);
    } else {
      this.gauges.set(name, () => value);
    }
  }

  public recordValue(name: string, value: number): void {
    const values = this.histograms.get(name) || [];
    
    // Maintain a fixed window size for performance
    if (values.length >= this.DEFAULT_WINDOW_SIZE) {
      values.shift(); // Remove oldest value
    }
    
    values.push(value);
    this.histograms.set(name, values);
  }

  public getMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};
    
    // Add counters
    for (const [name, value] of this.counters.entries()) {
      metrics[name] = value;
    }
    
    // Add gauges
    for (const [name, getter] of this.gauges.entries()) {
      try {
        metrics[name] = getter();
      } catch (error) {
        console.error(`Failed to collect metric "${name}":`, error);
        metrics[name] = null;
      }
    }
    
    // Add histogram stats
    for (const [name, values] of this.histograms.entries()) {
      if (values.length === 0) continue;
      
      const sorted = [...values].sort((a, b) => a - b);
      metrics[`${name}.avg`] = values.reduce((sum, val) => sum + val, 0) / values.length;
      metrics[`${name}.min`] = sorted[0];
      metrics[`${name}.max`] = sorted[sorted.length - 1];
      metrics[`${name}.median`] = this.percentile(sorted, 50);
      metrics[`${name}.p95`] = this.percentile(sorted, 95);
      metrics[`${name}.p99`] = this.percentile(sorted, 99);
    }
    
    return metrics;
  }

  public resetMetrics(): void {
    for (const key of this.counters.keys()) {
      this.counters.set(key, 0);
    }
    
    for (const key of this.histograms.keys()) {
      this.histograms.set(key, []);
    }
  }

  public registerWithMetricsSystem(): void {
    if (!this.metricRegistry) {
      console.warn('No metrics registry available for log metrics');
      return;
    }
    
    // This is a placeholder - in a real system, you would register
    // these metrics with your metrics collection system (e.g., Prometheus)
    console.log('Registering log metrics with metrics system');
  }

  private getLogRate(timeWindowMs: number): number {
    const totalLogs = this.counters.get('logs.total') ?? 0;
    // This is simplified - a real implementation would track timestamps
    return totalLogs / (timeWindowMs / 1000);
  }

  private percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0;
    if (sortedValues.length === 1) return sortedValues[0];
    
    const index = Math.ceil((p / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
  }
}