
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';
import { CacheSerializationFormat } from '@/types/shared/infrastructure/caching';
import { ICacheSerializer } from '../interfaces/ICache';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

/**
 * Compressed cache serializer - decorator for compression
 */
export class CompressedCacheSerializer implements ICacheSerializer {
  public readonly format: CacheSerializationFormat;

  constructor(
    private readonly baseSerializer: ICacheSerializer,
    private readonly compressionThreshold: number = 1024 // Only compress if > 1KB
  ) {
    this.format = baseSerializer.format;
  }

  async serialize<T>(data: T): Promise<Buffer> {
    const serialized = this.baseSerializer.serialize(data);
    const buffer = typeof serialized === 'string' ? Buffer.from(serialized, 'utf8') : serialized;
    
    // Only compress if data is larger than threshold
    if (buffer.length > this.compressionThreshold) {
      const compressed = await gzipAsync(buffer);
      // Add compression header
      const header = Buffer.from('GZIP', 'utf8');
      return Buffer.concat([header, compressed]);
    }
    
    // Add uncompressed header
    const header = Buffer.from('RAW_', 'utf8');
    return Buffer.concat([header, buffer]);
  }

  async deserialize<T>(data: string | Buffer): Promise<T> {
    let buffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    
    // Check compression header
    const header = buffer.subarray(0, 4).toString('utf8');
    const payload = buffer.subarray(4);
    
    if (header === 'GZIP') {
      const decompressed = await gunzipAsync(payload);
      return this.baseSerializer.deserialize<T>(decompressed);
    } else if (header === 'RAW_') {
      return this.baseSerializer.deserialize<T>(payload);
    } else {
      // Fallback: assume uncompressed
      return this.baseSerializer.deserialize<T>(buffer);
    }
  }

  getSize(data: string | Buffer): number {
    if (typeof data === 'string') {
      return Buffer.byteLength(data, 'utf8');
    }
    return data.length;
  }
}

