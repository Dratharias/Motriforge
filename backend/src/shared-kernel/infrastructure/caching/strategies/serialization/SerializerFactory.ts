
import { CacheSerializationFormat } from '@/types/shared/infrastructure/caching';

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