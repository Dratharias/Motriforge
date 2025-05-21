import { ApplicationError } from './ApplicationError';

/**
 * Error thrown when database operations fail
 */
export class DatabaseError extends ApplicationError {
  /**
   * Database operation that failed
   */
  public operation: string;
  
  /**
   * Collection/table being operated on
   */
  public collection?: string;
  
  /**
   * Query that was being executed
   */
  public query?: any;
  
  /**
   * Create a new DatabaseError
   * 
   * @param message - Human-readable error message
   * @param operation - Database operation that failed
   * @param code - Error code
   * @param cause - Original error that caused this error
   * @param collection - Collection/table being operated on
   * @param query - Query that was being executed
   */
  constructor(
    message: string,
    operation: string,
    code: string = 'DATABASE_ERROR',
    cause?: Error,
    collection?: string,
    query?: any
  ) {
    super(message, code, 500, undefined, cause);
    
    // Set the prototype explicitly to ensure instanceof works correctly
    Object.setPrototypeOf(this, DatabaseError.prototype);
    
    this.name = this.constructor.name;
    this.operation = operation;
    this.collection = collection;
    this.query = query;
  }
  
  /**
   * Set the database operation that failed
   * 
   * @param operation - Operation name
   * @returns This error for method chaining
   */
  public setOperation(operation: string): this {
    this.operation = operation;
    return this;
  }
  
  /**
   * Set the collection/table being operated on
   * 
   * @param collection - Collection/table name
   * @returns This error for method chaining
   */
  public setCollection(collection: string): this {
    this.collection = collection;
    return this;
  }
  
  /**
   * Set the query that was being executed
   * 
   * @param query - Query object
   * @returns This error for method chaining
   */
  public setQuery(query: any): this {
    this.query = query;
    return this;
  }
  
  /**
   * Get a standardized error code based on this error
   * 
   * @returns Standardized error code
   */
  public getErrorCode(): string {
    return this.code;
  }
}

/**
 * Error thrown when a database entity is not found
 */
export class EntityNotFoundError extends DatabaseError {
  /**
   * ID of the entity that wasn't found
   */
  public entityId: string;
  
  /**
   * Type of entity that wasn't found
   */
  public entityType: string;
  
  /**
   * Create a new EntityNotFoundError
   * 
   * @param entityType - Type of entity
   * @param entityId - ID of the entity
   * @param message - Custom error message (optional)
   */
  constructor(
    entityType: string,
    entityId: string,
    message?: string
  ) {
    super(
      message ?? `${entityType} with ID ${entityId} not found`,
      'find',
      'ENTITY_NOT_FOUND',
      undefined,
      entityType.toLowerCase()
    );
    
    Object.setPrototypeOf(this, EntityNotFoundError.prototype);
    
    this.name = this.constructor.name;
    this.entityId = entityId;
    this.entityType = entityType;
    this.statusCode = 404; // Not Found
  }
}

/**
 * Error thrown when a database constraint is violated
 */
export class ConstraintViolationError extends DatabaseError {
  /**
   * Name of the constraint that was violated
   */
  public constraintName: string;
  
  /**
   * Create a new ConstraintViolationError
   * 
   * @param constraintName - Name of the constraint
   * @param message - Custom error message (optional)
   * @param collection - Collection/table name
   */
  constructor(
    constraintName: string,
    message?: string,
    collection?: string
  ) {
    super(
      message ?? `Constraint violation: ${constraintName}`,
      'save',
      'CONSTRAINT_VIOLATION',
      undefined,
      collection
    );
    
    Object.setPrototypeOf(this, ConstraintViolationError.prototype);
    
    this.name = this.constructor.name;
    this.constraintName = constraintName;
    this.statusCode = 409; // Conflict
  }
}