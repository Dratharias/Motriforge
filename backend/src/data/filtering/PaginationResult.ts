import { PaginationOptions } from './PaginationOptions';

/**
 * Represents the result of applying pagination to a data collection.
 * This is a value object that contains the paginated data and metadata.
 * 
 * Used in both frontend and backend.
 */
export interface PaginationResult<T = any> {
  /**
   * The items for the current page
   */
  items: T[];
  
  /**
   * The total number of items across all pages
   */
  totalItems: number;
  
  /**
   * The current page number (1-based)
   */
  currentPage: number;
  
  /**
   * The total number of pages
   */
  totalPages: number;
  
  /**
   * The number of items per page
   */
  pageSize: number;
  
  /**
   * Whether there is a previous page
   */
  hasPreviousPage: boolean;
  
  /**
   * Whether there is a next page
   */
  hasNextPage: boolean;
}

/**
 * Implementation of the PaginationResult interface
 */
export class PaginationResultImpl<T = any> implements PaginationResult<T> {
  items: T[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  
  /**
   * @param items The items for the current page
   * @param totalItems The total number of items across all pages
   * @param options The pagination options used
   */
  constructor(items: T[], totalItems: number, options: PaginationOptions) {
    this.items = items;
    this.totalItems = totalItems;
    this.currentPage = options.page;
    this.pageSize = options.size;
    
    // Calculate total pages
    this.totalPages = Math.ceil(totalItems / options.size);
    
    // Determine if there are previous/next pages
    this.hasPreviousPage = options.page > 1;
    this.hasNextPage = options.page < this.totalPages;
  }
  
  /**
   * Creates an empty pagination result
   */
  static empty<T>(options: PaginationOptions): PaginationResult<T> {
    return new PaginationResultImpl<T>([], 0, options);
  }
  
  /**
   * Creates a pagination result from all items (calculates pagination)
   */
  static fromAllItems<T>(allItems: T[], options: PaginationOptions): PaginationResult<T> {
    const startIndex = (options.page - 1) * options.size;
    const endIndex = startIndex + options.size;
    const paginatedItems = allItems.slice(startIndex, endIndex);
    
    return new PaginationResultImpl<T>(paginatedItems, allItems.length, options);
  }
}
