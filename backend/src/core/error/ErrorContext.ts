import { Types } from 'mongoose';

/**
 * Interface representing the request information relevant for error handling
 */
interface RequestInfo {
  /**
   * The HTTP method of the request
   */
  method?: string;
  
  /**
   * The URL path of the request
   */
  path?: string;
  
  /**
   * The query parameters of the request
   */
  query?: Record<string, string>;
  
  /**
   * The request headers (sanitized)
   */
  headers?: Record<string, string>;
  
  /**
   * The IP address of the client
   */
  ip?: string;
  
  /**
   * The user agent of the client
   */
  userAgent?: string;
}

/**
 * Interface representing user information relevant for error handling
 */
interface UserInfo {
  /**
   * The ID of the user
   */
  id?: Types.ObjectId;
  
  /**
   * The email of the user (potentially redacted)
   */
  email?: string;
  
  /**
   * The roles of the user
   */
  roles?: string[];
}

/**
 * Represents the context in which an error occurred.
 * This is a value object that contains information about the user, request, and environment.
 * 
 * Used in both frontend and backend.
 */
export interface ErrorContext {
  /**
   * A unique correlation ID for the error
   */
  correlationId: string;
  
  /**
   * Information about the request that caused the error
   */
  request?: RequestInfo;
  
  /**
   * Information about the user associated with the error
   */
  user?: UserInfo;
  
  /**
   * The source component or module where the error occurred
   */
  source?: string;
  
  /**
   * Whether the error occurred on the client side
   */
  isClient?: boolean;
  
  /**
   * Additional metadata about the error context
   */
  metadata?: Record<string, any>;
  
  /**
   * The timestamp when the error occurred
   */
  timestamp: Date;
  
  /**
   * Add metadata to the error context
   */
  addMetadata(key: string, value: any): ErrorContext;
  
  /**
   * Get the user ID
   */
  getUserId(): Types.ObjectId | undefined;
  
  /**
   * Get the request path
   */
  getRequestPath(): string | undefined;
  
  /**
   * Get a sanitized context suitable for logging
   */
  toLogFormat(): Record<string, any>;
}

/**
 * Implementation of the ErrorContext interface
 */
export class ErrorContextImpl implements ErrorContext {
  correlationId: string;
  request?: RequestInfo;
  user?: UserInfo;
  source?: string;
  isClient?: boolean;
  metadata?: Record<string, any>;
  timestamp: Date;
  
  constructor(
    correlationId: string = new Types.ObjectId().toString(),
    request?: RequestInfo,
    user?: UserInfo,
    source?: string,
    isClient: boolean = false,
    metadata: Record<string, any> = {}
  ) {
    this.correlationId = correlationId;
    this.request = request;
    this.user = user;
    this.source = source;
    this.isClient = isClient;
    this.metadata = metadata;
    this.timestamp = new Date();
  }
  
  /**
   * Add metadata to the error context
   */
  addMetadata(key: string, value: any): ErrorContext {
    this.metadata ??= {};
    
    this.metadata[key] = value;
    return this;
  }
  
  /**
   * Get the user ID
   */
  getUserId(): Types.ObjectId | undefined {
    return this.user?.id;
  }
  
  /**
   * Get the request path
   */
  getRequestPath(): string | undefined {
    return this.request?.path;
  }
  
  /**
   * Get a sanitized context suitable for logging
   */
  toLogFormat(): Record<string, any> {
    return {
      correlationId: this.correlationId,
      request: this.request ? {
        method: this.request.method,
        path: this.request.path,
        query: this.request.query,
        // Omit potentially sensitive headers
        ip: this.request.ip,
        userAgent: this.request.userAgent
      } : undefined,
      user: this.user ? {
        id: this.user.id,
        // Redact email to protect PII
        hasEmail: !!this.user.email,
        roles: this.user.roles
      } : undefined,
      source: this.source,
      isClient: this.isClient,
      metadata: this.metadata,
      timestamp: this.timestamp.toISOString()
    };
  }
  
  /**
   * Create an error context from a request object
   */
  static fromRequest(req: any, correlationId?: string): ErrorContext {
    const requestInfo: RequestInfo = {
      method: req.method,
      path: req.path ?? req.url,
      query: req.query,
      headers: sanitizeHeaders(req.headers),
      ip: req.ip,
      userAgent: req.headers?.['user-agent']
    };
    
    const userInfo: UserInfo | undefined = req.user ? {
      id: req.user.id,
      email: req.user.email,
      roles: req.user.roles
    } : undefined;
    
    return new ErrorContextImpl(
      correlationId,
      requestInfo,
      userInfo,
      'http-request',
      false
    );
  }
  
  /**
   * Create a minimal error context
   */
  static minimal(source: string, correlationId?: string): ErrorContext {
    return new ErrorContextImpl(
      correlationId,
      undefined,
      undefined,
      source
    );
  }
}

/**
 * Sanitize headers to remove sensitive information
 */
function sanitizeHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
  if (!headers) return undefined;
  
  const sanitized: Record<string, string> = {};
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'set-cookie'];
  
  for (const [key, value] of Object.entries(headers)) {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}
