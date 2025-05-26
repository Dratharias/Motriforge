
import { CacheSerializationFormat } from '@/types/shared/infrastructure/caching';
import { ICacheSerializer } from './ICacheSerializer';

/**
 * JSON serializer - simple JSON serialization
 */
export class JsonSerializer implements ICacheSerializer {
  public readonly format = CacheSerializationFormat.JSON;

  serialize<T>(data: T): string {
    try {
      return JSON.stringify(data);
    } catch (error) {
      throw new Error(`Failed to serialize data to JSON: ${error}`);
    }
  }

  deserialize<T>(data: string | Buffer): T {
    try {
      const jsonString = typeof data === 'string' ? data : data.toString('utf8');
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error(`Failed to deserialize JSON data: ${error}`);
    }
  }

  getSize(data: string | Buffer): number {
    if (typeof data === 'string') {
      return Buffer.byteLength(data, 'utf8');
    }
    return data.length;
  }
}

