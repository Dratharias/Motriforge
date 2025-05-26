
import { CacheEvent } from '@/types/shared/infrastructure/caching';

/**
 * Cache event type definitions and utilities
 */
export class CacheEventTypes {
  static isOperationEvent(event: CacheEvent): boolean {
    return ['hit', 'miss', 'set', 'delete'].includes(event.type);
  }

  static isManagementEvent(event: CacheEvent): boolean {
    return ['flush', 'eviction'].includes(event.type);
  }

  static isErrorEvent(event: CacheEvent): boolean {
    return event.type === 'error';
  }

  static formatEventForLogging(event: CacheEvent): string {
    const baseInfo = `[${event.type.toUpperCase()}] ${event.timestamp.toISOString()}`;
    
    if (event.key) {
      return `${baseInfo} - Key: ${event.key}`;
    }
    
    if (event.error) {
      return `${baseInfo} - Error: ${event.error.message}`;
    }
    
    return baseInfo;
  }
}