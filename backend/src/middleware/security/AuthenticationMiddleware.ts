import { ObjectId } from 'mongodb';
import { UserRole } from '@/types/shared/enums/common';
import { ISecurityContext } from '@/types/shared/base-types';
import { ContextualLogger } from '@/shared-kernel/infrastructure/logging/ContextualLogger';
import { 
  IConfigurableMiddleware, 
  MiddlewareConfig, 
  RequestContext, 
  MiddlewareResult, 
  NextFunction 
} from '../MiddlewareFramework';

/**
 * Authentication result interface
 */
export interface AuthenticationResult {
  readonly success: boolean;
  readonly userId?: ObjectId;
  readonly organizationId?: ObjectId;
  readonly roles: readonly UserRole[];
  readonly sessionId?: string;
  readonly tokenType?: string;
  readonly expiresAt?: Date;
  readonly error?: string;
  readonly metadata?: Record<string, any>;
}

/**
 * Token validation result
 */
export interface TokenValidationResult {
  readonly valid: boolean;
  readonly userId?: ObjectId;
  readonly organizationId?: ObjectId;
  readonly roles: readonly UserRole[];
  readonly sessionId?: string;
  readonly expiresAt?: Date;
  readonly scopes?: readonly string[];
  readonly error?: string;
}

/**
 * Authentication provider interface
 */
export interface IAuthenticationProvider {
  readonly name: string;
  readonly priority: number;
  authenticate(context: RequestContext): Promise<AuthenticationResult>;
  supports(context: RequestContext): boolean;
}

/**
 * Token extractor interface
 */
export interface ITokenExtractor {
  extract(context: RequestContext): string | null;
  getType(): string;
}

/**
 * Token validator interface
 */
export interface ITokenValidator {
  validate(token: string): Promise<TokenValidationResult>;
  supports(tokenType: string): boolean;
}

/**
 * JWT token extractor
 */
export class BearerTokenExtractor implements ITokenExtractor {
  extract(context: RequestContext): string | null {
    const authHeader = context.headers['authorization'] || context.headers['Authorization'];
    if (!authHeader || typeof authHeader !== 'string') {
      return null;
    }

    const match = RegExp(/^Bearer\s+(.+)$/i).exec(authHeader);
    return match ? match[1] : null;
  }

  getType(): string {
    return 'Bearer';
  }
}

/**
 * API key extractor
 */
export class ApiKeyExtractor implements ITokenExtractor {
  private readonly headerName: string;

  constructor(headerName: string = 'X-API-Key') {
    this.headerName = headerName;
  }

  extract(context: RequestContext): string | null {
    const apiKey = context.headers[this.headerName] || context.headers[this.headerName.toLowerCase()];
    return typeof apiKey === 'string' ? apiKey : null;
  }

  getType(): string {
    return 'ApiKey';
  }
}

/**
 * Cookie token extractor
 */
export class CookieTokenExtractor implements ITokenExtractor {
  private readonly cookieName: string;

  constructor(cookieName: string = 'auth_token') {
    this.cookieName = cookieName;
  }

  extract(context: RequestContext): string | null {
    const cookieHeader = context.headers['cookie'] || context.headers['Cookie'];
    if (!cookieHeader || typeof cookieHeader !== 'string') {
      return null;
    }

    const cookies = this.parseCookies(cookieHeader);
    return cookies[this.cookieName] || null;
  }

  getType(): string {
    return 'Cookie';
  }

  private parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });
    return cookies;
  }
}

/**
 * JWT token validator
 */
export class JwtTokenValidator implements ITokenValidator {
  private readonly secretKey: string;
  private readonly issuer?: string;
  private readonly audience?: string;

  constructor(secretKey: string, issuer?: string, audience?: string) {
    this.secretKey = secretKey;
    this.issuer = issuer;
    this.audience = audience;
  }

