
import { CacheSerializationFormat } from '@/types/shared/infrastructure/caching';
import { BinarySerializer } from './BinarySerializer';
import { ICacheSerializer } from './ICacheSerializer';
import { JsonSerializer } from './JsonSerializer';

export class SerializerFactory {
  static createSerializer(format: CacheSerializationFormat): ICacheSerializer {
    switch (format) {
      case CacheSerializationFormat.BINARY:
        return new BinarySerializer();
      
      case CacheSerializationFormat.JSON:
      default:
        return new JsonSerializer();
    }
  }
}