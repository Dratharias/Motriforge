import { promises as fs, createWriteStream, WriteStream } from 'fs';
import path from 'path';
import { LogTransport, TransportConfig } from '../LogTransport';
import { LogEntry } from '../LogEntry';
import { LogLevel, getLogLevelFromString } from '../LogLevel';
import { LogFormatter } from '../LogFormatter';
import { JsonFormatter } from '../formatters/JsonFormatter';

export interface FileRotationConfig {
  maxSize?: number; // in bytes
  maxFiles?: number;
  interval?: 'daily' | 'hourly'; // time-based rotation
  compress?: boolean;
}

export interface FileTransportConfig extends TransportConfig {
  path: string;
  formatter?: LogFormatter;
  rotationConfig?: FileRotationConfig;
  flushInterval?: number; // in milliseconds
}

export class FileTransport implements LogTransport {
  public readonly id: string;
  public enabled: boolean;
  public minLevel: LogLevel;

  private readonly path: string;
  private readonly formatter: LogFormatter;
  private readonly rotationConfig: FileRotationConfig;
  private readonly flushInterval: number;
  
  private fileStream: WriteStream | null = null;
  private queue: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private currentFileSize = 0;
  private lastRotationCheck = 0;

  constructor(config: FileTransportConfig) {
    this.id = config.id || 'file';
    this.enabled = config.enabled !== false;
    this.minLevel = typeof config.minLevel === 'string' 
      ? getLogLevelFromString(config.minLevel) 
      : (config.minLevel ?? LogLevel.INFO);
    
    this.path = config.path;
    this.formatter = config.formatter || new JsonFormatter({ space: 0 });
    this.rotationConfig = {
      maxSize: 10 * 1024 * 1024, // 10MB default
      maxFiles: 5,
      interval: 'daily',
      compress: true,
      ...config.rotationConfig
    };
    this.flushInterval = config.flushInterval ?? 1000; // 1 second default
    
    this.initializeFileStream();
    this.setupFlushInterval();
  }

  public async transport(entry: LogEntry): Promise<void> {
    if (!this.enabled || entry.level < this.minLevel) {
      return;
    }

    this.queue.push(entry);
    
    // If queue gets too large, flush immediately
    if (this.queue.length >= 100) {
      await this.flush();
    }
  }

  public async flush(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    const entries = [...this.queue];
    this.queue = [];

    await this.checkRotation();

    if (!this.fileStream) {
      this.initializeFileStream();
    }

    for (const entry of entries) {
      const formatted = this.formatter.format(entry) + '\n';
      this.fileStream!.write(formatted);
      this.currentFileSize += Buffer.byteLength(formatted);
    }
  }

  public async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    await this.flush();

    if (this.fileStream) {
      return new Promise<void>((resolve) => {
        this.fileStream!.end(() => {
          this.fileStream = null;
          resolve();
        });
      });
    }
  }

  private initializeFileStream(): void {
    // Ensure directory exists
    const dir = path.dirname(this.path);
    fs.mkdir(dir, { recursive: true }).catch(() => {});

    this.fileStream = createWriteStream(this.path, { flags: 'a' });
    
    // Get current file size
    fs.stat(this.path).then(
      stats => this.currentFileSize = stats.size,
      () => this.currentFileSize = 0
    );
  }

  private setupFlushInterval(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(err => {
        console.error('Error flushing log file:', err);
      });
    }, this.flushInterval);
  }

  private async checkRotation(): Promise<void> {
    const now = Date.now();
    
    // Don't check too often
    if (now - this.lastRotationCheck < 5000) {
      return;
    }
    
    this.lastRotationCheck = now;
    
    // Size-based rotation
    if (this.rotationConfig.maxSize && this.currentFileSize >= this.rotationConfig.maxSize) {
      await this.rotateLog();
      return;
    }
    
    // Time-based rotation
    if (this.rotationConfig.interval) {
      const stats = await fs.stat(this.path).catch(() => null);
      if (!stats) return;
      
      const fileDate = new Date(stats.mtime);
      const shouldRotate = this.rotationConfig.interval === 'daily'
        ? this.isNewDay(fileDate, new Date())
        : this.isNewHour(fileDate, new Date());
      
      if (shouldRotate) {
        await this.rotateLog();
      }
    }
  }

  private async rotateLog(): Promise<void> {
    // Close current stream
    if (this.fileStream) {
      await new Promise<void>((resolve) => {
        this.fileStream!.end(() => {
          this.fileStream = null;
          resolve();
        });
      });
    }
    
    const dir = path.dirname(this.path);
    const ext = path.extname(this.path);
    const base = path.basename(this.path, ext);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedPath = path.join(dir, `${base}.${timestamp}${ext}`);
    
    // Rename current log file
    await fs.rename(this.path, rotatedPath).catch(() => {});
    
    // Initialize new stream
    this.initializeFileStream();
    this.currentFileSize = 0;
    
    // Compress old logs if configured
    if (this.rotationConfig.compress) {
      this.compressOldLogs().catch(() => {});
    }
    
    // Clean up old logs if maxFiles is configured
    if (this.rotationConfig.maxFiles) {
      this.cleanupOldLogs().catch(() => {});
    }
  }

  private async compressOldLogs(): Promise<void> {
    // This is a placeholder - in a real implementation, you would use a library 
    // like zlib to compress old log files
    console.log('Compressing old logs is not implemented yet');
  }

  private async cleanupOldLogs(): Promise<void> {
    const dir = path.dirname(this.path);
    const ext = path.extname(this.path);
    const base = path.basename(this.path, ext);
    
    const files = await fs.readdir(dir);
    const logFiles = files
      .filter(file => file.startsWith(base) && file !== path.basename(this.path))
      .map(file => ({
        name: file,
        path: path.join(dir, file),
        time: 0
      }));
    
    // Get file stats in parallel
    await Promise.all(
      logFiles.map(async (file) => {
        const stats = await fs.stat(file.path).catch(() => null);
        if (stats) {
          file.time = stats.mtime.getTime();
        }
      })
    );
    
    // Sort by modification time (oldest first)
    logFiles.sort((a, b) => a.time - b.time);
    
    // Delete oldest files exceeding maxFiles
    const filesToDelete = logFiles.slice(0, logFiles.length - this.rotationConfig.maxFiles! + 1);
    
    for (const file of filesToDelete) {
      await fs.unlink(file.path).catch(() => {});
    }
  }

  private isNewDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() !== date2.getFullYear() ||
           date1.getMonth() !== date2.getMonth() ||
           date1.getDate() !== date2.getDate();
  }

  private isNewHour(date1: Date, date2: Date): boolean {
    return this.isNewDay(date1, date2) || date1.getHours() !== date2.getHours();
  }
}