  async validate(token: string): Promise<TokenValidationResult> {
    try {
      // In a real implementation, you would use a proper JWT library
      const payload = this.decodeJwtPayload(token);
      
      if (!payload) {
        return {
          valid: false,
          roles: [],
          error: 'Invalid token format'
        };
      }

      // Validate expiration
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return {
          valid: false,
          roles: [],
          error: 'Token expired'
        };
      }

      // Validate issuer
      if (this.issuer && payload.iss !== this.issuer) {
        return {
          valid: false,
          roles: [],
          error: 'Invalid issuer'
        };
      }

      // Validate audience
      if (this.audience && payload.aud !== this.audience) {
        return {
          valid: false,
          roles: [],
          error: 'Invalid audience'
        };
      }

      return {
        valid: true,
        userId: payload.sub ?? undefined,
        organizationId: payload.org ?? undefined,
        roles: payload.roles ?? [],
        sessionId: payload.session,
        expiresAt: payload.exp ? new Date(payload.exp * 1000) : undefined,
        scopes: payload.scopes
      };
    } catch (error) {
      return {
        valid: false,
        roles: [],
        error: (error as Error).message
      };
    }
  }

  supports(tokenType: string): boolean {
    return tokenType === 'Bearer' || tokenType === 'JWT';
  }

  private decodeJwtPayload(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = parts[1];
      const decoded = Buffer.from(payload, 'base64url').toString();
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }
}

/**
 * API key validator
 */
export class ApiKeyValidator implements ITokenValidator {
  private readonly apiKeys: Map<string, TokenValidationResult>;

  constructor(apiKeys: Record<string, Omit<TokenValidationResult, 'valid'>>) {
    this.apiKeys = new Map();
    for (const [key, data] of Object.entries(apiKeys)) {
      this.apiKeys.set(key, { ...data, valid: true });
    }
  }

  async validate(token: string): Promise<TokenValidationResult> {
    const result = this.apiKeys.get(token);
    if (!result) {
      return {
        valid: false,
        roles: [],
        error: 'Invalid API key'
      };
    }

    // Check expiration if set
    if (result.expiresAt && new Date() > result.expiresAt) {
      return {
        valid: false,
        roles: [],
        error: 'API key expired'
      };
    }

    return result;
  }

  supports(tokenType: string): boolean {
    return tokenType === 'ApiKey';
  }
}

/**
 * Default authentication provider using token validation
 */
export class TokenAuthenticationProvider implements IAuthenticationProvider {
  public readonly name = 'TokenAuthentication';
  public readonly priority = 100;

  private readonly extractors: ITokenExtractor[];
  private readonly validators: ITokenValidator[];
  private readonly logger: ContextualLogger;

  constructor(
    extractors: ITokenExtractor[],
    validators: ITokenValidator[],
    logger: ContextualLogger
  ) {
    this.extractors = extractors;
    this.validators = validators;
    this.logger = logger;
  }

  async authenticate(context: RequestContext): Promise<AuthenticationResult> {
    // Try each extractor
    for (const extractor of this.extractors) {
      const token = extractor.extract(context);
      if (!token) {
        continue;
      }

      const tokenType = extractor.getType();
      
      // Find a validator that supports this token type
      const validator = this.validators.find(v => v.supports(tokenType));
      if (!validator) {
        this.logger.warn('No validator found for token type', {
          tokenType,
          requestId: context.requestId.toHexString()
        });
        continue;
      }

      try {
        const validationResult = await validator.validate(token);
        
        if (validationResult.valid) {
          this.logger.info('Authentication successful', {
            tokenType,
            userId: validationResult.userId?.toHexString(),
            sessionId: validationResult.sessionId,
            requestId: context.requestId.toHexString()
          });

          return {
            success: true,
            userId: validationResult.userId,
            organizationId: validationResult.organizationId,
            roles: validationResult.roles,
            sessionId: validationResult.sessionId,
            tokenType,
            expiresAt: validationResult.expiresAt,
            metadata: {
              scopes: validationResult.scopes
            }
          };
        } else {
          this.logger.warn('Token validation failed', {
            tokenType,
            error: validationResult.error,
            requestId: context.requestId.toHexString()
          });
        }
      } catch (error) {
        const err = error as Error;
        this.logger.error('Authentication error', err, {
          tokenType,
          requestId: context.requestId.toHexString()
        });
      }
    }

    return {
      success: false,
      roles: [],
      error: 'No valid authentication found'
    };
  }

