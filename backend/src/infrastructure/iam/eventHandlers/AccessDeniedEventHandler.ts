import { DomainEvent, EventType } from '@/types/iam/interfaces';
import { IEventHandler } from '../bus/IAMEventBus';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/factory/LoggerFactory';

export class AccessDeniedEventHandler implements IEventHandler<DomainEvent> {
  private readonly logger = LoggerFactory.getContextualLogger('AccessDeniedEventHandler');

  async handle(event: DomainEvent): Promise<void> {
    if (event.type !== EventType.ACCESS_DENIED) {
      return;
    }

    const contextLogger = this.logger.withData({
      eventId: event.id.toString(),
      identityId: event.aggregateId.toString()
    });

    try {
      contextLogger.info('Handling AccessDenied event', {
        resource: event.eventData.resource,
        action: event.eventData.action
      });

      // 1. Log security event
      await this.logSecurityEvent(event);

      // 2. Check for brute force attempts
      await this.checkBruteForceAttempts(event);

      // 3. Update risk assessment
      await this.updateRiskAssessment(event);

      contextLogger.info('AccessDenied event handled successfully');

    } catch (error) {
      contextLogger.error('Failed to handle AccessDenied event', error as Error);
      throw error;
    }
  }

  private async logSecurityEvent(event: DomainEvent): Promise<void> {
    this.logger.warn('Access denied', {
      identityId: event.aggregateId.toString(),
      resource: event.eventData.resource,
      action: event.eventData.action,
      timestamp: event.timestamp
    });
  }

  private async checkBruteForceAttempts(event: DomainEvent): Promise<void> {
    // In a real implementation, this would:
    // - Count recent failed attempts
    // - Implement exponential backoff
    // - Temporarily lock account if threshold exceeded
    
    this.logger.debug('Checking for brute force attempts', {
      identityId: event.aggregateId.toString()
    });
  }

  private async updateRiskAssessment(event: DomainEvent): Promise<void> {
    // Increase risk score for repeated access denials
    this.logger.debug('Updating risk assessment after access denial', {
      identityId: event.aggregateId.toString()
    });
  }
}