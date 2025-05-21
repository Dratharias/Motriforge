import { ErrorHandler } from '../ErrorHandler';
import { AuthError, TokenExpiredError, InvalidCredentialsError } from '../exceptions/AuthError';
import { ErrorContext } from '../ErrorContext';
import { ErrorResult } from '../ErrorResult';
import { ApiError } from '../ApiError';
import { LoggerFacade } from '../../logging/LoggerFacade';
import { ErrorAction } from '../constants/ErrorAction';
import { v4 as uuidv4 } from 'uuid';

/**
 * Configuration options for the AuthErrorHandler
 */
export interface AuthErrorConfig {
  /**
   * URL to redirect to on authentication failure
   */
  loginRedirectUrl?: string;
  
  /**
   * Whether to include the original error message in responses
   */
  includeOriginalMessage?: boolean;
  
  /**
   * Whether to include auth error details in responses
   */
  includeDetails?: boolean;
  
  /**
   * Maximum failed login attempts before applying rate limiting
   */
  maxFailedAttempts?: number;
  
  /**
   * Rate limiting window in seconds
   */
  rateLimitWindowSeconds?: number;
}

/**
 * Handler for authentication and authorization errors
 */
export class AuthErrorHandler implements ErrorHandler {
  /**
   * Configuration options
   */
  private readonly config: AuthErrorConfig;
  
  /**
   * Logger for auth errors
   */
  private readonly logger: LoggerFacade;
  
  /**
   * Reference to the auth service for additional operations
   * like checking rate limits, refreshing tokens, etc.
   */
  private authService: any; // Replace with actual AuthService type
  
  /**
   * Create a new AuthErrorHandler
   * 
   * @param config - Configuration options
   * @param logger - Logger instance
   * @param authService - Auth service instance
   */
  constructor(
    config: AuthErrorConfig, 
    logger: LoggerFacade,
    authService: any // Replace with actual AuthService type
  ) {
    this.config = {
      includeOriginalMessage: false,
      includeDetails: false,
      maxFailedAttempts: 5,
      rateLimitWindowSeconds: 300,
      ...config
    };
    
    this.logger = logger.withComponent('AuthErrorHandler');
    this.authService = authService;
  }
  
  /**
   * Handle an authentication or authorization error
   * 
   * @param error - Auth error to handle
   * @param context - Error context
   * @returns Error handling result
   */
  public handle(error: Error, context?: ErrorContext): ErrorResult {
    if (!(error instanceof AuthError)) {
      throw new Error(`AuthErrorHandler cannot handle error of type ${error.constructor.name}`);
    }
    
    const authError = error;
    const correlationId = context?.correlationId ?? uuidv4();
    
    // Handle specific types of auth errors
    if (error instanceof TokenExpiredError) {
      return this.handleTokenExpired(error, context);
    }
    
    if (error instanceof InvalidCredentialsError) {
      return this.handleInvalidCredentials(error, context);
    }
    
    // Log the auth error
    this.logger.warn(
      `Authentication error: ${authError.message}`,
      {
        code: authError.code,
        userId: authError.userId,
        action: authError.action,
        correlationId,
        path: context?.request?.path,
        isClient: context?.isClient
      }
    );
    
    // Create API error
    const apiError = new ApiError(
      authError.code,
      this.config.includeOriginalMessage ? authError.message : 'Authentication failed',
      authError.statusCode,
      this.config.includeDetails ? { action: authError.action } : undefined
    );
    
    apiError.correlationId = correlationId;
    
    if (context?.request) {
      apiError.path = context.request.path;
    }
    
    // Determine if we should redirect to the login page
    const shouldRedirect =
      !!this.config.loginRedirectUrl &&
      context?.request instanceof Request &&
      context.request.headers.get('accept')?.includes('text/html');
  
    
    return new ErrorResult(
      true,
      apiError,
      correlationId,
      undefined,
      shouldRedirect ? this.config.loginRedirectUrl : undefined,
      shouldRedirect ? ErrorAction.REDIRECT : ErrorAction.NOTIFY
    );
  }
  
  /**
   * Check if this handler can handle the given error
   * 
   * @param error - Error to check
   * @returns True if this handler can handle the error
   */
  public canHandle(error: Error): boolean {
    return error instanceof AuthError;
  }
  
  /**
   * Get the priority of this handler
   * 
   * @returns Priority value
   */
  public getPriority(): number {
    return 95; // High priority, between validation and database
  }
  
  /**
   * Handle a token expired error
   * 
   * @param error - Token expired error
   * @param context - Error context
   * @returns Error handling result
   */
  private handleTokenExpired(error: TokenExpiredError, context?: ErrorContext): ErrorResult {
    const correlationId = context?.correlationId ?? uuidv4();
    
    this.logger.debug(
      `Token expired for user: ${error.userId ?? 'unknown'}`,
      {
        correlationId,
        path: context?.request?.path
      }
    );
    
    // Create API error
    const apiError = new ApiError(
      'TOKEN_EXPIRED',
      'Your session has expired. Please log in again.',
      401
    );
    
    apiError.correlationId = correlationId;
    
    if (context?.request) {
      apiError.path = context.request.path;
    }
    
    // Determine if we should redirect to the login page
    const shouldRedirect =
      !!this.config.loginRedirectUrl &&
      context?.request instanceof Request &&
      context.request.headers.get('accept')?.includes('text/html');

    
    return new ErrorResult(
      true,
      apiError,
      correlationId,
      undefined,
      shouldRedirect ? this.config.loginRedirectUrl : undefined,
      shouldRedirect ? ErrorAction.REDIRECT : ErrorAction.NOTIFY
    );
  }
  
  /**
   * Handle an invalid credentials error
   * 
   * @param error - Invalid credentials error
   * @param context - Error context
   * @returns Error handling result
   */
  private handleInvalidCredentials(error: InvalidCredentialsError, context?: ErrorContext): ErrorResult {
    const correlationId = context?.correlationId ?? uuidv4();

    let ip: string | undefined;
    if (context?.request instanceof Request) {
      ip = context.request.headers.get('x-forwarded-for') ?? context.request.headers.get('x-real-ip') ?? undefined;
    }
    
    // Log the failed login attempt
    this.logger.warn(
      `Invalid credentials for user: ${error.userId ?? 'unknown'}`,
      {
        correlationId,
        path: context?.request?.path,
        ip: ip
      }
    );
    
    // TODO: Implement rate limiting logic here using authService
    // const rateLimited = this.authService.checkRateLimit(error.userId, context?.request);
    
    // Create API error
    const apiError = new ApiError(
      'INVALID_CREDENTIALS',
      'Invalid username or password',
      401
    );
    
    apiError.correlationId = correlationId;
    
    if (context?.request) {
      apiError.path = context.request.path;
    }
    
    return new ErrorResult(
      true,
      apiError,
      correlationId,
      undefined,
      undefined,
      ErrorAction.NOTIFY
    );
  }
}