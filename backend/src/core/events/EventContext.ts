/**
 * Represents the context of an event in the event system.
 * Contains information about the originator of the event.
 * 
 * Used in both frontend and backend.
 */
export interface EventContext {
  /**
   * The ID of the user who triggered the event
   */
  userId?: string;
  
  /**
   * The ID of the organization related to the event
   */
  organizationId?: string;
  
  /**
   * The ID of the HTTP request that triggered the event
   */
  requestId?: string;
  
  /**
   * The ID of the user session that triggered the event
   */
  sessionId?: string;
  
  /**
   * The IP address that triggered the event
   */
  ipAddress?: string;
  
  /**
   * The user agent that triggered the event
   */
  userAgent?: string;
  
  /**
   * The locale setting when the event was triggered
   */
  locale?: string;
  
  /**
   * A trace ID for distributed tracing
   */
  traceId?: string;
  
  /**
   * Custom data for the event context
   */
  custom?: Record<string, any>;
}

/**
 * Options for creating an EventContext
 */
export interface EventContextOptions {
  userId?: string;
  organizationId?: string;
  requestId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  locale?: string;
  traceId?: string;
  custom?: Record<string, any>;
}

/**
 * Implementation of the EventContext interface
 */
export class EventContextImpl implements EventContext {
  userId?: string;
  organizationId?: string;
  requestId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  locale?: string;
  traceId?: string;
  custom?: Record<string, any>;
  
  /**
   * Create a new EventContext with the provided options
   */
  constructor(options: EventContextOptions = {}) {
    this.userId = options.userId;
    this.organizationId = options.organizationId;
    this.requestId = options.requestId;
    this.sessionId = options.sessionId;
    this.ipAddress = options.ipAddress;
    this.userAgent = options.userAgent;
    this.locale = options.locale;
    this.traceId = options.traceId;
    this.custom = options.custom;
  }
  
  /**
   * Creates an event context from a user ID
   */
  static fromUserId(userId: string): EventContext {
    return new EventContextImpl({ userId });
  }
  
  /**
   * Creates an event context from an organization ID
   */
  static fromOrganizationId(organizationId: string): EventContext {
    return new EventContextImpl({ organizationId });
  }
  
  /**
   * Creates an event context from a request context
   */
  static fromRequestContext(requestContext: any): EventContext {
    return new EventContextImpl({
      userId: requestContext.user?.id,
      organizationId: requestContext.organization?.id,
      requestId: requestContext.id,
      sessionId: requestContext.getMetadata('sessionId'),
      ipAddress: requestContext.clientIp,
      userAgent: requestContext.userAgent,
      locale: requestContext.locale,
      traceId: requestContext.traceId
    });
  }
  
  /**
   * Creates an empty event context
   */
  static empty(): EventContext {
    return new EventContextImpl();
  }
  
  /**
   * Sets a custom property
   */
  setCustomProperty(key: string, value: any): this {
    this.custom ??= {};
    
    this.custom[key] = value;
    return this;
  }
}
