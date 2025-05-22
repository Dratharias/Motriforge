import { ErrorContextOptions } from "@/types/errors";


export class ErrorContext {
  public request?: any;
  public user?: any;
  public correlationId: string;
  public source: string;
  public isClient: boolean;
  public metadata: Record<string, any>;
  public timestamp: Date;

  constructor(options: ErrorContextOptions) {
    this.request = options.request;
    this.user = options.user;
    this.correlationId = options.correlationId ?? crypto.randomUUID();
    this.source = options.source ?? 'unknown';
    this.isClient = options.isClient ?? false;
    this.metadata = options.metadata ?? {};
    this.timestamp = new Date();
  }

  public addMetadata(key: string, value: any): this {
    this.metadata[key] = value;
    return this;
  }

  public getUserId(): string | undefined {
    if (this.user?.id) {
      return this.user.id;
    }
    
    if (this.metadata.userId) {
      return this.metadata.userId;
    }
    
    return undefined;
  }

  public getRequestPath(): string | undefined {
    if (this.request?.url) {
      return new URL(this.request.url).pathname;
    }
    
    if (this.metadata.path) {
      return this.metadata.path;
    }
    
    if (this.metadata?.request.path) {
      return this.metadata.request.path;
    }
    
    return undefined;
  }

  public toLogFormat(): Record<string, any> {
    return {
      timestamp: this.timestamp.toISOString(),
      correlationId: this.correlationId,
      source: this.source,
      isClient: this.isClient,
      userId: this.getUserId(),
      path: this.getRequestPath(),
      metadata: this.metadata
    };
  }
}