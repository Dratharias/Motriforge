import { ApiError } from './ApiError';
import { ErrorAction } from './constants/ErrorAction';

// Use the standard web Response type
type Response = globalThis.Response;

/**
 * Result produced by error handlers, containing information about
 * how an error was handled and what action should be taken.
 */
export class ErrorResult {
  /**
   * Whether the error was successfully handled
   */
  handled: boolean;
  
  /**
   * The API error produced by handling the original error
   */
  error: ApiError;
  
  /**
   * Optional HTTP response to return to the client
   */
  response?: Response;
  
  /**
   * Optional URL to redirect to (when action is REDIRECT)
   */
  redirect?: string;
  
  /**
   * Recommended action to take in response to the error
   */
  action?: ErrorAction;
  
  /**
   * Correlation ID for tracing the error across the system
   */
  correlationId: string;
  
  constructor(
    handled: boolean,
    error: ApiError,
    correlationId: string,
    response?: Response,
    redirect?: string,
    action?: ErrorAction
  ) {
    this.handled = handled;
    this.error = error;
    this.correlationId = correlationId;
    this.response = response;
    this.redirect = redirect;
    this.action = action;
  }
}