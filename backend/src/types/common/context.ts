/**
 * Represents the context of an event in the event system.
 * Contains information about the originator of the event.
 **/
export interface EventContext {
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
 * Context for an HTTP request
 */
export interface RequestContext {
  requestId: string;
  path: string;
  method: string;
  headers: Record<string, string>;
  startTime: number;
  userId?: string;
  organizationId?: string;
  clientIp?: string;
  userAgent?: string;
}

/**
 * Context about the current user
 */
export interface UserContext {
  id: string;
  email?: string;
  organizationId?: string;
  roles?: string[];
  permissions?: string[];
}

/**
 * Interface for providing user data
 */
export interface UserProvider {
  getCurrentUser(): UserContext | null;
}

/**
 * Configuration for the event context provider
 */
export interface EventContextConfig {
  environment: string;
  version: string;
  application: string;
  includeUserAgent: boolean;
  includeIpAddress: boolean;
}

export interface LogContext {
  component?: string;
  requestId?: string;
  userId?: string;
  organizationId?: string;
  sessionId?: string;
  correlationId?: string;
  environment?: string;
  version?: string;
  custom?: Record<string, any>;
}