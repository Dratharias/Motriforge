import { FilterCriteria, FilterCriteriaImpl, FilterOperator } from './FilterCriteria';

/**
 * Represents a range filter for numeric or date fields
 */
export interface RangeFilter {
  /**
   * The minimum value of the range (inclusive)
   */
  min?: number | Date;
  
  /**
   * The maximum value of the range (inclusive)
   */
  max?: number | Date;
}

/**
 * Represents a boolean filter with conditions
 */
export interface BooleanFilter {
  /**
   * Conditions that must all be true
   */
  must?: FilterCriteria[];
  
  /**
   * Conditions where at least one must be true
   */
  should?: FilterCriteria[];
  
  /**
   * Conditions that must not be true
   */
  mustNot?: FilterCriteria[];
}

/**
 * Represents a nested filter for nested object fields
 */
export interface NestedFilter {
  /**
   * The path to the nested object
   */
  path: string;
  
  /**
   * The filter to apply to the nested object
   */
  filter: FilterCriteria;
}

/**
 * Represents options for filtering data collections.
 * This is a value object that defines how data should be filtered.
 * 
 * Used in both frontend and backend.
 */
export interface FilterOptions {
  /**
   * Simple term filters (exact matches)
   */
  terms?: Record<string, any>;
  
  /**
   * Range filters for numeric or date fields
   */
  range?: Record<string, RangeFilter>;
  
  /**
   * Fields that must exist and not be null
   */
  exists?: string[];
  
  /**
   * Fields that must not exist or be null
   */
  missing?: string[];
  
  /**
   * Boolean filter with must/should/mustNot conditions
   */
  bool?: BooleanFilter;
  
  /**
   * Filters for nested objects
   */
  nested?: NestedFilter[];
  
  /**
   * Convert to filter criteria array
   */
  toFilterCriteria(): FilterCriteria[];
  
  /**
   * Check if filters are empty
   */
  isEmpty(): boolean;
}

/**
 * Implementation of the FilterOptions interface
 */
export class FilterOptionsImpl implements FilterOptions {
  terms?: Record<string, any>;
  range?: Record<string, RangeFilter>;
  exists?: string[];
  missing?: string[];
  bool?: BooleanFilter;
  nested?: NestedFilter[];
  
  constructor(
    terms?: Record<string, any>,
    range?: Record<string, RangeFilter>,
    exists?: string[],
    missing?: string[],
    bool?: BooleanFilter,
    nested?: NestedFilter[]
  ) {
    this.terms = terms;
    this.range = range;
    this.exists = exists;
    this.missing = missing;
    this.bool = bool;
    this.nested = nested;
  }
  
  /**
   * Convert to filter criteria array
   */
  toFilterCriteria(): FilterCriteria[] {
    const criteria: FilterCriteria[] = [];
    
    // Process each filter type and concatenate results
    return [
      ...this.termFiltersToFilterCriteria(),
      ...this.rangeFiltersToFilterCriteria(),
      ...this.existenceFiltersToFilterCriteria(),
      ...this.booleanFiltersToFilterCriteria()
    ];
  }
  
  /**
   * Convert term filters to filter criteria
   */
  private termFiltersToFilterCriteria(): FilterCriteria[] {
    if (!this.terms || Object.keys(this.terms).length === 0) {
      return [];
    }
    
    return Object.entries(this.terms).map(([field, value]) => 
      new FilterCriteriaImpl(
        field,
        FilterOperator.EQUALS,
        value,
        'term'
      )
    );
  }
  
  /**
   * Convert range filters to filter criteria
   */
  private rangeFiltersToFilterCriteria(): FilterCriteria[] {
    if (!this.range || Object.keys(this.range).length === 0) {
      return [];
    }
    
    const criteria: FilterCriteria[] = [];
    
    for (const [field, range] of Object.entries(this.range)) {
      if (range.min !== undefined) {
        criteria.push(new FilterCriteriaImpl(
          field,
          FilterOperator.GREATER_THAN_OR_EQUALS,
          range.min,
          'range',
          'AND'
        ));
      }
      
      if (range.max !== undefined) {
        criteria.push(new FilterCriteriaImpl(
          field,
          FilterOperator.LESS_THAN_OR_EQUALS,
          range.max,
          'range',
          'AND'
        ));
      }
    }
    
    return criteria;
  }
  
  /**
   * Convert existence filters (exists/missing) to filter criteria
   */
  private existenceFiltersToFilterCriteria(): FilterCriteria[] {
    const criteria: FilterCriteria[] = [];
    
    // Add exists filters
    if (this.exists && this.exists.length > 0) {
      const existsCriteria = this.exists.map(field => 
        new FilterCriteriaImpl(
          field,
          FilterOperator.IS_NOT_NULL,
          null,
          'exists',
          'AND'
        )
      );
      criteria.push(...existsCriteria);
    }
    
    // Add missing filters
    if (this.missing && this.missing.length > 0) {
      const missingCriteria = this.missing.map(field => 
        new FilterCriteriaImpl(
          field,
          FilterOperator.IS_NULL,
          null,
          'missing',
          'AND'
        )
      );
      criteria.push(...missingCriteria);
    }
    
    return criteria;
  }
  
