import { LoggerFacade } from "@/core/logging";
import { EventHandler, InvalidationPattern, SystemEventTypes } from "@/types/events";
import { DomainEvent } from "../models/DomainEvent";
import { Event } from "../models/Event";

/**
 * Handles cache invalidation based on system events
 */
export class CacheInvalidationHandler implements EventHandler {
  /** TODO: Assign type upon implementation */
  private readonly cacheManager: any;
  private readonly logger: LoggerFacade;
  private readonly patterns: InvalidationPattern[] = [];

  /**
   * Create a new CacheInvalidationHandler
   * 
   * @param cacheManager Cache manager instance
   * @param logger Logger instance
   */
  constructor(
    cacheManager: any,
    logger: LoggerFacade
  ) {
    this.cacheManager = cacheManager;
    this.logger = logger.withComponent('CacheInvalidationHandler');
    
    // Register default invalidation patterns
    this.registerDefaultPatterns();
  }

  /**
   * Handle an event by invalidating relevant caches
   * 
   * @param event The event to handle
   */
  public async handleEvent(event: Event): Promise<void> {
    try {
      // Get all patterns that match this event
      const matchingPatterns = this.getMatchingPatterns(event);
      
      if (matchingPatterns.length === 0) {
        return; // No patterns match, nothing to do
      }
      
      this.logger.debug(`Processing cache invalidation for event: ${event.type}`, {
        eventId: event.id,
        eventType: event.type,
        patternCount: matchingPatterns.length
      });
      
      // Apply each matching pattern
      for (const pattern of matchingPatterns) {
        await this.applyInvalidationPattern(pattern, event);
      }
    } catch (error) {
      this.logger.error(`Error handling cache invalidation for event: ${event.type}`, error as Error, {
        eventId: event.id,
        eventType: event.type
      });
      
      // Don't rethrow - cache invalidation shouldn't block other event handlers
    }
  }

  /**
   * Register a new invalidation pattern
   * 
   * @param pattern The pattern to register
   */
  public registerPattern(pattern: InvalidationPattern): void {
    this.patterns.push(pattern);
    
    // Sort patterns by priority (highest first)
    this.patterns.sort((a, b) => b.priority - a.priority);
    
    this.logger.debug(`Registered cache invalidation pattern for domain: ${pattern.domain}`, {
      keyPattern: pattern.keyPattern,
      eventTypes: pattern.eventTypes,
      priority: pattern.priority
    });
  }

  /**
   * Get all patterns that match a given event
   * 
   * @param event The event to match patterns against
   * @returns Array of matching invalidation patterns
   */
  private getMatchingPatterns(event: Event): InvalidationPattern[] {
    return this.patterns.filter(pattern => this.patternMatchesEvent(pattern, event));
  }

  /**
   * Check if a specific pattern matches an event
   * 
   * @param pattern The pattern to check
   * @param event The event to match against
   * @returns True if the pattern matches the event
   */
  private patternMatchesEvent(pattern: InvalidationPattern, event: Event): boolean {
    // Check if the event type matches any of the pattern's event types
    const eventTypeMatches = pattern.eventTypes.some(type => {
      // Exact match
      if (type === event.type) return true;
      
      // Wildcard match (e.g., "user.*")
      if (type.endsWith('.*') && event.type.startsWith(type.slice(0, -1))) return true;
      
      return false;
    });
    
    if (!eventTypeMatches) return false;
    
    // If there's a condition function, check if it passes
    if (pattern.condition && !pattern.condition(event)) return false;
    
    return true;
  }

  /**
   * Apply a specific invalidation pattern to invalidate cache entries
   * 
   * @param pattern The pattern to apply
   * @param event The event that triggered invalidation
   */
  private async applyInvalidationPattern(pattern: InvalidationPattern, event: Event): Promise<void> {
    try {
      // Process the key pattern to replace variables
      const keyPattern = this.processKeyPattern(pattern.keyPattern, event);
      
      this.logger.debug(`Invalidating cache with pattern: ${keyPattern}`, {
        domain: pattern.domain,
        eventType: event.type
      });
      
      // Invalidate the cache using the pattern
      const adapter = this.cacheManager.getAdapter(pattern.domain);
      
      // Get all keys matching the pattern
      const keys = await adapter.keys(keyPattern);
      
      if (keys.length === 0) {
        this.logger.debug(`No cache keys match pattern: ${keyPattern}`, {
          domain: pattern.domain,
          eventType: event.type
        });
        return;
      }
      
      this.logger.debug(`Found ${keys.length} cache keys to invalidate`, {
        domain: pattern.domain,
        eventType: event.type,
        keyPattern
      });
      
      // Delete each matching key
      for (const key of keys) {
        await adapter.delete(key);
      }
      
      // Handle cascading invalidation to dependencies
      if (pattern.cascade && pattern.dependencies && pattern.dependencies.length > 0) {
        await this.handleCascadingInvalidation(pattern, event);
      }
    } catch (error) {
      this.logger.error(`Error applying invalidation pattern: ${pattern.keyPattern}`, error as Error, {
        domain: pattern.domain,
        eventType: event.type
      });
    }
  }