  supports(context: RequestContext): boolean {
    // Check if any extractor can extract a token
    return this.extractors.some(extractor => extractor.extract(context) !== null);
  }
}

/**
 * Anonymous authentication provider for public endpoints
 */
export class AnonymousAuthenticationProvider implements IAuthenticationProvider {
  public readonly name = 'AnonymousAuthentication';
  public readonly priority = 1; // Lowest priority

  private readonly allowedPaths: string[];

  constructor(allowedPaths: string[] = ['/health', '/ping', '/metrics']) {
    this.allowedPaths = allowedPaths;
  }

  async authenticate(context: RequestContext): Promise<AuthenticationResult> {
    return {
      success: true,
      roles: [],
      metadata: {
        anonymous: true
      }
    };
  }

  supports(context: RequestContext): boolean {
    return this.allowedPaths.some(path => context.path.startsWith(path));
  }
}

/**
 * Authentication middleware configuration
 */
export interface AuthenticationMiddlewareConfig extends MiddlewareConfig {
  readonly providers: IAuthenticationProvider[];
  readonly optional: boolean;
  readonly skipPaths: readonly string[];
  readonly requireHttps: boolean;
  readonly createSecurityContext: boolean;
}

/**
 * Authentication middleware implementation
 */
export class AuthenticationMiddleware implements IConfigurableMiddleware {
  public readonly name = 'AuthenticationMiddleware';
  public readonly config: AuthenticationMiddlewareConfig;
  public readonly dependencies?: string[];

  private readonly providers: IAuthenticationProvider[];
  private readonly logger: ContextualLogger;

  constructor(config: AuthenticationMiddlewareConfig, logger: ContextualLogger) {
    this.config = config;
    this.providers = config.providers.toSorted((a, b) => b.priority - a.priority);
    this.logger = logger;
  }

  async execute(context: RequestContext, next: NextFunction): Promise<void> {
    const startTime = Date.now();

    this.logger.debug('Authentication middleware starting', {
      path: context.path,
      method: context.method,
      requestId: context.requestId.toHexString()
    });

    try {
      // Check if authentication should be skipped
      if (this.shouldSkipAuthentication(context)) {
        this.logger.debug('Authentication skipped for path', {
          path: context.path,
          requestId: context.requestId.toHexString()
        });
        await next();
        return;
      }

      // Check HTTPS requirement
      if (this.config.requireHttps && !this.isHttps(context)) {
        throw new Error('HTTPS required');
      }

      // Attempt authentication with providers
      const authResult = await this.performAuthentication(context);

      if (authResult.success) {
        // Add authentication info to context
        if (this.config.createSecurityContext) {
          context.securityContext = this.createSecurityContext(authResult, context);
        }
        context.user = {
          id: authResult.userId,
          organizationId: authResult.organizationId,
          roles: authResult.roles,
          sessionId: authResult.sessionId
        };

        this.logger.debug('Authentication successful', {
          userId: authResult.userId?.toHexString(),
          roles: authResult.roles,
          duration: Date.now() - startTime,
          requestId: context.requestId.toHexString()
        });

        await next();
      } else if (this.config.optional) {
          this.logger.debug('Authentication failed but optional', {
            error: authResult.error,
            requestId: context.requestId.toHexString()
          });
          await next();
        } else {
          throw new Error(authResult.error ?? 'Authentication failed');
        }
    } catch (error) {
      const err = error as Error;
      this.logger.error('Authentication middleware error', err, {
        path: context.path,
        duration: Date.now() - startTime,
        requestId: context.requestId.toHexString()
      });
      throw err;
    }
  }

