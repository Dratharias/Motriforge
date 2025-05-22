import { EventContext } from "@/types/common";

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
  constructor(options: EventContext = {}) {
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
