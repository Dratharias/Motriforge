/**
 * Represents the context in which an event occurred
 */
export class EventContext {
  public userId?: string;
  public organizationId?: string;
  public requestId?: string;
  public sessionId?: string;
  public ipAddress?: string;
  public userAgent?: string;
  public locale?: string;
  public traceId?: string;
  public custom?: Record<string, any>;
  public correlationId?: string;

  constructor(data: Partial<EventContext> = {}) {
    this.userId = data.userId;
    this.organizationId = data.organizationId;
    this.requestId = data.requestId;
    this.sessionId = data.sessionId;
    this.ipAddress = data.ipAddress;
    this.userAgent = data.userAgent;
    this.correlationId = data.correlationId;
    this.locale = data.locale;
    this.traceId = data.traceId;
    this.custom = data.custom;
  }

  /**
   * Creates a new context by merging this context with additional data
   * 
   * @param data Additional context data to merge
   * @returns A new EventContext instance with merged data
   */
  public with(data: Partial<EventContext>): EventContext {
    return new EventContext({
      ...this,
      ...data,
      custom: { ...this.custom, ...data.custom }
    });
  }

  /**
   * Converts this context to a plain object for logging or serialization
   */
  public toObject(): Record<string, any> {
    return {
      userId: this.userId,
      organizationId: this.organizationId,
      requestId: this.requestId,
      sessionId: this.sessionId,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      locale: this.locale,
      traceId: this.traceId,
      correlationId: this.correlationId,
      custom: this.custom
    };
  }
}