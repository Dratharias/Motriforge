import { CacheHealthStatus } from "@/types/shared/infrastructure/caching";
import { ICacheHealthChecker } from "../interfaces/ICache";

/**
 * Cache health checker - single responsibility for health monitoring
 */
export class CacheHealthChecker implements ICacheHealthChecker {
  constructor(
    private readonly cacheName: string,
    private readonly connectionChecker: () => Promise<boolean>,
    private readonly performanceChecker: () => Promise<number>
  ) {}

  async checkHealth(): Promise<CacheHealthStatus> {
    const errors: string[] = [];
    let connected = false;
    let responseTime = 0;

    try {
      connected = await this.connectionChecker();
      if (!connected) {
        errors.push('Cache connection is not available');
      }
    } catch (error) {
      errors.push(`Connection check failed: ${error}`);
    }

    try {
      responseTime = await this.performanceChecker();
    } catch (error) {
      errors.push(`Performance check failed: ${error}`);
      responseTime = -1;
    }

    const healthy = connected && errors.length === 0 && responseTime >= 0;

    return {
      healthy,
      connected,
      responseTime,
      memoryUsage: process.memoryUsage().heapUsed,
      connectionCount: connected ? 1 : 0,
      errors,
      lastError: errors.length > 0 ? new Date() : undefined
    };
  }

  async ping(): Promise<number> {
    return await this.performanceChecker();
  }

  async getConnectionInfo(): Promise<Record<string, any>> {
    return {
      cacheName: this.cacheName,
      connected: await this.connectionChecker(),
      timestamp: new Date().toISOString()
    };
  }
}