import { BaseError } from '../base/BaseError.js';
import { Severity } from '../../../types/core/enums.js';

/**
 * Error for authentication failures
 */
export class AuthenticationError extends BaseError {
  public readonly userId: string;
  public readonly attemptedAction: string;

  constructor(
    userId: string,
    attemptedAction: string,
    message: string,
    context?: string,
    traceId?: string
  ) {
    super(message, 'AUTHENTICATION_ERROR', Severity.ERROR, context, traceId, userId);
    this.userId = userId;
    this.attemptedAction = attemptedAction;
  }

  /**
   * Get security level based on attempted action
   */
  getSecurityLevel(): Severity {
    // Determine if this is a high-risk authentication failure
    const highRiskActions = ['admin', 'delete', 'export', 'share'];
    const isHighRisk = highRiskActions.some(action => 
      this.attemptedAction.toLowerCase().includes(action)
    );
    
    return isHighRisk ? Severity.CRITICAL : Severity.ERROR;
  }

  /**
   * Check if multiple failed attempts should trigger lockout
   */
  shouldTriggerLockout(attemptCount: number): boolean {
    return attemptCount >= 5;
  }

  /**
   * Override toJSON to include authentication-specific fields
   */
  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      userId: this.userId,
      attemptedAction: this.attemptedAction,
      securityLevel: this.getSecurityLevel()
    };
  }
}

