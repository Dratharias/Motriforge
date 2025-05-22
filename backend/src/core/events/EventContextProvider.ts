import { AsyncLocalStorage } from 'async_hooks';
import { EventContext } from './models/EventContext';
import { Event } from './models/Event';
import { UserProvider, EventContextConfig, UserContext, RequestContext } from '@/types/common';

/**
 * Provides context information for events
 */
export class EventContextProvider {
  /** Async local storage for request context */
  private readonly requestContext: AsyncLocalStorage<RequestContext>;
  
  /** Provider for user information */
  private readonly userProvider: UserProvider;
  
  /** Configuration */
  private readonly config: EventContextConfig;
  
  /** Default context values */
  private readonly defaultContext: Partial<EventContext>;

  constructor(
    userProvider: UserProvider,
    config: Partial<EventContextConfig> = {}
  ) {
    this.requestContext = new AsyncLocalStorage<RequestContext>();
    this.userProvider = userProvider;
    
    this.config = {
      environment: process.env.NODE_ENV ?? 'development',
      version: process.env.APP_VERSION ?? '1.0.0',
      application: process.env.APP_NAME ?? 'app',
      includeUserAgent: true,
      includeIpAddress: true,
      ...config
    };
    
    this.defaultContext = {
      locale: 'en',
      custom: {
        application: this.config.application,
        environment: this.config.environment,
        version: this.config.version
      }
    };
  }

  /**
   * Get the current context
   * 
   * @returns The combined context from all sources
   */
  public getContext(): EventContext {
    const reqContext = this.getRequestContext();
    const userContext = this.getUserContext();
    
    const context: Partial<EventContext> = {
      ...this.defaultContext
    };
    
    if (reqContext) {
      context.requestId = reqContext.requestId;
      context.userId = reqContext.userId;
      context.organizationId = reqContext.organizationId;
      
      if (this.config.includeIpAddress) {
        context.ipAddress = reqContext.clientIp;
      }
      
      if (this.config.includeUserAgent) {
        context.userAgent = reqContext.userAgent;
      }
    }
    
    if (userContext) {
      context.userId = userContext.id;
      context.organizationId = userContext.organizationId;
      
      if (context.custom) {
        context.custom.roles = userContext.roles;
        context.custom.permissions = userContext.permissions;
      }
    }
    
    return new EventContext(context);
  }

  /**
   * Set the current context
   * 
   * @param context The context to set
   */
  public setContext(context: EventContext): void {
    // This is a bit of a hack since we can't directly set the context
    // We'll set the request context, which will be merged with other sources
    this.requestContext.enterWith({
      requestId: context.requestId ?? crypto.randomUUID(),
      path: '',
      method: '',
      headers: {},
      startTime: Date.now(),
      userId: context.userId,
      organizationId: context.organizationId,
      clientIp: context.ipAddress,
      userAgent: context.userAgent
    });
  }

  /**
   * Run a function with a specific context
   * 
   * @param context The context to use
   * @param fn The function to run
   * @returns The result of the function
   */
  public withContext<T>(context: EventContext, fn: () => T): T {
    const reqContext: RequestContext = {
      requestId: context.requestId ?? crypto.randomUUID(),
      path: '',
      method: '',
      headers: {},
      startTime: Date.now(),
      userId: context.userId,
      organizationId: context.organizationId,
      clientIp: context.ipAddress,
      userAgent: context.userAgent
    };
    
    return this.requestContext.run(reqContext, fn);
  }

  /**
   * Enrich an event with the current context
   * 
   * @param event The event to enrich
   * @returns A new event with context added
   */
  public enrichEventWithContext(event: Event): Event {
    // Skip if event already has context
    if (event.context) {
      return event;
    }
    
    const context = this.getContext();
    
    return event.with({ context });
  }

  /**
   * Get the current request context
   * 
   * @returns The current request context or null if none exists
   */
  public getRequestContext(): RequestContext | null {
    return this.requestContext.getStore() || null;
  }

  /**
   * Get the current user context
   * 
   * @returns The current user context or null if no user is authenticated
   */
  public getUserContext(): UserContext | null {
    return this.userProvider.getCurrentUser();
  }

  /**
   * Extract context information from an HTTP request
   * 
   * @param request The HTTP request
   * @returns Context extracted from the request
   */
  public extractContextFromRequest(request: Request): EventContext {
    const headers = Array.from(request.headers.entries()).reduce(
      (obj, [key, value]) => ({ ...obj, [key]: value }),
      {} as Record<string, string>
    );
    
    // Extract user ID from auth header or cookie if available
    // This is just a placeholder - real implementation would depend on your auth system
    const userId = headers['x-user-id'];
    const organizationId = headers['x-organization-id'];
    
    const context: Partial<EventContext> = {
      ...this.defaultContext,
      requestId: headers['x-request-id'] || crypto.randomUUID(),
      correlationId: headers['x-correlation-id'],
      userId,
      organizationId,
      locale: headers['accept-language']?.split(',')[0] || this.defaultContext.locale
    };
    
    if (this.config.includeIpAddress) {
      context.ipAddress = headers['x-forwarded-for'] || headers['x-real-ip'];
    }
    
    if (this.config.includeUserAgent) {
      context.userAgent = headers['user-agent'];
    }
    
    return new EventContext(context);
  }

  /**
   * Set the request context from an HTTP request
   * 
   * @param request The HTTP request
   */
  public setContextFromRequest(request: Request): void {
    const url = new URL(request.url);
    const headers = Array.from(request.headers.entries()).reduce(
      (obj, [key, value]) => ({ ...obj, [key]: value }),
      {} as Record<string, string>
    );
    
    const userId = headers['x-user-id'];
    const organizationId = headers['x-organization-id'];
    const requestId = headers['x-request-id'] || crypto.randomUUID();
    
    const reqContext: RequestContext = {
      requestId,
      path: url.pathname,
      method: request.method,
      headers,
      startTime: Date.now(),
      userId,
      organizationId,
      clientIp: headers['x-forwarded-for'] || headers['x-real-ip'],
      userAgent: headers['user-agent']
    };
    
    this.requestContext.enterWith(reqContext);
  }
}