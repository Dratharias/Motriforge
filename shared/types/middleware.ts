import type { User, Permission, Session } from "./auth.js";

export interface AuthenticatedRequest {
  readonly user: User;
  readonly session: Session;
  readonly permissions: Permission[];
}

export interface MiddlewareContext {
  readonly request: Request;
  readonly response: Response;
  readonly user?: User;
  readonly session?: Session;
  readonly permissions?: Permission[];
}

export interface RateLimitHeaders {
  readonly 'X-RateLimit-Limit': string;
  readonly 'X-RateLimit-Remaining': string;
  readonly 'X-RateLimit-Reset': string;
  readonly 'Retry-After'?: string;
}

export interface MiddlewareResult {
  readonly success: boolean;
  readonly error?: string;
  readonly headers?: Record<string, string>;
}

export type MiddlewareFunction = (event: any) => Promise<AuthenticatedRequest>;
export type RateLimitMiddleware = (event: any) => void;