  /**
   * Convert boolean filters to filter criteria
   */
  private booleanFiltersToFilterCriteria(): FilterCriteria[] {
    if (!this.bool) {
      return [];
    }
    
    const criteria: FilterCriteria[] = [];
    
    // Process "must" criteria
    if (this.bool.must && this.bool.must.length > 0) {
      const mustCriteria = this.processBooleanSubCriteria(this.bool.must, 'AND');
      criteria.push(...mustCriteria);
    }
    
    // Process "should" criteria
    if (this.bool.should && this.bool.should.length > 0) {
      const shouldCriteria = this.processBooleanSubCriteria(this.bool.should, 'OR');
      criteria.push(...shouldCriteria);
    }
    
    // Process "mustNot" criteria
    if (this.bool.mustNot && this.bool.mustNot.length > 0) {
      const mustNotCriteria = this.bool.mustNot.map(c => {
        if (c instanceof FilterCriteriaImpl) {
          return new FilterCriteriaImpl(
            c.field,
            negate(c.operator),
            c.value,
            c.type,
            'AND'
          );
        }
        return c;
      });
      criteria.push(...mustNotCriteria);
    }
    
    return criteria;
  }
  
  /**
   * Process boolean sub-criteria with the specified combiner
   */
  private processBooleanSubCriteria(
    subCriteria: FilterCriteria[], 
    combiner: 'AND' | 'OR'
  ): FilterCriteria[] {
    return subCriteria.map(c => {
      if (c instanceof FilterCriteriaImpl) {
        return new FilterCriteriaImpl(
          c.field,
          c.operator,
          c.value,
          c.type,
          combiner
        );
      }
      return c;
    });
  }
  
  /**
   * Check if filters are empty
   */
  isEmpty(): boolean {
    return (
      !this.terms || Object.keys(this.terms).length === 0
    ) && (
      !this.range || Object.keys(this.range).length === 0
    ) && (
      !this.exists || this.exists.length === 0
    ) && (
      !this.missing || this.missing.length === 0
    ) && (
      !this.bool || (
        (!this.bool.must || this.bool.must.length === 0) &&
        (!this.bool.should || this.bool.should.length === 0) &&
        (!this.bool.mustNot || this.bool.mustNot.length === 0)
      )
    ) && (
      !this.nested || this.nested.length === 0
    );
  }
  
  /**
   * Create filter options from term filters
   */
  static fromTerms(terms: Record<string, any>): FilterOptions {
    return new FilterOptionsImpl(terms);
  }
  
  /**
   * Create filter options from a range filter
   */
  static fromRange(field: string, min?: number | Date, max?: number | Date): FilterOptions {
    const range: Record<string, RangeFilter> = {
      [field]: { min, max }
    };
    
    return new FilterOptionsImpl(undefined, range);
  }
  
  /**
   * Create filter options from filter criteria
   */
  static fromCriteria(criteria: FilterCriteria[]): FilterOptions {
    const options = new FilterOptionsImpl();
    
    const mustCriteria: FilterCriteria[] = [];
    const shouldCriteria: FilterCriteria[] = [];
    
    for (const criterion of criteria) {
      if (criterion.combineWith === 'OR') {
        shouldCriteria.push(criterion);
      } else {
        mustCriteria.push(criterion);
      }
    }
    
    options.bool = {
      must: mustCriteria.length > 0 ? mustCriteria : undefined,
      should: shouldCriteria.length > 0 ? shouldCriteria : undefined
    };
    
    return options;
  }
}

/**
 * Get the negation of a filter operator
 */
function negate(operator: FilterOperator): FilterOperator {
  switch (operator) {
    case FilterOperator.EQUALS:
      return FilterOperator.NOT_EQUALS;
    case FilterOperator.NOT_EQUALS:
      return FilterOperator.EQUALS;
    case FilterOperator.GREATER_THAN:
      return FilterOperator.LESS_THAN_OR_EQUALS;
    case FilterOperator.LESS_THAN:
      return FilterOperator.GREATER_THAN_OR_EQUALS;
    case FilterOperator.GREATER_THAN_OR_EQUALS:
      return FilterOperator.LESS_THAN;
    case FilterOperator.LESS_THAN_OR_EQUALS:
      return FilterOperator.GREATER_THAN;
    case FilterOperator.CONTAINS:
      return FilterOperator.NOT_IN;
    case FilterOperator.IN:
      return FilterOperator.NOT_IN;
    case FilterOperator.NOT_IN:
      return FilterOperator.IN;
    case FilterOperator.IS_NULL:
      return FilterOperator.IS_NOT_NULL;
    case FilterOperator.IS_NOT_NULL:
      return FilterOperator.IS_NULL;
    default:
      return operator;
  }
}
