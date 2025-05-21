import { DomainEvent } from './DomainEvent';
import { EventType } from '../types/EventType';
import { EventMetadata } from './EventMetadata';
import { EventContext } from './EventContext';

/**
 * Represents information about the device used for authentication
 */
export interface DeviceInfo {
  /** Type of device (e.g., 'mobile', 'desktop', 'tablet') */
  type: string;
  
  /** Operating system */
  os?: string;
  
  /** Browser or app name */
  client?: string;
  
  /** IP address */
  ip?: string;
  
  /** User agent string */
  userAgent?: string;
  
  /** Device identifier (if available) */
  deviceId?: string;
}

/**
 * Metadata specific to authentication events
 */
export interface AuthMetadata {
  /** Authentication method used (e.g., 'password', 'oauth', 'mfa') */
  method: string;
  
  /** Authentication provider (e.g., 'local', 'google', 'apple') */
  provider?: string;
  
  /** Time when authentication occurred */
  timestamp: Date;
  
  /** Whether the authentication was successful */
  success: boolean;
  
  /** Error message or code if authentication failed */
  error?: string;
  
  /** Additional authentication factors used */
  factors?: string[];
}

/**
 * Possible auth actions
 */
export enum AuthAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  REGISTER = 'register',
  PASSWORD_RESET = 'password.reset',
  PASSWORD_CHANGE = 'password.changed',
  MFA_ENABLED = 'mfa.enabled',
  MFA_DISABLED = 'mfa.disabled',
  MFA_CHALLENGE = 'mfa.challenge',
  TOKEN_REFRESH = 'token.refresh',
  TOKEN_REVOKED = 'token.revoked',
  FAILED_ATTEMPT = 'failed.attempt',
  ACCOUNT_LOCKED = 'account.locked',
  ACCOUNT_UNLOCKED = 'account.unlocked'
}

/**
 * Represents authentication-related events in the system
 */
export class AuthEvent<T = any> extends DomainEvent<T> {
  /**
   * Information about the device used for authentication
   */
  public readonly device?: DeviceInfo;
  
  /**
   * Authentication-specific metadata
   */
  public readonly authMetadata?: AuthMetadata;

  /**
   * Create a new AuthEvent instance
   * 
   * @param data Configuration for the auth event
   */
  constructor(data: {
    userId: string;
    action: AuthAction | string;
    data: T;
    device?: DeviceInfo;
    authMetadata?: AuthMetadata;
    metadata?: Partial<EventMetadata>;
    context?: EventContext;
    correlationId?: string;
    source?: string;
    type?: EventType;
  }) {
    // Call parent constructor with entity type set to 'auth'
    super({
      entityType: 'auth',
      entityId: data.userId,
      action: data.action,
      data: data.data,
      userId: data.userId,
      metadata: data.metadata,
      context: data.context,
      correlationId: data.correlationId,
      source: data.source ?? 'auth-service',
      type: data.type
    });
    
    this.device = data.device;
    this.authMetadata = data.authMetadata;
  }

  /**
   * Create a new AuthEvent with updated content
   * 
   * @param updates Updates to apply to the event
   * @returns A new AuthEvent instance with the updates applied
   */
  public with(updates: Partial<Omit<AuthEvent<T>, 'id' | 'timestamp' | 'metadata' | 'entityType' | 'entityId'> & { 
    metadata?: Partial<EventMetadata>; 
    data?: T;
    userId?: string;  // Allow updating userId which will update entityId
  }>): AuthEvent<T> {
    return new AuthEvent<T>({
      userId: updates.userId ?? this.entityId, // Use entityId as the source of userId
      action: updates.action ?? this.action,
      data: updates.data ?? this.data,
      device: updates.device ?? this.device,
      authMetadata: updates.authMetadata ?? this.authMetadata,
      metadata: updates.metadata ?? this.metadata,
      context: updates.context ?? this.context,
      correlationId: updates.correlationId ?? this.correlationId,
      source: updates.source ?? this.source,
      type: updates.type ?? this.type
    });
  }

  /**
   * Access the user ID through the entityId
   * 
   * @returns The user ID associated with this auth event
   */
  public getUserId(): string {
    return this.entityId;
  }

  /**
   * Converts the auth event to a plain object for serialization
   */
  public toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      device: this.device,
      authMetadata: this.authMetadata
    };
  }

  /**
   * Create a login event
   * 
   * @param userId The user who logged in
   * @param device Information about the device used
   * @param metadata Additional authentication metadata
   * @returns A new AuthEvent for the login
   */
  public static login<TData = Record<string, any>>(
    userId: string, 
    device?: DeviceInfo, 
    authMetadata?: Partial<AuthMetadata>,
    data?: TData
  ): AuthEvent<TData> {
    return new AuthEvent<TData>({
      userId,
      action: AuthAction.LOGIN,
      data: data ?? ({} as TData),
      device,
      authMetadata: authMetadata ? {
        method: authMetadata.method ?? 'password',
        provider: authMetadata.provider,
        timestamp: authMetadata.timestamp ?? new Date(),
        success: authMetadata.success ?? true,
        error: authMetadata.error,
        factors: authMetadata.factors
      } : undefined
    });
  }

  /**
   * Create a logout event
   * 
   * @param userId The user who logged out
   * @param device Information about the device used
   * @returns A new AuthEvent for the logout
   */
  public static logout<TData = Record<string, any>>(
    userId: string, 
    device?: DeviceInfo,
    data?: TData
  ): AuthEvent<TData> {
    return new AuthEvent<TData>({
      userId,
      action: AuthAction.LOGOUT,
      data: data ?? ({} as TData),
      device,
      authMetadata: {
        method: 'session',
        timestamp: new Date(),
        success: true
      }
    });
  }

  /**
   * Create a failed login attempt event
   * 
   * @param userId The user who attempted to log in
   * @param error The error that occurred
   * @param device Information about the device used
   * @returns A new AuthEvent for the failed login
   */
  public static failedLogin<TData = { reason: string }>(
    userId: string,
    error: string,
    device?: DeviceInfo,
    data?: TData
  ): AuthEvent<TData> {
    return new AuthEvent<TData>({
      userId,
      action: AuthAction.FAILED_ATTEMPT,
      data: (data ?? { reason: error }) as TData,
      device,
      authMetadata: {
        method: 'password',
        timestamp: new Date(),
        success: false,
        error
      }
    });
  }

  /**
   * Create a token refresh event
   * 
   * @param userId The user whose token was refreshed
   * @param tokenInfo Information about the new token
   * @returns A new AuthEvent for the token refresh
   */
  public static tokenRefresh<TData = { tokenId: string }>(
    userId: string,
    tokenInfo: { tokenId: string },
    device?: DeviceInfo
  ): AuthEvent<TData> {
    return new AuthEvent<TData>({
      userId,
      action: AuthAction.TOKEN_REFRESH,
      data: tokenInfo as unknown as TData,
      device,
      authMetadata: {
        method: 'token',
        timestamp: new Date(),
        success: true
      }
    });
  }
}