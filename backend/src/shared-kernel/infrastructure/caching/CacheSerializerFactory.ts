import { CacheSerializationFormat } from "@/types/shared/infrastructure/caching";
import { BinaryCacheSerializer, JsonCacheSerializer, CompressedCacheSerializer } from "./CacheAdapter";
import { ICacheSerializer } from "./interfaces/ICache";

/**
 * Cache serializer factory - single responsibility for creating serializers
 */
export class CacheSerializerFactory {
  static createSerializer(format: CacheSerializationFormat, enableCompression: boolean = false): ICacheSerializer {
    let baseSerializer: ICacheSerializer;

    switch (format) {
      case CacheSerializationFormat.BINARY:
        baseSerializer = new BinaryCacheSerializer();
        break;
      
      case CacheSerializationFormat.JSON:
      default:
        baseSerializer = new JsonCacheSerializer();
        break;
    }

    if (enableCompression) {
      return new CompressedCacheSerializer(baseSerializer);
    }

    return baseSerializer;
  }
}