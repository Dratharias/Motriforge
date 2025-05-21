/**
 * Pattern for cache invalidation
 */
export interface InvalidationPattern {
  /**
   * Cache domain this pattern applies to
   */
  domain: string;
  
  /**
   * Pattern to match keys against (supports * as wildcard)
   */
  keyPattern: string;
  
  /**
   * Event types this pattern depends on
   */
  dependsOn: string[];
  
  /**
   * Condition function to determine if the pattern applies
   */
  condition?: (metadata: any) => boolean;
  
  /**
   * Priority of this pattern (higher values have higher priority)
   */
  priority?: number;
  
  /**
   * TTL to set when invalidating (if not deleting)
   */
  ttl?: number;
  
  /**
   * Whether to cascade invalidation to related keys
   */
  cascading?: boolean;
}

/**
 * Create an invalidation pattern
 */
export function createInvalidationPattern(pattern: Partial<InvalidationPattern>): InvalidationPattern {
  return {
    domain: 'default',
    keyPattern: '*',
    dependsOn: [],
    priority: 0,
    cascading: false,
    ...pattern
  };
}

/**
 * Check if a key matches a pattern
 */
export function keyMatchesPattern(key: string, pattern: string): boolean {
  if (pattern === '*') {
    return true;
  }
  
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
    .replace(/\+/g, '.+');
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(key);
}