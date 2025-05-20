/**
 * Represents pagination options for data collections.
 * This is a value object that defines how data should be paginated.
 * 
 * Used in both frontend and backend.
 */
export interface PaginationOptions {
  /**
   * The current page number (1-based)
   */
  page: number;
  
  /**
   * The number of items per page
   */
  size: number;
}

/**
 * Implementation of the PaginationOptions interface
 */
export class PaginationOptionsImpl implements PaginationOptions {
  page: number;
  size: number;
  
  /**
   * @param page The current page number (1-based)
   * @param size The number of items per page
   */
  constructor(page: number = 1, size: number = 20) {
    // Ensure page is at least 1
    this.page = Math.max(1, page);
    
    // Ensure size is between 1 and 100 to prevent excessive queries
    this.size = Math.min(Math.max(1, size), 100);
  }
  
  /**
   * Gets the number of items to skip for database queries
   */
  getSkip(): number {
    return (this.page - 1) * this.size;
  }
  
  /**
   * Creates PaginationOptions for the next page
   */
  next(): PaginationOptions {
    return new PaginationOptionsImpl(this.page + 1, this.size);
  }
  
  /**
   * Creates PaginationOptions for the previous page
   */
  previous(): PaginationOptions {
    return new PaginationOptionsImpl(Math.max(1, this.page - 1), this.size);
  }
  
  /**
   * Creates default pagination options
   */
  static default(): PaginationOptions {
    return new PaginationOptionsImpl();
  }
}
