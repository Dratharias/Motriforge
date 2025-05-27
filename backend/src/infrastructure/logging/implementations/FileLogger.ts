import { promises as fs } from 'fs';
import { Logger, LogEntry, LogFormatter } from '../base/Logger';

/**
 * JSON formatter for file logging
 */
export class JsonFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    return JSON.stringify({
      timestamp: entry.timestamp.toISOString(),
      level: entry.level,
      context: entry.context,
      message: entry.message,
      metadata: entry.metadata,
      traceId: entry.traceId,
      userId: entry.userId,
      source: entry.source
    });
  }
}

/**
 * File logger implementation
 */
export class FileLogger extends Logger {
  private readonly filePath: string;
  private readonly maxFileSize: number;
  private readonly rotateCount: number;
  private readonly formatter: LogFormatter;
  private readonly writeQueue: string[] = [];
  private isWriting = false;

  constructor(
    context: string,
    filePath: string,
    maxFileSize: number = 10 * 1024 * 1024, // 10MB
    rotateCount: number = 5,
    formatter?: LogFormatter
  ) {
    super(context);
    this.filePath = filePath;
    this.maxFileSize = maxFileSize;
    this.rotateCount = rotateCount;
    this.formatter = formatter ?? new JsonFormatter();
  }

  protected writeLog(entry: LogEntry): void {
    const formattedMessage = this.formatter.format(entry);
    this.writeQueue.push(formattedMessage);
    
    // Process queue asynchronously
    void this.processWriteQueue();
  }

  /**
   * Process the write queue
   */
  private async processWriteQueue(): Promise<void> {
    if (this.isWriting || this.writeQueue.length === 0) {
      return;
    }

    this.isWriting = true;
    const messages = this.writeQueue.splice(0);

    try {
      // Check if rotation is needed
      await this.checkAndRotate();

      // Write all queued messages
      const content = messages.join('\n') + '\n';
      
      await fs.appendFile(this.filePath, content, 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
      // Re-queue messages for retry
      this.writeQueue.unshift(...messages);
    } finally {
      this.isWriting = false;
      
      // Process any new messages that arrived during writing
      if (this.writeQueue.length > 0) {
        void this.processWriteQueue();
      }
    }
  }

  /**
   * Check if file rotation is needed and rotate if necessary
   */
  private async checkAndRotate(): Promise<void> {
    try {
      const stats = await fs.stat(this.filePath);
      if (stats.size >= this.maxFileSize) {
        await this.rotate();
      }
    } catch (error) {
      // File doesn't exist yet, no rotation needed
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Rotate log files
   */
  async rotate(): Promise<void> {
    try {
      // Remove the oldest log file if it exists
      const oldestFile = `${this.filePath}.${this.rotateCount}`;
      try {
        await fs.unlink(oldestFile);
      } catch {
        // File doesn't exist, ignore
      }

      // Shift all log files
      for (let i = this.rotateCount - 1; i >= 1; i--) {
        const oldFile = `${this.filePath}.${i}`;
        const newFile = `${this.filePath}.${i + 1}`;
        
        try {
          await fs.rename(oldFile, newFile);
        } catch {
          // File doesn't exist, ignore
        }
      }

      // Move current log to .1
      try {
        await fs.rename(this.filePath, `${this.filePath}.1`);
      } catch {
        // File doesn't exist, ignore
      }
    } catch (error) {
      console.error('Failed to rotate log files:', error);
    }
  }

  /**
   * Clean up old log files
   */
  async cleanup(): Promise<void> {
    try {
      for (let i = 1; i <= this.rotateCount; i++) {
        const logFile = `${this.filePath}.${i}`;
        try {
          await fs.unlink(logFile);
        } catch {
          // File doesn't exist, ignore
        }
      }
    } catch (error) {
      console.error('Failed to cleanup log files:', error);
    }
  }
}

