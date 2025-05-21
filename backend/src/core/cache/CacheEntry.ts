/**
 * Represents a single entry in the cache
 */
export class CacheEntry<T = any> {
  /**
   * Unique key for the cache entry
   */
  public readonly key: string;
  
  /**
   * Serialized value
   */
  public readonly value: string;
  
  /**
   * Original value type
   */
  public readonly originalType: string;
  
  /**
   * When this entry expires (if applicable)
   */
  public readonly expiresAt?: Date;
  
  /**
   * When this entry was created
   */
  public readonly createdAt: Date;
  
  /**
   * When this entry was last accessed
   */
  public lastAccessedAt: Date;
  
  /**
   * Number of times this entry has been accessed
   */
  public hitCount: number;
  
  /**
   * Additional metadata
   */
  public readonly metadata: Record<string, any>;

  constructor(params: {
    key: string;
    value: T;
    expiresAt?: Date;
    metadata?: Record<string, any>;
  }) {
    this.key = params.key;
    this.value = this.serialize(params.value);
    this.originalType = this.getType(params.value);
    this.expiresAt = params.expiresAt;
    this.createdAt = new Date();
    this.lastAccessedAt = new Date();
    this.hitCount = 0;
    this.metadata = params.metadata ?? {};
  }

  /**
   * Check if this entry has expired
   */
  public isExpired(): boolean {
    if (!this.expiresAt) {
      return false;
    }
    
    return this.expiresAt < new Date();
  }

  /**
   * Record a cache hit
   */
  public recordHit(): void {
    this.hitCount++;
    this.lastAccessedAt = new Date();
  }

  /**
   * Get the deserialized value
   */
  public getValue(): T {
    return this.deserialize(this.value, this.originalType);
  }

  /**
   * Serialize a value to a string
   */
  private serialize(value: T): string {
    return JSON.stringify(value);
  }

  /**
   * Deserialize a string back to its original type
   */
  private deserialize(value: string, type: string): T {
    const parsed = JSON.parse(value);
    
    // Handle Date objects
    if (type === 'date' && typeof parsed === 'string') {
      return new Date(parsed) as unknown as T;
    }
    
    return parsed;
  }

  /**
   * Get the type of a value
   */
  private getType(value: any): string {
    if (value instanceof Date) {
      return 'date';
    }
    
    return typeof value;
  }
}