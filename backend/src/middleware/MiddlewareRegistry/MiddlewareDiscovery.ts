import { ApplicationContext } from '@/types/shared/enums/common';
import { ContextualLogger } from '@/shared-kernel/infrastructure/logging/ContextualLogger';
import { 
  MiddlewareRegistration, 
  MiddlewareDiscoveryCriteria
} from '@/types/middleware/registry/registry-types';
import { MiddlewareCategory } from '@/types/middleware/registry/enums';

/**
 * Handles middleware discovery, searching, and filtering
 */
export class MiddlewareDiscovery {
  private readonly logger: ContextualLogger;

  constructor(logger: ContextualLogger) {
    this.logger = logger;
  }

  /**
   * Discovers middleware based on criteria
   */
  discover(
    registrations: Map<string, MiddlewareRegistration>,
    criteria: MiddlewareDiscoveryCriteria = {}
  ): readonly MiddlewareRegistration[] {
    const results: MiddlewareRegistration[] = [];

    for (const registration of registrations.values()) {
      if (this.matchesCriteria(registration, criteria)) {
        results.push(registration);
      }
    }

    // Sort results by priority and usage
    const sortedResults = this.sortResults(results);

    this.logger.debug('Middleware discovery completed', {
      criteria,
      resultCount: sortedResults.length,
      totalRegistrations: registrations.size
    });

    return sortedResults;
  }

  /**
   * Gets middleware by category
   */
  getByCategory(
    registrations: Map<string, MiddlewareRegistration>,
    category: MiddlewareCategory
  ): readonly MiddlewareRegistration[] {
    return this.discover(registrations, { category });
  }

  /**
   * Gets middleware by context
   */
  getByContext(
    registrations: Map<string, MiddlewareRegistration>,
    context: ApplicationContext
  ): readonly MiddlewareRegistration[] {
    return this.discover(registrations, { context });
  }

  /**
   * Gets enabled middleware
   */
  getEnabled(
    registrations: Map<string, MiddlewareRegistration>
  ): readonly MiddlewareRegistration[] {
    return this.discover(registrations, { enabled: true });
  }

  /**
   * Gets disabled middleware
   */
  getDisabled(
    registrations: Map<string, MiddlewareRegistration>
  ): readonly MiddlewareRegistration[] {
    return this.discover(registrations, { enabled: false });
  }

  /**
   * Searches middleware by text query
   */
  search(
    registrations: Map<string, MiddlewareRegistration>,
    query: string
  ): readonly MiddlewareRegistration[] {
    if (!query.trim()) {
      return Array.from(registrations.values());
    }

    return this.discover(registrations, { search: query.trim() });
  }

  /**
   * Gets middleware with specific tags
   */
  getByTags(
    registrations: Map<string, MiddlewareRegistration>,
    tags: readonly string[]
  ): readonly MiddlewareRegistration[] {
    return this.discover(registrations, { tags });
  }

  /**
   * Gets middleware within priority range
   */
  getByPriorityRange(
    registrations: Map<string, MiddlewareRegistration>,
    min?: number,
    max?: number
  ): readonly MiddlewareRegistration[] {
    return this.discover(registrations, { 
      priority: { min, max } 
    });
  }

  /**
   * Gets middleware that depend on specific dependencies
   */
  getByDependencies(
    registrations: Map<string, MiddlewareRegistration>,
    dependencies: readonly string[]
  ): readonly MiddlewareRegistration[] {
    return this.discover(registrations, { dependencies });
  }

