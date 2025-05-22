import { ClientInfo, LogEntry, PerformanceMetrics, UserInfo } from "@/types/logging";


export class RequestLogEnricher {
  private readonly sensitiveHeaders = [
    'authorization', 
    'cookie', 
    'x-api-key', 
    'x-token',
    'x-auth',
    'password'
  ];
  
  private readonly sensitiveParams = [
    'password',
    'token',
    'apiKey',
    'secret',
    'key',
    'credential'
  ];

  public enrichLogFromRequest(entry: LogEntry, request: Request): LogEntry {
    const enriched: LogEntry = { ...entry };

    // Ensure metadata exists
    enriched.metadata ??= {};

    const url = new URL(request.url);

    enriched.metadata.request = {
      method: request.method,
      path: url.pathname,
      query: this.sanitizeURLParams(url.searchParams),
      headers: this.sanitizeHeaders(this.extractHeaders(request)),
    };

    const clientInfo = this.extractClientInfo(request);
    if (clientInfo) {
      enriched.clientInfo = clientInfo;
    }

    const userInfo = this.extractUserInfo(request);
    if (userInfo) {
      enriched.userId = userInfo.id;
      enriched.metadata.user ??= userInfo;
    }

    return enriched;
  }

  public extractUserInfo(request: Request): UserInfo | null {
    const userId = request.headers.get('x-user-id');
    if (!userId) return null;

    return {
      id: userId,
      email: request.headers.get('x-user-email') ?? undefined,
      role: request.headers.get('x-user-role') ?? undefined,
    };
  }

  public extractClientInfo(request: Request): ClientInfo {
    const userAgent = request.headers.get('user-agent') ?? '';
    return {
      userAgent: userAgent || undefined,
      ip: this.extractClientIP(request),
      deviceType: this.determineDeviceType(userAgent),
      browser: this.determineBrowser(userAgent),
    };
  }

  public extractPerformanceMetrics(request: Request): PerformanceMetrics {
    const startTime = (request as any).startTime;
    const metrics: PerformanceMetrics = {};

    if (startTime != null) {
      metrics.responseTime = Date.now() - startTime;
    }

    return metrics;
  }

  public sanitizeRequestData(request: Request): any {
    const url = new URL(request.url);

    const sanitized: Record<string, any> = {
      method: request.method,
      url: url.pathname,
      headers: this.sanitizeHeaders(this.extractHeaders(request)),
    };

    if (url.search) {
      sanitized.query = this.sanitizeURLParams(url.searchParams);
    }

    return sanitized;
  }

  private extractHeaders(request: Request): Record<string, string> {
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    return headers;
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};

    for (const [name, value] of Object.entries(headers)) {
      sanitized[name] = this.sensitiveHeaders.includes(name.toLowerCase())
        ? '[REDACTED]'
        : value;
    }

    return sanitized;
  }

  private sanitizeURLParams(params: URLSearchParams): Record<string, string> {
    const result: Record<string, string> = {};

    params.forEach((value, key) => {
      result[key] = this.sensitiveParams.some(param =>
        key.toLowerCase().includes(param.toLowerCase())
      )
        ? '[REDACTED]'
        : value;
    });

    return result;
  }

  private extractClientIP(request: Request): string | undefined {
    return request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
           request.headers.get('x-real-ip') ??
           request.headers.get('cf-connecting-ip') ??
           request.headers.get('true-client-ip') ??
           undefined;
  }

  private determineDeviceType(userAgent: string): string {
    const lowerUA = userAgent.toLowerCase();

    if (lowerUA.includes('mobile')) return 'mobile';
    if (lowerUA.includes('tablet') || lowerUA.includes('ipad')) return 'tablet';
    return 'desktop';
  }

  private determineBrowser(userAgent: string): string {
    const lowerUA = userAgent.toLowerCase();

    if (lowerUA.includes('chrome')) return 'chrome';
    if (lowerUA.includes('firefox')) return 'firefox';
    if (lowerUA.includes('safari')) return 'safari';
    if (lowerUA.includes('edge')) return 'edge';
    if (lowerUA.includes('opera')) return 'opera';
    return 'unknown';
  }
}
