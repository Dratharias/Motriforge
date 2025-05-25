import { LogEntry } from "@/types/shared/infrastructure/logging";
import { ILogStrategy } from "../interfaces/ILogger";

/**
 * Caching decorator for log strategies - single responsibility for caching
 */
export class CachingLogDecorator implements ILogStrategy {
  public readonly name: string;
  public readonly outputType: string;

  private readonly cache: Map<string, LogEntry> = new Map();
  private readonly maxCacheSize: number;

  constructor(
    private readonly decoratedStrategy: ILogStrategy,
    maxCacheSize: number = 1000
  ) {
    this.name = `cached-${decoratedStrategy.name}`;
    this.outputType = decoratedStrategy.outputType;
    this.maxCacheSize = maxCacheSize;
  }

  async write(entry: LogEntry): Promise<void> {
    // Add to cache
    this.addToCache(entry);
    
    // Delegate to decorated strategy
    await this.decoratedStrategy.write(entry);
  }

  async flush(): Promise<void> {
    await this.decoratedStrategy.flush();
  }

  async close(): Promise<void> {
    this.cache.clear();
    await this.decoratedStrategy.close();
  }

  async isHealthy(): Promise<boolean> {
    return await this.decoratedStrategy.isHealthy();
  }

  /**
   * Get cached log entries
   */
  getCachedEntries(): LogEntry[] {
    return Array.from(this.cache.values());
  }

  /**
   * Get cached entry by ID
   */
  getCachedEntry(id: string): LogEntry | undefined {
    return this.cache.get(id);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  private addToCache(entry: LogEntry): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(entry.id.toHexString(), entry);
  }
}

