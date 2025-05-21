import { LogTransport, TransportConfig } from '../LogTransport';
import { LogEntry } from '../LogEntry';
import { LogLevel, getLogLevelFromString } from '../LogLevel';
import { LogFormatter } from '../LogFormatter';
import { JsonFormatter } from '../formatters/JsonFormatter';

interface RetryStrategy {
  maxRetries: number;
  initialDelayMs: number;
  backoffMultiplier: number;
}

export interface CloudTransportConfig extends TransportConfig {
  endpoint: string;
  apiKey?: string;
  headers?: Record<string, string>;
  batchSize?: number;
  flushInterval?: number;
  retryStrategy?: RetryStrategy;
  formatter?: LogFormatter;
}

export class CloudTransport implements LogTransport {
  public readonly id: string;
  public enabled: boolean;
  public minLevel: LogLevel;
  
  private readonly endpoint: string;
  private readonly apiKey?: string;
  private readonly headers: Record<string, string>;
  private readonly batchSize: number;
  private readonly flushInterval: number;
  private readonly retryStrategy: RetryStrategy;
  private readonly formatter: LogFormatter;
  
  private readonly queue: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushInProgress = false;

  constructor(config: CloudTransportConfig) {
    this.id = config.id || 'cloud';
    this.enabled = config.enabled !== false;
    this.minLevel = typeof config.minLevel === 'string' 
      ? getLogLevelFromString(config.minLevel) 
      : (config.minLevel ?? LogLevel.INFO);
    
    this.endpoint = config.endpoint;
    this.apiKey = config.apiKey;
    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers
    };
    
    if (this.apiKey) {
      this.headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    
    this.batchSize = config.batchSize ?? 50;
    this.flushInterval = config.flushInterval ?? 5000;  // 5 seconds
    this.retryStrategy = {
      maxRetries: 3,
      initialDelayMs: 1000,
      backoffMultiplier: 2,
      ...config.retryStrategy
    };
    
    this.formatter = config.formatter || new JsonFormatter({ space: 0 });
    
    this.setupFlushInterval();
  }

  public async transport(entry: LogEntry): Promise<void> {
    if (!this.enabled || entry.level < this.minLevel) {
      return;
    }

    this.queue.push(entry);
    
    if (this.queue.length >= this.batchSize) {
      await this.flush();
    }
  }

  public async flush(): Promise<void> {
    if (this.isFlushInProgress || this.queue.length === 0) {
      return;
    }

    this.isFlushInProgress = true;
    
    try {
      // Take a batch of entries
      const batch = this.queue.splice(0, this.batchSize);
      await this.sendBatch(batch);
      
      // If there are still entries in the queue, flush again
      if (this.queue.length > 0) {
        await this.flush();
      }
    } catch (error) {
      // Put failed entries back in the queue
      console.error('Error sending logs to cloud endpoint:', error);
    } finally {
      this.isFlushInProgress = false;
    }
  }

  public async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    return this.flush();
  }

  private setupFlushInterval(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(err => {
        console.error('Error flushing logs to cloud:', err);
      });
    }, this.flushInterval);
  }

  private async sendBatch(entries: LogEntry[]): Promise<void> {
    const payload = entries.map(entry => this.formatter.format(entry));
    
    let retryCount = 0;
    let delay = this.retryStrategy.initialDelayMs;
    
    while (retryCount <= this.retryStrategy.maxRetries) {
      try {
        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(payload),
        });
        
        if (response.ok) {
          return;
        }
        
        // If status is 429 (Too Many Requests), retry with backoff
        if (response.status === 429) {
          retryCount++;
          if (retryCount <= this.retryStrategy.maxRetries) {
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= this.retryStrategy.backoffMultiplier;
            continue;
          }
        }
        
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      } catch (error) {
        retryCount++;
        if (retryCount <= this.retryStrategy.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= this.retryStrategy.backoffMultiplier;
          continue;
        }
        throw error;
      }
    }
    
    throw new Error(`Failed to send logs after ${this.retryStrategy.maxRetries} retries`);
  }
}