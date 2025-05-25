import { promises as fs } from 'fs';
import { dirname } from 'path';
import { ILogFormatter, ILogStrategy } from '../interfaces/ILogger';
import { LogEntry } from '@/types/shared/infrastructure/logging';

/**
 * File logging strategy - single responsibility for file output
 */
export class FileLogStrategy implements ILogStrategy {
  public readonly name = 'file';
  public readonly outputType = 'file';
  
  private fileHandle?: fs.FileHandle;
  private buffer: string[] = [];
  private flushTimer?: NodeJS.Timeout;
  private isClosed = false;

  constructor(
    private readonly filePath: string,
    private readonly formatter: ILogFormatter,
    private readonly bufferSize: number = 100,
    private readonly flushInterval: number = 5000, // 5 seconds
    private readonly maxFileSize: number = 100 * 1024 * 1024, // 100MB
    private readonly enableRotation: boolean = true
  ) {
    this.startFlushTimer();
  }

  async write(entry: LogEntry): Promise<void> {
    if (this.isClosed) {
      throw new Error('File log strategy is closed');
    }

    const formatted = this.formatter.format(entry);
    this.buffer.push(typeof formatted === 'string' ? formatted : formatted.toString());

    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0 || this.isClosed) {
      return;
    }

    try {
      await this.ensureFileHandle();
      
      const content = this.buffer.join('\n') + '\n';
      await this.fileHandle!.write(content);
      await this.fileHandle!.sync();
      
      this.buffer = [];

      // Check for rotation
      if (this.enableRotation) {
        await this.checkRotation();
      }
    } catch (error) {
      console.error('Failed to flush file log buffer:', error);
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

    if (this.fileHandle) {
      await this.fileHandle.close();
      this.fileHandle = undefined;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.ensureFileHandle();
      
      // Additional check: verify we can actually write to the file
      const testData = Buffer.from('health-check\n');
      await this.fileHandle!.write(testData);
      await this.fileHandle!.sync();
      
      return true;
    } catch (error) {
      console.error(`File log strategy health check failed: ${error instanceof Error ? error.message : String(error)}`, {
        strategy: this.name,
        filePath: this.filePath,
        bufferSize: this.buffer.length,
        isClosed: this.isClosed,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          code: (error as any).code,
          errno: (error as any).errno,
          path: (error as any).path
        } : error
      });
      return false;
    }
  }

  private async ensureFileHandle(): Promise<void> {
    if (this.fileHandle) {
      return;
    }

    // Ensure directory exists
    const dir = dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });

    // Open file for appending
    this.fileHandle = await fs.open(this.filePath, 'a');
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(error => {
        console.error('Scheduled flush failed:', error);
      });
    }, this.flushInterval);
  }

  private async checkRotation(): Promise<void> {
    if (!this.fileHandle) return;

    try {
      const stats = await this.fileHandle.stat();
      if (stats.size >= this.maxFileSize) {
        await this.rotateFile();
      }
    } catch (error) {
      console.error('Failed to check file size for rotation:', error);
    }
  }

  private async rotateFile(): Promise<void> {
    if (!this.fileHandle) return;

    try {
      // Close current file
      await this.fileHandle.close();
      this.fileHandle = undefined;

      // Rename current file with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedPath = `${this.filePath}.${timestamp}`;
      await fs.rename(this.filePath, rotatedPath);

      // File handle will be recreated on next write
    } catch (error) {
      console.error('Failed to rotate log file:', error);
      throw error;
    }
  }
}

