import { BaseError } from '../base/BaseError';
import { Severity, ResourceType, Action } from '../../../types/core/enums';

/**
 * Error for authorization failures
 */
export class AuthorizationError extends BaseError {
  public readonly userId: string;
  public readonly resource: ResourceType | string;
  public readonly action: Action | string;

  constructor(
    userId: string,
    resource: ResourceType | string,
    action: Action | string,
    message: string,
    context?: string,
    traceId?: string
  ) {
    super(message, 'AUTHORIZATION_ERROR', Severity.WARN, context, traceId, userId);
    this.userId = userId;
    this.resource = resource;
    this.action = action;
  }

  /**
   * Get the reason for authorization failure
   */
  getReason(): string {
    return `User ${this.userId} lacks permission to ${this.action} on ${this.resource}`;
  }

  /**
   * Check if this is a privilege escalation attempt
   */
  isPrivilegeEscalation(): boolean {
    const adminActions = ['DELETE', 'ADMIN', 'MANAGE'];
    return adminActions.some(adminAction =>
      this.action.toString().toUpperCase().includes(adminAction)
    );
  }

  /**
   * Override toJSON to include authorization-specific fields
   */
  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      userId: this.userId,
      resource: this.resource,
      action: this.action,
      reason: this.getReason(),
      isPrivilegeEscalation: this.isPrivilegeEscalation()
    };
  }
}

