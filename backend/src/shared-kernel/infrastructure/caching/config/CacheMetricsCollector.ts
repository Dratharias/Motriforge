
import { CacheStatistics, CacheKeyStats } from '@/types/shared/infrastructure/caching';
import { ICacheMetricsCollector } from '../interfaces/ICache';

/**
 * Cache metrics collector implementation
 */
export class CacheMetricsCollector implements ICacheMetricsCollector {
  private stats: CacheStatistics = {
    totalKeys: 0,
    totalHits: 0,
    totalMisses: 0,
    hitRate: 0,
    totalSize: 0,
    averageKeySize: 0,
    evictions: 0,
    operations: {
      gets: 0,
      sets: 0,
      deletes: 0,
      flushes: 0,
      averageGetTime: 0,
      averageSetTime: 0,
      averageDeleteTime: 0
    },
    topKeys: []
  };

  private readonly keyStats = new Map<string, CacheKeyStats>();
  private operationTimes: { gets: number[]; sets: number[]; deletes: number[] } = { gets: [], sets: [], deletes: [] };

  recordHit(key: string, operationTime: number): void {
    this.stats.totalHits++;
    this.stats.operations.gets++;
    this.recordOperationTime('gets', operationTime);
    this.updateKeyStats(key, 'hit');
    this.updateHitRate();
  }

  recordMiss(key: string, operationTime: number): void {
    this.stats.totalMisses++;
    this.stats.operations.gets++;
    this.recordOperationTime('gets', operationTime);
    this.updateHitRate();
  }

  recordSet(key: string, size: number, operationTime: number): void {
    this.stats.operations.sets++;
    this.stats.totalKeys++;
    this.stats.totalSize += size;
    this.stats.averageKeySize = this.stats.totalSize / this.stats.totalKeys;
    this.recordOperationTime('sets', operationTime);
    this.updateKeyStats(key, 'set', size);
  }

  recordDelete(key: string, operationTime: number): void {
    this.stats.operations.deletes++;
    this.recordOperationTime('deletes', operationTime);
    this.removeKeyStats(key);
  }

  recordEviction(key: string, reason: string): void {
    this.stats.evictions++;
    this.removeKeyStats(key);
  }

  recordError(operation: string, error: Error): void {
    console.error(`Cache operation '${operation}' failed:`, error);
  }

  getStatistics(): CacheStatistics {
    this.updateTopKeys();
    return { ...this.stats };
  }

  reset(): void {
    this.stats = {
      totalKeys: 0,
      totalHits: 0,
      totalMisses: 0,
      hitRate: 0,
      totalSize: 0,
      averageKeySize: 0,
      evictions: 0,
      operations: {
        gets: 0,
        sets: 0,
        deletes: 0,
        flushes: 0,
        averageGetTime: 0,
        averageSetTime: 0,
        averageDeleteTime: 0
      },
      topKeys: []
    };
    this.keyStats.clear();
    this.operationTimes = { gets: [], sets: [], deletes: [] };
  }

  private recordOperationTime(operation: 'gets' | 'sets' | 'deletes', time: number): void {
    this.operationTimes[operation].push(time);
    
    if (this.operationTimes[operation].length > 1000) {
      this.operationTimes[operation].shift();
    }

    const times = this.operationTimes[operation];
    const average = times.reduce((sum, t) => sum + t, 0) / times.length;
    
    switch (operation) {
      case 'gets':
        this.stats.operations.averageGetTime = average;
        break;
      case 'sets':
        this.stats.operations.averageSetTime = average;
        break;
      case 'deletes':
        this.stats.operations.averageDeleteTime = average;
        break;
    }
  }

  private updateKeyStats(key: string, operation: 'hit' | 'set', size?: number): void {
    const existing = this.keyStats.get(key);
    
    if (existing) {
      this.keyStats.set(key, {
        ...existing,
        hits: operation === 'hit' ? existing.hits + 1 : existing.hits,
        size: size ?? existing.size,
        lastAccessed: new Date()
      });
    } else {
      this.keyStats.set(key, {
        key,
        hits: operation === 'hit' ? 1 : 0,
        size: size ?? 0,
        lastAccessed: new Date()
      });
    }
  }

  private removeKeyStats(key: string): void {
    const stats = this.keyStats.get(key);
    if (stats) {
      this.stats.totalKeys--;
      this.stats.totalSize -= stats.size;
      this.stats.averageKeySize = this.stats.totalKeys > 0 ? this.stats.totalSize / this.stats.totalKeys : 0;
      this.keyStats.delete(key);
    }
  }

  private updateHitRate(): void {
    const total = this.stats.totalHits + this.stats.totalMisses;
    this.stats.hitRate = total > 0 ? this.stats.totalHits / total : 0;
  }

  private updateTopKeys(): void {
    this.stats.topKeys = Array.from(this.keyStats.values())
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10);
  }
}