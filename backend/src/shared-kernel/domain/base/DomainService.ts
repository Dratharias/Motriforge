/**
 * Base class for all domain services.
 * Domain services encapsulate domain logic that doesn't naturally fit within entities or value objects.
 */
export abstract class DomainService {
  protected readonly serviceName: string;

  constructor(serviceName?: string) {
    this.serviceName = serviceName ?? this.constructor.name;
  }

  /**
   * Gets the name of the domain service
   */
  public getServiceName(): string {
    return this.serviceName;
  }

  /**
   * Validates the service's preconditions before executing operations
   */
  protected abstract validatePreconditions(...args: any[]): void;

  /**
   * Validates the service's postconditions after executing operations
   */
  protected abstract validatePostconditions(result: any, ...args: any[]): void;

  /**
   * Template method for executing domain operations with validation
   */
  protected async executeOperation<T>(
    operation: () => Promise<T> | T,
    ...args: any[]
  ): Promise<T> {
    try {
      // Validate preconditions
      this.validatePreconditions(...args);

      // Execute the operation
      const result = await operation();

      // Validate postconditions
      this.validatePostconditions(result, ...args);

      return result;
    } catch (error) {
      this.handleError(error as Error, ...args);
      throw error;
    }
  }

  /**
   * Handles errors that occur during domain operations
   */
  protected handleError(error: Error, ...args: any[]): void {
    // Default implementation - can be overridden by subclasses
    console.error(`Error in ${this.serviceName}:`, error.message, { args });
  }

  /**
   * Logs domain service activities
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logEntry = {
      service: this.serviceName,
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(data && { data })
    };

    switch (level) {
      case 'info':
        console.info(logEntry);
        break;
      case 'warn':
        console.warn(logEntry);
        break;
      case 'error':
        console.error(logEntry);
        break;
    }
  }

  /**
   * Ensures domain invariants are maintained
   */
  protected ensureInvariant(condition: boolean, message: string): void {
    if (!condition) {
      throw new DomainInvariantViolationError(message, this.serviceName);
    }
  }

  /**
   * Ensures business rules are followed
   */
  protected ensureBusinessRule(condition: boolean, message: string): void {
    if (!condition) {
      throw new BusinessRuleViolationError(message, this.serviceName);
    }
  }

  /**
   * Creates a scoped context for the operation
   */
  protected createOperationContext(operationName: string, data?: any): OperationContext {
    return new OperationContext(this.serviceName, operationName, data);
  }
}

/**
 * Error thrown when a domain invariant is violated
 */
export class DomainInvariantViolationError extends Error {
  constructor(message: string, serviceName: string) {
    super(`Domain invariant violation in ${serviceName}: ${message}`);
    this.name = 'DomainInvariantViolationError';
  }
}

/**
 * Error thrown when a business rule is violated
 */
export class BusinessRuleViolationError extends Error {
  constructor(message: string, serviceName: string) {
    super(`Business rule violation in ${serviceName}: ${message}`);
    this.name = 'BusinessRuleViolationError';
  }
}

/**
 * Operation context for tracking domain service operations
 */
export class OperationContext {
  public readonly operationId: string;
  public readonly serviceName: string;
  public readonly operationName: string;
  public readonly startTime: Date;
  public readonly data?: any;

  constructor(serviceName: string, operationName: string, data?: any) {
    this.operationId = `${serviceName}.${operationName}.${Date.now()}`;
    this.serviceName = serviceName;
    this.operationName = operationName;
    this.startTime = new Date();
    this.data = data;
  }

  /**
   * Gets the duration of the operation in milliseconds
   */
  getDuration(): number {
    return Date.now() - this.startTime.getTime();
  }

  /**
   * Creates a log entry for the operation
   */
  toLogEntry(): Record<string, any> {
    return {
      operationId: this.operationId,
      serviceName: this.serviceName,
      operationName: this.operationName,
      startTime: this.startTime.toISOString(),
      duration: this.getDuration(),
      ...(this.data && { data: this.data })
    };
  }
}