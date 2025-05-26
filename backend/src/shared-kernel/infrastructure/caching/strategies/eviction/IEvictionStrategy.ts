
import { CacheEntry } from '@/types/shared/infrastructure/caching';

export interface IEvictionStrategy {
  readonly name: string;
  selectKeysToEvict(entries: Array<{ key: string; entry: CacheEntry }>, targetCount: number): string[];
  shouldEvict(entry: CacheEntry): boolean;
}

