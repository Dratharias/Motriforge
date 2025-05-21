import { FilterOptions } from '../../filtering/FilterOptions';
import { PaginationOptions, PaginationOptionsImpl } from '../../filtering/PaginationOptions';
import { SortDirection, SortOptions, SortOptionsImpl } from '../../filtering/SortOptions';
import { HighlightOptions, HighlightOptionsImpl } from './HighlightOptions';

/**
 * Defines the scope of a search operation
 */
export enum SearchScope {
  /**
   * Search all content (based on permissions)
   */
  ALL = 'all',
  
  /**
   * Search only public content
   */
  PUBLIC = 'public',
  
  /**
   * Search only private content (owned by the user)
   */
  PRIVATE = 'private',
  
  /**
   * Search only organization content
   */
  ORGANIZATION = 'organization'
}

/**
 * Represents options for search operations.
 * This is a value object that defines parameters for search queries.
 * 
 * Used in both frontend and backend.
 */
export interface SearchOptions {
  /**
   * Types of entities to search for
   */
  types?: string[];
  
  /**
   * Filters to apply to search results
   */
  filters?: FilterOptions;
  
  /**
   * Sorting options for search results
   */
  sort?: SortOptions;
  
  /**
   * Pagination options for search results
   */
  pagination?: PaginationOptions;
  
  /**
   * Highlight options for search results
   */
  highlight?: HighlightOptions;
  
  /**
   * Whether to include metadata in search results
   */
  includeMetadata?: boolean;
  
  /**
   * Whether to use fuzzy matching for search terms
   */
  fuzzy?: boolean;
  
  /**
   * The maximum edit distance for fuzzy matching
   */
  fuzzyDistance?: number;
  
  /**
   * Visibility filter for search results
   */
  visibilityFilter?: string[];
  
  /**
   * Organization filter for search results
   */
  organizationFilter?: string;
  
  /**
   * The scope of the search
   */
  scope?: SearchScope;
}

/**
 * Options for creating SearchOptions
 */
export interface SearchOptionsConstructorParams {
  types?: string[];
  filters?: FilterOptions;
  sort?: SortOptions;
  pagination?: PaginationOptions;
  highlight?: HighlightOptions;
  includeMetadata?: boolean;
  fuzzy?: boolean;
  fuzzyDistance?: number;
  visibilityFilter?: string[];
  organizationFilter?: string;
  scope?: SearchScope;
}

/**
 * Implementation of the SearchOptions interface
 */
export class SearchOptionsImpl implements SearchOptions {
  types?: string[];
  filters?: FilterOptions;
  sort?: SortOptions;
  pagination?: PaginationOptions;
  highlight?: HighlightOptions;
  includeMetadata?: boolean;
  fuzzy?: boolean;
  fuzzyDistance?: number;
  visibilityFilter?: string[];
  organizationFilter?: string;
  scope?: SearchScope;
  
  /**
   * @param options The search options parameters
   */
  constructor(options: SearchOptionsConstructorParams = {}) {
    this.types = options.types;
    this.filters = options.filters;
    this.sort = options.sort;
    this.pagination = options.pagination;
    this.highlight = options.highlight;
    this.includeMetadata = options.includeMetadata ?? true;
    this.fuzzy = options.fuzzy ?? false;
    this.fuzzyDistance = options.fuzzyDistance ?? 2;
    this.visibilityFilter = options.visibilityFilter;
    this.organizationFilter = options.organizationFilter;
    this.scope = options.scope ?? SearchScope.ALL;
  }
  
  /**
   * Create default search options
   */
  static default(): SearchOptions {
    return new SearchOptionsImpl({
      sort: new SortOptionsImpl('_score', SortDirection.DESC),
      pagination: new PaginationOptionsImpl(1, 20),
      highlight: new HighlightOptionsImpl(),
      includeMetadata: true,
      fuzzy: false,
      fuzzyDistance: 2,
      scope: SearchScope.ALL
    });
  }
  
  /**
   * Create search options for a specific type
   */
  static forType(type: string): SearchOptions {
    return new SearchOptionsImpl({
      ...this.defaultOptionsObject(),
      types: [type]
    });
  }
  
  /**
   * Create search options for a specific organization
   */
  static forOrganization(organizationId: string): SearchOptions {
    return new SearchOptionsImpl({
      ...this.defaultOptionsObject(),
      organizationFilter: organizationId,
      scope: SearchScope.ORGANIZATION
    });
  }
  
  /**
   * Create search options for public content only
   */
  static publicOnly(): SearchOptions {
    return new SearchOptionsImpl({
      ...this.defaultOptionsObject(),
      scope: SearchScope.PUBLIC
    });
  }
  
  /**
   * Create search options for private content only
   */
  static privateOnly(): SearchOptions {
    return new SearchOptionsImpl({
      ...this.defaultOptionsObject(),
      scope: SearchScope.PRIVATE
    });
  }
  
  /**
   * Helper method to get the default options object
   */
  private static defaultOptionsObject(): SearchOptionsConstructorParams {
    return {
      sort: new SortOptionsImpl('_score', SortDirection.DESC),
      pagination: new PaginationOptionsImpl(1, 20),
      highlight: new HighlightOptionsImpl(),
      includeMetadata: true,
      fuzzy: false,
      fuzzyDistance: 2,
      scope: SearchScope.ALL
    };
  }
}
