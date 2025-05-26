
import { CacheEntry, CacheOperationResult, CacheOperationOptions } from '@/types/shared/infrastructure/caching';
import { ICacheCore, ICacheOperationExecutor, ICacheCommand } from '../interfaces/ICache';

/**
 * Cache operation executor - command pattern for cache operations
 */
export class CacheOperationExecutor implements ICacheOperationExecutor {
  constructor(private readonly core: ICacheCore) {}

  async execute<T>(command: ICacheCommand<T>): Promise<CacheOperationResult<T>> {
    const startTime = Date.now();

    try {
      const result = await command.execute(this.core);
      return {
        ...result,
        operationTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        operationTime: Date.now() - startTime
      };
    }
  }
}

/**
 * Get command
 */
export class GetCommand<T> implements ICacheCommand<T> {
  constructor(private readonly key: string) {}

  async execute(core: ICacheCore): Promise<CacheOperationResult<T>> {
    const entry = await core.get<T>(this.key);
    
    if (entry) {
      return {
        success: true,
        value: entry.value,
        metadata: entry.metadata,
        fromCache: true
      };
    }

    return {
      success: false,
      fromCache: false
    };
  }
}

/**
 * Set command
 */
export class SetCommand<T> implements ICacheCommand<void> {
  constructor(
    private readonly key: string,
    private readonly value: T,
    private readonly entry: CacheEntry<T>
  ) {}

  async execute(core: ICacheCore): Promise<CacheOperationResult<void>> {
    await core.set(this.key, this.entry);
    
    return {
      success: true,
      metadata: this.entry.metadata,
      fromCache: false
    };
  }
}

/**
 * Delete command
 */
export class DeleteCommand implements ICacheCommand<void> {
  constructor(private readonly key: string) {}

  async execute(core: ICacheCore): Promise<CacheOperationResult<void>> {
    const deleted = await core.delete(this.key);
    
    return {
      success: deleted,
      fromCache: false
    };
  }
}

/**
 * Clear command
 */
export class ClearCommand implements ICacheCommand<void> {
  constructor() {}

  async execute(core: ICacheCore): Promise<CacheOperationResult<void>> {
    await core.clear();
    
    return {
      success: true,
      fromCache: false
    };
  }
}

/**
 * Bulk operations command
 */
export class BulkGetCommand<T> implements ICacheCommand<T[]> {
  constructor(private readonly keys: string[]) {}

  async execute(core: ICacheCore): Promise<CacheOperationResult<T[]>> {
    const results: T[] = [];
    
    for (const key of this.keys) {
      const entry = await core.get<T>(key);
      if (entry) {
        results.push(entry.value);
      }
    }
    
    return {
      success: true,
      value: results,
      fromCache: true
    };
  }
}