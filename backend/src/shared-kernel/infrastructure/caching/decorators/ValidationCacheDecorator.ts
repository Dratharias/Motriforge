import { CacheOperationResult, CacheOperationOptions } from "@/types/shared/infrastructure/caching";
import { ICache } from "../interfaces/ICache";

/**
 * Validation cache decorator - adds validation to cache operations
 */
export class ValidationCacheDecorator implements ICache {
  constructor(
    private readonly cache: ICache,
    private readonly maxKeyLength: number = 250,
    private readonly maxValueSize: number = 1024 * 1024 // 1MB
  ) {}

  get name(): string {
    return this.cache.name;
  }

  async get<T>(key: string): Promise<CacheOperationResult<T>> {
    if (!this.validateKey(key)) {
      return {
        success: false,
        error: new Error('Invalid cache key'),
        operationTime: 0
      };
    }

    return this.cache.get<T>(key);
  }

  async set<T>(key: string, value: T, options?: CacheOperationOptions): Promise<CacheOperationResult<void>> {
    if (!this.validateKey(key)) {
      return {
        success: false,
        error: new Error('Invalid cache key'),
        operationTime: 0
      };
    }

    if (!this.validateValue(value)) {
      return {
        success: false,
        error: new Error('Invalid cache value'),
        operationTime: 0
      };
    }

    return this.cache.set(key, value, options);
  }

  async delete(key: string): Promise<CacheOperationResult<void>> {
    if (!this.validateKey(key)) {
      return {
        success: false,
        error: new Error('Invalid cache key'),
        operationTime: 0
      };
    }

    return this.cache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.validateKey(key)) {
      return false;
    }
    return this.cache.exists(key);
  }

  async clear(): Promise<CacheOperationResult<void>> {
    return this.cache.clear();
  }

  async keys(pattern?: string): Promise<string[]> {
    return this.cache.keys(pattern);
  }

  private validateKey(key: string): boolean {
    return Boolean(key && key.length > 0 && key.length <= this.maxKeyLength && !key.includes('\n'));
  }

  private validateValue(value: any): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    const size = this.estimateSize(value);
    return size <= this.maxValueSize;
  }

  private estimateSize(value: any): number {
    return JSON.stringify(value).length * 2;
  }
}

