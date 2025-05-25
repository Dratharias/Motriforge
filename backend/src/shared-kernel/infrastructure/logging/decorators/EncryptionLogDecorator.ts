import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { LogEntry } from '@/types/shared/infrastructure/logging';
import { ILogStrategy } from '../interfaces/ILogger';

export class EncryptionLogDecorator implements ILogStrategy {
  public readonly name: string;
  public readonly outputType: string;
  private readonly keyBuffer: Buffer;

  constructor(
    private readonly decoratedStrategy: ILogStrategy,
    encryptionKey: string,
    private readonly algorithm: string = 'aes-256-cbc',
    private readonly encryptSensitiveOnly: boolean = true
  ) {
    this.name = `encrypted-${decoratedStrategy.name}`;
    this.outputType = decoratedStrategy.outputType;

    // Normalize key to 32 bytes (256 bits)
    this.keyBuffer = Buffer.alloc(32);
    Buffer.from(encryptionKey).copy(this.keyBuffer);
  }

  async write(entry: LogEntry): Promise<void> {
    const encryptedEntry = this.encryptEntry(entry);
    await this.decoratedStrategy.write(encryptedEntry);
  }

  async flush(): Promise<void> {
    await this.decoratedStrategy.flush();
  }

  async close(): Promise<void> {
    await this.decoratedStrategy.close();
  }

  async isHealthy(): Promise<boolean> {
    return await this.decoratedStrategy.isHealthy();
  }

  /**
   * Encrypts a full log entry
   */
  private encryptEntry(entry: LogEntry): LogEntry {
    if (this.encryptSensitiveOnly && !this.containsSensitiveData(entry)) {
      return entry;
    }

    return {
      ...entry,
      message: this.encrypt(entry.message),
      data: entry.data ? this.encryptObject(entry.data) : undefined,
      error: entry.error ? {
        ...entry.error,
        message: this.encrypt(entry.error.message),
        details: entry.error.details ? this.encryptObject(entry.error.details) : undefined
      } : undefined
    };
  }

  /**
   * Decrypts a log entry if needed (optional utility)
   */
  public decryptEntry(entry: LogEntry): LogEntry {
    return {
      ...entry,
      message: this.decrypt(entry.message),
      data: entry.data ? this.decryptObject(entry.data) : undefined,
      error: entry.error ? {
        ...entry.error,
        message: this.decrypt(entry.error.message),
        details: entry.error.details ? this.decryptObject(entry.error.details) : undefined
      } : undefined
    };
  }

  /**
   * Checks if the entry contains sensitive keywords
   */
  private containsSensitiveData(entry: LogEntry): boolean {
    const sensitiveKeywords = ['password', 'token', 'secret', 'key', 'ssn', 'credit'];
    const dataString = JSON.stringify(entry).toLowerCase();
    return sensitiveKeywords.some(keyword => dataString.includes(keyword));
  }

  /**
   * Encrypt a string using AES and embed IV in result
   */
  private encrypt(text: string): string {
    try {
      const iv = randomBytes(16);
      const cipher = createCipheriv(this.algorithm, this.keyBuffer, iv);
      const encrypted = Buffer.concat([
        cipher.update(text, 'utf8'),
        cipher.final()
      ]);
      return `[ENCRYPTED:${iv.toString('hex')}:${encrypted.toString('hex')}]`;
    } catch (error) {
      console.error('Encryption failed:', error);
      return '[ENCRYPTION_FAILED]';
    }
  }

  /**
   * Decrypt a string if in [ENCRYPTED:...] format
   */
  private decrypt(encryptedText: string): string {
    try {
      const match = RegExp(/^\[ENCRYPTED:([a-f0-9]+):([a-f0-9]+)\]$/i).exec(encryptedText);
      if (!match) return encryptedText; // Return as-is if not encrypted

      const iv = Buffer.from(match[1], 'hex');
      const encrypted = Buffer.from(match[2], 'hex');
      const decipher = createDecipheriv(this.algorithm, this.keyBuffer, iv);
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      return decrypted.toString('utf8');
    } catch (error) {
      console.error('Decryption failed:', error);
      return '[DECRYPTION_FAILED]';
    }
  }

  /**
   * Recursively encrypt all string values in object
   */
  private encryptObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.encrypt(obj);
    }
    if (typeof obj === 'object' && obj !== null) {
      const result: any = Array.isArray(obj) ? [] : {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.encryptObject(value);
      }
      return result;
    }
    return obj;
  }

  /**
   * Recursively decrypt all string values in object
   */
  private decryptObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.decrypt(obj);
    }
    if (typeof obj === 'object' && obj !== null) {
      const result: any = Array.isArray(obj) ? [] : {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.decryptObject(value);
      }
      return result;
    }
    return obj;
  }
}