import { v4 as uuidv4 } from 'uuid';

/**
 * Context information for error tracking
 */
export interface ErrorContext {
  readonly traceId: string;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly requestId?: string;
  readonly operationName?: string;
  readonly source?: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Builder for creating error contexts
 */
export class ErrorContextBuilder {
  private readonly traceId: string;
  private userId?: string;
  private sessionId?: string;
  private requestId?: string;
  private operationName?: string;
  private source?: string;
  private metadata?: Record<string, unknown>;

  constructor(traceId?: string) {
    this.traceId = traceId ?? uuidv4();
  }

  /**
   * Set user ID
   */
  setUserId(userId: string): this {
    this.userId = userId;
    return this;
  }

  /**
   * Set session ID
   */
  setSessionId(sessionId: string): this {
    this.sessionId = sessionId;
    return this;
  }

  /**
   * Set request ID
   */
  setRequestId(requestId: string): this {
    this.requestId = requestId;
    return this;
  }

  /**
   * Set operation name
   */
  setOperationName(operationName: string): this {
    this.operationName = operationName;
    return this;
  }

  /**
   * Set source
   */
  setSource(source: string): this {
    this.source = source;
    return this;
  }

  /**
   * Add metadata
   */
  addMetadata(key: string, value: unknown): this {
    this.metadata ??= {};
    this.metadata[key] = value;
    return this;
  }

  /**
   * Set metadata object
   */
  setMetadata(metadata: Record<string, unknown>): this {
    this.metadata = { ...metadata };
    return this;
  }

  /**
   * Build the error context
   */
  build(): ErrorContext {
    return {
      traceId: this.traceId,
      userId: this.userId,
      sessionId: this.sessionId,
      requestId: this.requestId,
      operationName: this.operationName,
      source: this.source,
      metadata: this.metadata ? { ...this.metadata } : undefined
    };
  }

  /**
   * Create a child context with a new trace ID but inherited values
   */
  createChild(): ErrorContextBuilder {
    const child = new ErrorContextBuilder();
    child.userId = this.userId;
    child.sessionId = this.sessionId;
    child.source = this.source;
    child.metadata = this.metadata ? { ...this.metadata } : undefined;
    return child;
  }

  /**
   * Static factory method for quick context creation
   */
  static create(traceId?: string): ErrorContextBuilder {
    return new ErrorContextBuilder(traceId);
  }

  /**
   * Create context from HTTP request headers
   */
  static fromHttpHeaders(headers: Record<string, string>): ErrorContextBuilder {
    const builder = new ErrorContextBuilder(headers['x-trace-id']);
    
    if (headers['x-user-id']) {
      builder.setUserId(headers['x-user-id']);
    }
    
    if (headers['x-session-id']) {
      builder.setSessionId(headers['x-session-id']);
    }
    
    if (headers['x-request-id']) {
      builder.setRequestId(headers['x-request-id']);
    }
    
    return builder;
  }
}