  /**
   * Process a key pattern to replace variables with values from the event
   * 
   * @param pattern The key pattern with variables
   * @param event The event providing values for variables
   * @returns The processed key pattern
   */
  private processKeyPattern(pattern: string, event: Event): string {
    let result = pattern;
    
    // Replace :entityId with the entity ID from the event if it's a DomainEvent
    if (result.includes(':entityId') && event instanceof DomainEvent) {
      result = result.replace(':entityId', event.entityId);
    }
    
    // Replace :userId with the user ID from the event if available
    if (result.includes(':userId')) {
      const userId = this.getUserIdFromEvent(event);
      if (userId) {
        result = result.replace(':userId', userId);
      }
    }
    
    // Replace dynamic properties from the event payload
    const matches = result.match(/:(\w+)/g);
    if (matches) {
      for (const match of matches) {
        const propName = match.substring(1); // Remove the colon
        const value = this.getPropertyFromPayload(event.payload, propName);
        
        if (value) {
          result = result.replace(match, value.toString());
        }
      }
    }
    
    return result;
  }

  /**
   * Extract a user ID from an event
   * 
   * @param event The event to extract user ID from
   * @returns The user ID or undefined if not found
   */
  private getUserIdFromEvent(event: Event): string | undefined {
    // If it's a DomainEvent with userId property
    if ((event as DomainEvent<any>).userId) {
      return (event as DomainEvent<any>).userId;
    }
    
    // Check the context
    if (event.context?.userId) {
      return event.context.userId;
    }
    
    // Check various payload locations
    if (typeof event.payload === 'object' && event.payload) {
      // Direct userId property
      if (event.payload.userId) {
        return event.payload.userId;
      }
      
      // User object with id
      if (event.payload.user?.id) {
        return event.payload.user.id;
      }
      
      // Direct id property (for user events)
      if (event.type.startsWith('user.') && event.payload.id) {
        return event.payload.id;
      }
    }
    
    return undefined;
  }

  /**
   * Get a property value from an event payload
   * 
   * @param payload The event payload
   * @param propPath Dot-notation property path
   * @returns The property value or undefined if not found
   */
  private getPropertyFromPayload(payload: any, propPath: string): any {
    if (!payload || typeof payload !== 'object') {
      return undefined;
    }
    
    const parts = propPath.split('.');
    let current = payload;
    
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      
      current = current[part];
    }
    
    return current;
  }

  /**
   * Handle cascading invalidation to dependent cache domains
   * 
   * @param pattern The pattern with dependencies
   * @param event The triggering event
   */
  private async handleCascadingInvalidation(pattern: InvalidationPattern, event: Event): Promise<void> {
    if (!pattern.dependencies || pattern.dependencies.length === 0) {
      return;
    }
    
    this.logger.debug(`Cascading invalidation to ${pattern.dependencies.length} dependent domains`, {
      domain: pattern.domain,
      dependencies: pattern.dependencies,
      eventType: event.type
    });
    
    for (const dependentDomain of pattern.dependencies) {
      // Find patterns for the dependent domain that match this event
      const dependentPatterns = this.patterns.filter(p => 
        p.domain === dependentDomain && 
        this.patternMatchesEvent(p, event)
      );
      
      for (const dependentPattern of dependentPatterns) {
        await this.applyInvalidationPattern(dependentPattern, event);
      }
    }
  }

  /**
   * Register default invalidation patterns
   */
  private registerDefaultPatterns(): void {
    // User-related invalidation patterns
    this.registerPattern({
      domain: 'user',
      keyPattern: 'user:*',
      eventTypes: ['user.updated', 'user.deleted', SystemEventTypes.USER_UPDATED, SystemEventTypes.USER_DELETED],
      priority: 100
    });
    
    this.registerPattern({
      domain: 'user',
      keyPattern: 'user::entityId:*',
      eventTypes: ['user.*'],
      priority: 100,
      condition: (event) => event instanceof DomainEvent
    });
    
    // Auth-related invalidation patterns
    this.registerPattern({
      domain: 'auth',
      keyPattern: 'auth:user::userId:*',
      eventTypes: ['auth.login', 'auth.logout', 'auth.password.changed', 'auth.token.revoked'],
      priority: 100
    });
    
    // Organization-related invalidation patterns
    this.registerPattern({
      domain: 'organization',
      keyPattern: 'organization:*',
      eventTypes: ['organization.updated', 'organization.deleted'],
      priority: 80
    });
    
    this.registerPattern({
      domain: 'organization',
      keyPattern: 'organization::entityId:*',
      eventTypes: ['organization.*'],
      priority: 80,
      condition: (event) => event instanceof DomainEvent
    });
    
    // Member-related invalidation patterns
    this.registerPattern({
      domain: 'organization',
      keyPattern: 'organization:*:members',
      eventTypes: ['organization.member.added', 'organization.member.removed', 'organization.member.role.changed'],
      priority: 80
    });
    
    // Permission-related invalidation patterns
    this.registerPattern({
      domain: 'permission',
      keyPattern: 'permission:user::userId:*',
      eventTypes: ['permission.updated', 'permission.granted', 'permission.revoked', 'role.updated'],
      priority: 90,
      cascade: true,
      dependencies: ['auth']
    });
    
    // Content-related invalidation patterns
    this.registerPattern({
      domain: 'content',
      keyPattern: 'content::entityType::entityId:*',
      eventTypes: ['*.updated', '*.deleted'],
      priority: 70,
      condition: (event) => event instanceof DomainEvent
    });
    
    // System-related invalidation patterns
    this.registerPattern({
      domain: 'system',
      keyPattern: 'system:config:*',
      eventTypes: ['system.config.changed'],
      priority: 100
    });
  }
}