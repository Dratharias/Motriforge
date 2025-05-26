
import { CacheStatistics } from '@/types/shared/infrastructure/caching';
import { ICacheMetricsCollector } from '../interfaces/ICache';

/**
 * Cache metrics service - aggregates metrics from multiple caches
 */
export class CacheMetricsService {
  private readonly metricsCollectors = new Map<string, ICacheMetricsCollector>();

  registerMetricsCollector(name: string, collector: ICacheMetricsCollector): void {
    this.metricsCollectors.set(name, collector);
  }

  unregisterMetricsCollector(name: string): void {
    this.metricsCollectors.delete(name);
  }

  getAggregatedMetrics(): CacheStatistics {
    const aggregated: CacheStatistics = {
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

    const collectors = Array.from(this.metricsCollectors.values());
    if (collectors.length === 0) {
      return aggregated;
    }

    let totalGetTime = 0;
    let totalSetTime = 0;
    let totalDeleteTime = 0;

    for (const collector of collectors) {
      const stats = collector.getStatistics();
      
      aggregated.totalKeys += stats.totalKeys;
      aggregated.totalHits += stats.totalHits;
      aggregated.totalMisses += stats.totalMisses;
      aggregated.totalSize += stats.totalSize;
      aggregated.evictions += stats.evictions;
      
      aggregated.operations.gets += stats.operations.gets;
      aggregated.operations.sets += stats.operations.sets;
      aggregated.operations.deletes += stats.operations.deletes;
      aggregated.operations.flushes += stats.operations.flushes;
      
      totalGetTime += stats.operations.averageGetTime;
      totalSetTime += stats.operations.averageSetTime;
      totalDeleteTime += stats.operations.averageDeleteTime;
      
      // Merge top keys
      aggregated.topKeys.push(...stats.topKeys);
    }

    // Calculate aggregated values
    const totalRequests = aggregated.totalHits + aggregated.totalMisses;
    aggregated.hitRate = totalRequests > 0 ? aggregated.totalHits / totalRequests : 0;
    aggregated.averageKeySize = aggregated.totalKeys > 0 ? aggregated.totalSize / aggregated.totalKeys : 0;
    
    aggregated.operations.averageGetTime = totalGetTime / collectors.length;
    aggregated.operations.averageSetTime = totalSetTime / collectors.length;
    aggregated.operations.averageDeleteTime = totalDeleteTime / collectors.length;
    
    // Sort and limit top keys
    aggregated.topKeys = aggregated.topKeys
      .toSorted((a, b) => b.hits - a.hits)
      .slice(0, 10);

    return aggregated;
  }

  getCacheMetrics(name: string): CacheStatistics | null {
    const collector = this.metricsCollectors.get(name);
    return collector ? collector.getStatistics() : null;
  }

  resetAllMetrics(): void {
    for (const collector of this.metricsCollectors.values()) {
      collector.reset();
    }
  }

  resetCacheMetrics(name: string): void {
    const collector = this.metricsCollectors.get(name);
    if (collector) {
      collector.reset();
    }
  }
}

