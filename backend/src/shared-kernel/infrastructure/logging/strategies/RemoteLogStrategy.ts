import { LogEntry } from "@/types/shared/infrastructure/logging";
import { ILogStrategy, ILogFormatter } from "../interfaces/ILogger";

/**
 * Remote logging strategy - single responsibility for remote log shipping
 */
export class RemoteLogStrategy implements ILogStrategy {
  public readonly name = 'remote';
  public readonly outputType = 'remote';
  
  private buffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private isClosed = false;

  constructor(
    private readonly endpoint: string,
    private readonly apiKey: string,
    private readonly formatter: ILogFormatter,
    private readonly bufferSize: number = 25,
    private readonly flushInterval: number = 2000, // 2 seconds
    private readonly timeout: number = 10000 // 10 seconds
  ) {
    this.startFlushTimer();
  }

  async write(entry: LogEntry): Promise<void> {
    if (this.isClosed) {
      throw new Error('Remote log strategy is closed');
    }

    this.buffer.push(entry);

    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0 || this.isClosed) {
      return;
    }

    const entriesToFlush = [...this.buffer];
    this.buffer = [];

    try {
      const payload = entriesToFlush.map(entry => this.formatter.format(entry));
      
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'User-Agent': 'fitness-app-logger/1.0.0'
        },
        body: JSON.stringify({ logs: payload }),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        throw new Error(`Remote log endpoint returned ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send logs to remote endpoint:', error);
      // Put entries back in buffer for retry
      this.buffer.unshift(...entriesToFlush);
      throw error;
    }
  }

  async close(): Promise<void> {
    this.isClosed = true;
    
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    await this.flush();
  }

  async isHealthy(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.endpoint}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey.substring(0, 8)}...`, // Mask API key in logs
          'User-Agent': 'fitness-app-logger/1.0.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      let errorMessage = 'Unknown error';
      let errorDetails: any = {};

      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = {
          name: error.name,
          message: error.message
        };

        // Handle specific fetch errors
        if (error.name === 'AbortError') {
          errorMessage = 'Health check request timed out';
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
          errorMessage = 'Network error or endpoint unreachable';
        }
      }

      console.error(`Remote log strategy health check failed: ${errorMessage}`, {
        strategy: this.name,
        endpoint: this.endpoint,
        bufferSize: this.buffer.length,
        isClosed: this.isClosed,
        error: errorDetails
      });

      return false;
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(error => {
        console.error('Scheduled remote flush failed:', error);
      });
    }, this.flushInterval);
  }
}