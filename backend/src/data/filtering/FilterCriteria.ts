/**
 * Represents a filter criterion used to filter data collections.
 * This is a value object that defines a single filtering condition.
 * 
 * Used in both frontend and backend.
 */
export interface FilterCriteria {
  /**
   * The field name to filter on
   */
  field: string;
  
  /**
   * The operator to apply for comparison
   * (equals, notEquals, contains, greaterThan, lessThan, etc.)
   */
  operator: FilterOperator;
  
  /**
   * The value to compare against
   */
  value: any;
  
  /**
   * The type of filter to apply
   * (text, numeric, enum, date, etc.)
   */
  type: string;
  
  /**
   * How to combine this filter with previous filters (AND/OR)
   */
  combineWith?: 'AND' | 'OR';
  
  /**
   * Validates if this filter criteria is properly formed
   */
  isValid(): boolean;
  
  /**
   * Gets the filter implementation from the registry
   */
  getFilter(registry: any): any; // We'll properly type this when implementing Filter and FilterRegistry
}

/**
 * Defines the available filter operators for comparisons
 */
export enum FilterOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'notEquals',
  GREATER_THAN = 'greaterThan',
  LESS_THAN = 'lessThan',
  GREATER_THAN_OR_EQUALS = 'greaterThanOrEquals',
  LESS_THAN_OR_EQUALS = 'lessThanOrEquals',
  CONTAINS = 'contains',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith',
  IN = 'in',
  NOT_IN = 'notIn',
  IS_NULL = 'isNull',
  IS_NOT_NULL = 'isNotNull',
  BETWEEN = 'between'
}

/**
 * Implementation of the FilterCriteria interface
 */
export class FilterCriteriaImpl implements FilterCriteria {
  field: string;
  operator: FilterOperator;
  value: any;
  type: string;
  combineWith?: 'AND' | 'OR';
  
  constructor(
    field: string,
    operator: FilterOperator,
    value: any,
    type: string,
    combineWith?: 'AND' | 'OR'
  ) {
    this.field = field;
    this.operator = operator;
    this.value = value;
    this.type = type;
    this.combineWith = combineWith;
  }
  
  isValid(): boolean {
    // Basic validation to ensure required fields are present
    if (!this.field || !this.operator || this.value === undefined || !this.type) {
      return false;
    }
    
    // Additional validation based on operator and value types could be added here
    return true;
  }
  
  getFilter(registry: any): any {
    // This will be properly implemented when the FilterRegistry is available
    return registry.getFilter(this.type, {
      field: this.field,
      operator: this.operator,
      value: this.value
    });
  }
}
