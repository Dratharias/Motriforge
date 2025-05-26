
import { CacheSerializationFormat } from '@/types/shared/infrastructure/caching';

export interface ICacheSerializer {
  readonly format: CacheSerializationFormat;
  serialize<T>(data: T): string | Buffer;
  deserialize<T>(data: string | Buffer): T;
  getSize(data: string | Buffer): number;
}