import { LogEntry } from '@/types/shared/infrastructure/logging';
import { MongoClient, Db, Collection } from 'mongodb';
import { ILogStrategy } from '../interfaces/ILogger';

/**
 * Database logging strategy - single responsibility for database output
 */
export class DatabaseLogStrategy implements ILogStrategy {
  public readonly name = 'database';
  public readonly outputType = 'database';
  
  private client?: MongoClient;
  private db?: Db;
  private collection?: Collection<LogEntry>;
  private buffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private isClosed = false;

  constructor(
    private readonly connectionString: string,
    private readonly databaseName: string,
    private readonly collectionName: string = 'logs',
    private readonly bufferSize: number = 50,
    private readonly flushInterval: number = 3000 // 3 seconds
  ) {
    this.startFlushTimer();
  }

  async write(entry: LogEntry): Promise<void> {
    if (this.isClosed) {
      throw new Error('Database log strategy is closed');
    }

    // Clone entry to avoid mutations
    const dbEntry = { ...entry };
    this.buffer.push(dbEntry);

    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0 || this.isClosed) {
      return;
    }

    try {
      await this.ensureConnection();
      
      const entriesToFlush = [...this.buffer];
      this.buffer = [];

      await this.collection!.insertMany(entriesToFlush);
    } catch (error) {
      console.error('Failed to flush database log buffer:', error);
      // Put entries back in buffer for retry
      this.buffer.unshift(...this.buffer);
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

    if (this.client) {
      await this.client.close();
      this.client = undefined;
      this.db = undefined;
      this.collection = undefined;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.ensureConnection();
      await this.db!.admin().ping();
      return true;
    } catch (error) {
      console.error(`Database log strategy health check failed: ${error instanceof Error ? error.message : String(error)}`, {
        strategy: this.name,
        connectionString: this.connectionString.replace(/\/\/.*@/, '//***@'),
        databaseName: this.databaseName,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
      });
      return false;
    }
  }

  private async ensureConnection(): Promise<void> {
    if (this.client && this.collection) {
      return;
    }

    this.client = new MongoClient(this.connectionString);
    await this.client.connect();
    
    this.db = this.client.db(this.databaseName);
    this.collection = this.db.collection<LogEntry>(this.collectionName);

    // Create indexes for better query performance
    await this.createIndexes();
  }

  private async createIndexes(): Promise<void> {
    if (!this.collection) return;

    await Promise.all([
      this.collection.createIndex({ timestamp: -1 }),
      this.collection.createIndex({ level: 1, timestamp: -1 }),
      this.collection.createIndex({ context: 1, timestamp: -1 }),
      this.collection.createIndex({ correlationId: 1 }),
      this.collection.createIndex({ userId: 1, timestamp: -1 }),
      this.collection.createIndex({ organizationId: 1, timestamp: -1 })
    ]);
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(error => {
        console.error('Scheduled database flush failed:', error);
      });
    }, this.flushInterval);
  }
}