  shouldExecute(context: RequestContext): boolean {
    return !this.shouldSkipAuthentication(context);
  }

  async onError(error: Error, context: RequestContext): Promise<MiddlewareResult> {
    this.logger.error('Authentication middleware error', error, {
      path: context.path,
      requestId: context.requestId.toHexString()
    });

    return {
      success: false,
      error,
      shouldContinue: false,
      statusCode: 401,
      response: {
        error: 'Authentication failed',
        message: this.config.optional ? error.message : 'Invalid authentication credentials'
      }
    };
  }

  private async performAuthentication(context: RequestContext): Promise<AuthenticationResult> {
    for (const provider of this.providers) {
      if (provider.supports(context)) {
        try {
          const result = await provider.authenticate(context);
          if (result.success) {
            return result;
          }
        } catch (error) {
          const err = error as Error;
          this.logger.warn('Authentication provider failed', {
            providerName: provider.name,
            error: err.message,
            requestId: context.requestId.toHexString()
          });
        }
      }
    }

    return {
      success: false,
      roles: [],
      error: 'No authentication provider could authenticate the request'
    };
  }

  private shouldSkipAuthentication(context: RequestContext): boolean {
    return this.config.skipPaths.some(path => context.path.startsWith(path));
  }

  private isHttps(context: RequestContext): boolean {
    const proto = context.headers['x-forwarded-proto'] ?? context.headers['X-Forwarded-Proto'];
    return proto === 'https' || context.path.startsWith('https://');
  }

  private createSecurityContext(
    authResult: AuthenticationResult,
    requestContext: RequestContext
  ): ISecurityContext {
    return {
      userId: authResult.userId,
      organizationId: authResult.organizationId,
      roles: authResult.roles,
      permissions: [], // Would be populated based on roles
      sessionId: authResult.sessionId,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      hasRole: (role: UserRole) => authResult.roles.includes(role),
      hasPermission: () => false, // Would be implemented based on actual permissions
      hasAnyRole: (roles: readonly UserRole[]) => roles.some(role => authResult.roles.includes(role)),
      hasAnyPermission: () => false // Would be implemented based on actual permissions
    };
  }
}

/**
 * Authentication middleware factory
 */
export class AuthenticationMiddlewareFactory {
  /**
   * Creates a default authentication middleware with JWT and API key support
   */
  static createDefault(
    jwtSecret: string,
    apiKeys: Record<string, Omit<TokenValidationResult, 'valid'>>,
    logger: ContextualLogger,
    options: Partial<AuthenticationMiddlewareConfig> = {}
  ): AuthenticationMiddleware {
    const extractors = [
      new BearerTokenExtractor(),
      new ApiKeyExtractor(),
      new CookieTokenExtractor()
    ];

    const validators = [
      new JwtTokenValidator(jwtSecret),
      new ApiKeyValidator(apiKeys)
    ];

    const providers = [
      new TokenAuthenticationProvider(extractors, validators, logger),
      new AnonymousAuthenticationProvider()
    ];

    const config: AuthenticationMiddlewareConfig = {
      enabled: true,
      priority: 900, // High priority
      providers,
      optional: false,
      skipPaths: ['/health', '/ping', '/metrics'],
      requireHttps: false,
      createSecurityContext: true,
      ...options
    };

    return new AuthenticationMiddleware(config, logger);
  }

  /**
   * Creates an authentication middleware for development with relaxed security
   */
  static createDevelopment(logger: ContextualLogger): AuthenticationMiddleware {
    const config: AuthenticationMiddlewareConfig = {
      enabled: true,
      priority: 900,
      providers: [new AnonymousAuthenticationProvider()],
      optional: true,
      skipPaths: [],
      requireHttps: false,
      createSecurityContext: true
    };

    return new AuthenticationMiddleware(config, logger);
  }
}