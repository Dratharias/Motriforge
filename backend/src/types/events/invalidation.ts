import { Event as DomainEvent } from '@/core/events/models/Event';

/**
 * Pattern for cache invalidation based on events
 */
export interface InvalidationPattern {
  domain: string;
  keyPattern: string;
  dependsOn: string[];
  condition?: (payload: any) => boolean;
  priority?: number;
  ttl?: number;
  cascading?: boolean;
}