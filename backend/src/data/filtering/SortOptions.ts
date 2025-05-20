/**
 * Represents sorting options for data collections.
 * This is a value object that defines how data should be sorted.
 * 
 * Used in both frontend and backend.
 */
export interface SortOptions {
  /**
   * The field name to sort by
   */
  field: string;
  
  /**
   * The direction of the sort (ascending or descending)
   */
  direction: SortDirection;
  
  /**
   * Optional sorting mode for fields with multiple values
   * (e.g., min, max, avg)
   */
  mode?: SortMode;
}

/**
 * Defines the available sort directions
 */
export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc'
}

/**
 * Defines the available sort modes for multi-valued fields
 */
export enum SortMode {
  MIN = 'min',
  MAX = 'max',
  AVG = 'avg'
}

/**
 * Implementation of the SortOptions interface
 */
export class SortOptionsImpl implements SortOptions {
  field: string;
  direction: SortDirection;
  mode?: SortMode;
  
  constructor(
    field: string, 
    direction: SortDirection = SortDirection.ASC,
    mode?: SortMode
  ) {
    this.field = field;
    this.direction = direction;
    this.mode = mode;
  }
  
  /**
   * Creates a new SortOptions instance for ascending order
   */
  static asc(field: string, mode?: SortMode): SortOptions {
    return new SortOptionsImpl(field, SortDirection.ASC, mode);
  }
  
  /**
   * Creates a new SortOptions instance for descending order
   */
  static desc(field: string, mode?: SortMode): SortOptions {
    return new SortOptionsImpl(field, SortDirection.DESC, mode);
  }
}
