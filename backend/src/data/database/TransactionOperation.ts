/**
 * Types of operations that can be performed in a transaction
 */
export type OperationType = 'findOne' | 'findMany' | 'insertOne' | 'insertMany' | 'updateOne' | 'updateMany' | 'deleteOne' | 'deleteMany' | 'aggregate';

/**
 * Represents a single operation in a database transaction
 */
export class TransactionOperation {
  private readonly type: OperationType;
  private readonly collectionName: string;
  private readonly params: any;
  private readonly timestamp: Date;

  constructor(type: OperationType, collectionName: string, params: any) {
    this.type = type;
    this.collectionName = collectionName;
    this.params = params;
    this.timestamp = new Date();
  }

  /**
   * Get the operation type
   */
  public getType(): OperationType {
    return this.type;
  }

  /**
   * Get the collection name
   */
  public getCollectionName(): string {
    return this.collectionName;
  }

  /**
   * Get the operation parameters
   */
  public getParams(): any {
    return this.params;
  }

  /**
   * Get the operation timestamp
   */
  public getTimestamp(): Date {
    return this.timestamp;
  }

  /**
   * Convert operation to string
   */
  public toString(): string {
    return `${this.type} operation on collection ${this.collectionName} at ${this.timestamp.toISOString()}`;
  }

  /**
   * Convert operation to JSON
   */
  public toJSON(): object {
    return {
      type: this.type,
      collectionName: this.collectionName,
      params: this.sanitizeParams(this.params),
      timestamp: this.timestamp
    };
  }

  /**
   * Sanitize parameters for logging
   * @param params Operation parameters
   */
  private sanitizeParams(params: any): any {
    // Create a deep copy to avoid mutating the original
    const sanitized = JSON.parse(JSON.stringify(params));
    
    // Remove potentially sensitive data or large objects that don't need to be logged
    if (sanitized.options?.session) {
      sanitized.options.session = '[ClientSession]';
    }
    
    return sanitized;
  }
}