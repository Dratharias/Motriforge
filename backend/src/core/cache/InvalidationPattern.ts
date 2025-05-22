import { InvalidationPattern } from "@/types/events";

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