  /**
   * Gets the most used middleware
   */
  getMostUsed(
    registrations: Map<string, MiddlewareRegistration>,
    limit: number = 10
  ): readonly MiddlewareRegistration[] {
    const allRegistrations = Array.from(registrations.values());
    
    return allRegistrations
      .toSorted((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  /**
   * Gets recently registered middleware
   */
  getRecentlyRegistered(
    registrations: Map<string, MiddlewareRegistration>,
    days: number = 7,
    limit?: number
  ): readonly MiddlewareRegistration[] {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentRegistrations = Array.from(registrations.values())
      .filter(registration => registration.registeredAt > cutoffDate)
      .sort((a, b) => b.registeredAt.getTime() - a.registeredAt.getTime());

    return limit ? recentRegistrations.slice(0, limit) : recentRegistrations;
  }

  /**
   * Gets recently used middleware
   */
  getRecentlyUsed(
    registrations: Map<string, MiddlewareRegistration>,
    days: number = 7,
    limit?: number
  ): readonly MiddlewareRegistration[] {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentlyUsed = Array.from(registrations.values())
      .filter(registration => registration.lastUsed && registration.lastUsed > cutoffDate)
      .sort((a, b) => {
        const aTime = a.lastUsed?.getTime() ?? 0;
        const bTime = b.lastUsed?.getTime() ?? 0;
        return bTime - aTime;
      });

    return limit ? recentlyUsed.slice(0, limit) : recentlyUsed;
  }

  /**
   * Gets middleware suggestions based on context and existing middleware
   */
  getSuggestions(
    registrations: Map<string, MiddlewareRegistration>,
    context: ApplicationContext,
    existingMiddleware: readonly string[] = []
  ): readonly MiddlewareRegistration[] {
    // Get middleware for the context that's not already included
    const contextMiddleware = this.getByContext(registrations, context)
      .filter(registration => !existingMiddleware.includes(registration.name));

    // Sort by usage count and priority
    return contextMiddleware
      .toSorted((a, b) => {
        // Primary sort: priority (higher first)
        const priorityDiff = b.middleware.config.priority - a.middleware.config.priority;
        if (priorityDiff !== 0) return priorityDiff;
        
        // Secondary sort: usage count (higher first)
        return b.usageCount - a.usageCount;
      })
      .slice(0, 10); // Return top 10 suggestions
  }

  /**
   * Checks if a registration matches the discovery criteria
   * Refactored to reduce cognitive complexity by extracting filters
   */
  private matchesCriteria(
    registration: MiddlewareRegistration,
    criteria: MiddlewareDiscoveryCriteria
  ): boolean {
    return this.matchesCategory(registration, criteria) &&
           this.matchesContext(registration, criteria) &&
           this.matchesEnabled(registration, criteria) &&
           this.matchesPriority(registration, criteria) &&
           this.matchesTags(registration, criteria) &&
           this.matchesDependencies(registration, criteria) &&
           this.matchesSearch(registration, criteria);
  }

  /**
   * Checks if registration matches category criteria
   */
  private matchesCategory(
    registration: MiddlewareRegistration,
    criteria: MiddlewareDiscoveryCriteria
  ): boolean {
    if (!criteria.category) {
      return true;
    }
    return registration.category === criteria.category;
  }

  /**
   * Checks if registration matches context criteria
   */
  private matchesContext(
    registration: MiddlewareRegistration,
    criteria: MiddlewareDiscoveryCriteria
  ): boolean {
    if (!criteria.context) {
      return true;
    }
    return registration.contexts.includes(criteria.context);
  }

  /**
   * Checks if registration matches enabled criteria
   */
  private matchesEnabled(
    registration: MiddlewareRegistration,
    criteria: MiddlewareDiscoveryCriteria
  ): boolean {
    if (criteria.enabled === undefined) {
      return true;
    }
    return registration.middleware.config.enabled === criteria.enabled;
  }

  /**
   * Checks if registration matches priority range criteria
   */
  private matchesPriority(
    registration: MiddlewareRegistration,
    criteria: MiddlewareDiscoveryCriteria
  ): boolean {
    if (!criteria.priority) {
      return true;
    }

    const priority = registration.middleware.config.priority;
    return this.isPriorityInRange(priority, criteria.priority.min, criteria.priority.max);
  }

  /**
   * Helper method to check if priority is within range
   */
  private isPriorityInRange(priority: number, min?: number, max?: number): boolean {
    const aboveMin = min === undefined || priority >= min;
    const belowMax = max === undefined || priority <= max;
    return aboveMin && belowMax;
  }

  /**
   * Checks if registration matches tags criteria
   */
  private matchesTags(
    registration: MiddlewareRegistration,
    criteria: MiddlewareDiscoveryCriteria
  ): boolean {
    if (!criteria.tags || criteria.tags.length === 0) {
      return true;
    }
    return criteria.tags.every(tag => registration.tags.includes(tag));
  }

  /**
   * Checks if registration matches dependencies criteria
   */
  private matchesDependencies(
    registration: MiddlewareRegistration,
    criteria: MiddlewareDiscoveryCriteria
  ): boolean {
    if (!criteria.dependencies || criteria.dependencies.length === 0) {
      return true;
    }

    const middlewareDeps = registration.middleware.dependencies ?? [];
    return criteria.dependencies.every(dep => middlewareDeps.includes(dep));
  }

  /**
   * Checks if registration matches search criteria
   */
  private matchesSearch(
    registration: MiddlewareRegistration,
    criteria: MiddlewareDiscoveryCriteria
  ): boolean {
    if (!criteria.search) {
      return true;
    }

    const searchLower = criteria.search.toLowerCase();
    return this.matchesSearchFields(registration, searchLower);
  }

  /**
   * Helper method to check if registration matches search across multiple fields
   */
  private matchesSearchFields(registration: MiddlewareRegistration, searchLower: string): boolean {
    const searchableFields = [
      registration.name.toLowerCase(),
      registration.description.toLowerCase(),
      registration.author.toLowerCase(),
      ...registration.tags.map(tag => tag.toLowerCase())
    ];

    return searchableFields.some(field => field.includes(searchLower));
  }

  /**
   * Sorts discovery results by priority and usage
   */
  private sortResults(results: MiddlewareRegistration[]): MiddlewareRegistration[] {
    return results.sort((a, b) => {
      // Primary sort: priority (higher first)
      const priorityDiff = b.middleware.config.priority - a.middleware.config.priority;
      if (priorityDiff !== 0) return priorityDiff;
      
      // Secondary sort: usage count (higher first)
      const usageDiff = b.usageCount - a.usageCount;
      if (usageDiff !== 0) return usageDiff;
      
      // Tertiary sort: registration date (newer first)
      return b.registeredAt.getTime() - a.registeredAt.getTime();
    });
  }
}

/**
 * Discovery result summary
 */
export interface DiscoveryResult {
  readonly results: readonly MiddlewareRegistration[];
  readonly totalFound: number;
  readonly criteria: MiddlewareDiscoveryCriteria;
  readonly executionTime: number;
}