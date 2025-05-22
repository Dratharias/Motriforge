import { InvalidationPattern, EventHandler } from "@/types/events";
import { LoggerFacade } from "../logging";
import { CacheManager } from "./CacheManager";
import { keyMatchesPattern } from "./InvalidationPattern";
import type { Event as DomainEvent } from "../events/models/Event";

/**
 * Handles cache invalidation based on events
 */
export class CacheInvalidationHandler implements EventHandler {
  private readonly cacheManager: CacheManager;
  private readonly logger: LoggerFacade;
  private readonly invalidationPatterns: Map<string, InvalidationPattern[]> = new Map();

  constructor(cacheManager: CacheManager, logger: LoggerFacade) {
    this.cacheManager = cacheManager;
    this.logger = logger.withComponent('CacheInvalidationHandler');
  }

  /**
   * Handle an event
   */
  public async handleEvent(event: DomainEvent): Promise<void> {
    try {
      const eventType = event.type;
      const patterns = this.getMatchingPatterns(eventType);
      
      if (patterns.length === 0) {
        return;
      }
      
      this.logger.debug(`Processing cache invalidation for event: ${eventType}`, {
        eventId: event.id,
        patternCount: patterns.length
      });
      
      // Process each pattern
      for (const pattern of patterns) {
        await this.processPattern(pattern, event, eventType);
      }
    } catch (error) {
      this.logger.error('Error handling cache invalidation event', error as Error, {
        eventType: event.type,
        eventId: event.id
      });
    }
  }
  
  private async processPattern(pattern: InvalidationPattern, event: DomainEvent, eventType: string): Promise<void> {
    try {
      // Skip if condition fails
      if (pattern.condition && !pattern.condition(event.payload)) {
        return;
      }
      
      // Get all keys for the domain
      const keys = await this.cacheManager.keys(pattern.keyPattern, pattern.domain);
      
      if (keys.length === 0) {
        return;
      }
      
      this.logger.debug(`Invalidating ${keys.length} keys in domain ${pattern.domain}`, {
        eventType,
        pattern: pattern.keyPattern
      });
      
      await this.invalidateMatchingKeys(keys, pattern);
      
    } catch (error) {
      this.logger.error(`Error processing invalidation pattern`, error as Error, {
        eventType,
        domain: pattern.domain,
        keyPattern: pattern.keyPattern
      });
    }
  }
  
  private async invalidateMatchingKeys(keys: string[], pattern: InvalidationPattern): Promise<void> {
    const matchingKeys = keys.filter(key => keyMatchesPattern(key, pattern.keyPattern));
    
    for (const key of matchingKeys) {
      if (pattern.ttl !== undefined) {
        // Get the current value
        const value = await this.cacheManager.get(key, pattern.domain);
        if (value !== undefined) {
          // Set it again with the new TTL
          await this.cacheManager.set(key, value, { ttl: pattern.ttl }, pattern.domain);
        }
      } else {
        await this.cacheManager.delete(key, pattern.domain);
      }
    }
  }

  /**
   * Register an invalidation pattern
   */
  public registerInvalidationPattern(pattern: InvalidationPattern): void {
    for (const eventType of pattern.dependsOn) {
      if (!this.invalidationPatterns.has(eventType)) {
        this.invalidationPatterns.set(eventType, []);
      }
      
      this.invalidationPatterns.get(eventType)!.push(pattern);
      
      // Sort patterns by priority (highest first)
      this.invalidationPatterns.get(eventType)!.sort((a, b) => 
        (b.priority ?? 0) - (a.priority ?? 0)
      );
    }
    
    this.logger.debug(`Registered invalidation pattern for domain ${pattern.domain}`, {
      keyPattern: pattern.keyPattern,
      dependsOn: pattern.dependsOn
    });
  }

  /**
   * Get patterns matching an event type
   */
  private getMatchingPatterns(eventType: string): InvalidationPattern[] {
    const patterns: InvalidationPattern[] = [];
    
    // Add patterns that match the exact event type
    if (this.invalidationPatterns.has(eventType)) {
      patterns.push(...this.invalidationPatterns.get(eventType)!);
    }
    
    // Add patterns that match the wildcard event type
    if (this.invalidationPatterns.has('*')) {
      patterns.push(...this.invalidationPatterns.get('*')!);
    }
    
    // Add patterns that match the namespace wildcard
    const namespace = eventType.split('.')[0];
    const namespaceWildcard = `${namespace}.*`;
    
    if (this.invalidationPatterns.has(namespaceWildcard)) {
      patterns.push(...this.invalidationPatterns.get(namespaceWildcard)!);
    }
    
    return patterns;
  }
}