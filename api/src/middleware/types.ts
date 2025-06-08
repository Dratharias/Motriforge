import { ServerResponse } from 'http';

export interface MiddlewareContext {
  readonly request: Request;
  readonly response: ServerResponse;
  readonly user?: AuthenticatedUser;
  readonly requestId: string;
  readonly startTime: number;
  readonly params?: Record<string, string>;
  readonly validate?: ValidationUtils;
}

export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly institutionId?: string | undefined;
}

export type MiddlewareNext = () => Promise<Response>;

export type Middleware = (context: MiddlewareContext, next: MiddlewareNext) => Promise<Response>;

export interface ValidationUtils {
  body<T>(schema: unknown): Promise<T>;
  query<T>(schema: unknown): T;
  params<T>(schema: unknown): T;
}
