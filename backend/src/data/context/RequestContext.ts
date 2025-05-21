import { Types } from 'mongoose';
import { IOrganization } from '../models/Organization/Organization';
import { IUser } from '../models/User/User';

/**
 * Represents the context of an HTTP request.
 * Contains information about the request, the user, organization and permissions.
 * This is populated by middleware and available throughout the request lifecycle.
 * 
 * Used in both frontend and backend.
 */
export interface RequestContext {
  /**
   * Unique identifier for the request
   */
  id: string;
  
  /**
   * The time when the request started
   */
  startTime: Date;
  
  /**
   * The authenticated user (if any)
   */
  user?: IUser;
  
  /**
   * The active organization (if any)
   */
  organization?: IOrganization;
  
  /**
   * The permissions of the authenticated user
   */
  permissions: string[];
  
  /**
   * The IP address of the client
   */
  clientIp?: string;
  
  /**
   * The user agent of the client
   */
  userAgent?: string;
  
  /**
   * The preferred language of the client
   */
  locale?: string;
  
  /**
   * A trace ID for distributed tracing
   */
  traceId?: string;
  
  /**
   * Custom metadata for the request
   */
  metadata: Record<string, any>;
  
  /**
   * Gets the elapsed time since the request started in milliseconds
   */
  getElapsedTime(): number;
  
  /**
   * Checks if the user has a specific permission
   */
  hasPermission(permission: string): boolean;
  
  /**
   * Sets a metadata value
   */
  setMetadata(key: string, value: any): void;
  
  /**
   * Gets a metadata value
   */
  getMetadata<T>(key: string, defaultValue?: T): T | undefined;
}

/**
 * Implementation of the RequestContext interface
 */
export class RequestContextImpl implements RequestContext {
  id: string;
  startTime: Date;
  user?: IUser;
  organization?: IOrganization;
  permissions: string[];
  clientIp?: string;
  userAgent?: string;
  locale?: string;
  traceId?: string;
  metadata: Record<string, any>;
  
  constructor(
    id: string = new Types.ObjectId().toString(),
    permissions: string[] = [],
    metadata: Record<string, any> = {}
  ) {
    this.id = id;
    this.startTime = new Date();
    this.permissions = permissions;
    this.metadata = metadata;
  }
  
  /**
   * Gets the elapsed time since the request started in milliseconds
   */
  getElapsedTime(): number {
    return new Date().getTime() - this.startTime.getTime();
  }
  
  /**
   * Checks if the user has a specific permission
   */
  hasPermission(permission: string): boolean {
    return this.permissions.includes(permission);
  }
  
  /**
   * Sets a metadata value
   */
  setMetadata(key: string, value: any): void {
    this.metadata[key] = value;
  }
  
  /**
   * Gets a metadata value
   */
  getMetadata<T>(key: string, defaultValue?: T): T | undefined {
    const value = this.metadata[key] as T;
    return value ?? defaultValue;
  }
  
  /**
   * Create a new request context for a specific user
   */
  static forUser(user: IUser, permissions: string[] = []): RequestContext {
    const context = new RequestContextImpl();
    context.user = user;
    context.permissions = permissions;
    return context;
  }
  
  /**
   * Create a new request context for a specific organization
   */
  static forOrganization(
    organization: IOrganization,
    user?: IUser,
    permissions: string[] = []
  ): RequestContext {
    const context = new RequestContextImpl();
    context.organization = organization;
    context.user = user;
    context.permissions = permissions;
    return context;
  }
}
