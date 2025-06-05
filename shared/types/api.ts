export interface ApiResponse<T = any> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: ApiError;
  readonly metadata: ResponseMetadata;
  readonly timestamp: Date;
  readonly requestId: string;
}

export interface ApiError {
  readonly code: string;
  readonly message: string;
  readonly details?: any;
  readonly statusCode: number;
  readonly timestamp: Date;
}

export interface ResponseMetadata {
  readonly version: string;
  readonly processingTime: number;
  readonly pagination?: PaginationMetadata;
  readonly cache?: CacheMetadata;
}

export interface PaginationMetadata {
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
  readonly hasNext: boolean;
  readonly hasPrevious: boolean;
}

export interface CacheMetadata {
  readonly cached: boolean;
  readonly ttl?: number;
  readonly lastModified?: Date;
}

export interface RequestContext {
  request: Request;
  response?: Response;
  readonly requestId: string;
  readonly startTime: Date;
  user?: User;
  permissions?: Permission[];
  validatedData?: any;
  readonly metadata: Map<string, any>;
}

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: ValidationError[];
  readonly sanitizedData?: any;
}

export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly code: string;
  readonly value?: any;
}

export interface RouteDefinition {
  readonly path: string;
  readonly method: HttpMethod;
  readonly handler: RouteHandler;
  readonly middlewares?: Middleware[];
  readonly version: string;
  readonly permissions?: string[];
  readonly rateLimit?: RateLimitConfig;
  readonly validation?: ValidationSchema;
}

export interface RateLimitConfig {
  readonly windowMs: number;
  readonly maxRequests: number;
  readonly skipSuccessfulRequests?: boolean;
}

export interface ValidationSchema {
  readonly body?: any;
  readonly query?: any;
  readonly params?: any;
  readonly headers?: any;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
export type RouteHandler = (context: RequestContext) => Promise<any>;
export type NextFunction = () => Promise<void>;
export type MiddlewareFunction = (context: RequestContext, next: NextFunction) => Promise<void>;

export interface Middleware {
  execute(context: RequestContext, next: NextFunction): Promise<void>;
}

export interface User {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly roles: string[];
}

export interface Permission {
  readonly resource: string;
  readonly action: string;
}