import { AsyncLocalStorage } from 'async_hooks';
import { createLogContext, mergeLogContexts } from './LogContext';
import { LogContext, RequestContext } from '@/types/common';

export class LogContextManager {
  private readonly contextStorage: AsyncLocalStorage<LogContext>;
  private readonly globalContext: LogContext;

  constructor(globalContext: Partial<LogContext> = {}) {
    this.contextStorage = new AsyncLocalStorage<LogContext>();
    this.globalContext = createLogContext(globalContext);
  }

  public getContext(): LogContext {
    const currentContext = this.contextStorage.getStore();
    return mergeLogContexts(this.globalContext, currentContext);
  }

  public setContext(context: LogContext): void {
    const currentContext = this.contextStorage.getStore() ?? {};
    const mergedContext = mergeLogContexts(currentContext, context);
    this.contextStorage.enterWith(mergedContext);
  }

  public withContext<T>(context: LogContext, fn: () => T): T {
    const mergedContext = mergeLogContexts(this.getContext(), context);
    return this.contextStorage.run(mergedContext, fn);
  }

  public getRequestContext(): RequestContext | undefined {
    const context = this.getContext();
    if (!context.custom?.request) return undefined;
    
    return context.custom.request as RequestContext;
  }

  public setContextFromRequest(request: Request): void {
    const headers = Array.from(request.headers.entries()).reduce(
      (obj, [key, value]) => ({ ...obj, [key]: value }),
      {} as Record<string, string>
    );

    const requestContext: RequestContext = {
      requestId: request.headers.get('x-request-id') ?? crypto.randomUUID(),
      path: new URL(request.url).pathname,
      method: request.method,
      headers,
      startTime: Date.now(),
      userId: request.headers.get('x-user-id') ?? undefined,
      organizationId: request.headers.get('x-organization-id') ?? undefined,
      clientIp: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    };
    
    const logContext: LogContext = {
      requestId: requestContext.requestId,
      userId: requestContext.userId,
      organizationId: requestContext.organizationId,
      custom: {
        request: requestContext
      }
    };
    
    this.setContext(logContext);
  }

  public enrichFromEnvironment(context: LogContext): LogContext {
    const result = { ...context };
    
    // Add environment information if not already present
    result.environment ??= process.env.NODE_ENV ?? 'development';
    
    // Add version information if not already present
    result.version ??= process.env.APP_VERSION ?? '0.0.1';
    
    // Add host information
    result.custom ??= {};
    
    result.custom.host ??= {
        hostname: process.env.HOSTNAME ?? 'unknown',
        pid: process.pid,
        platform: process.platform,
        nodeVersion: process.version,
      };
    
    return result;
  }
}