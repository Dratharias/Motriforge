import { DomainEvent, EventType, RiskLevel } from '@/types/iam/interfaces';
import { IEventHandler } from '../bus/IAMEventBus';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/factory/LoggerFactory';

export class SessionCreatedEventHandler implements IEventHandler<DomainEvent> {
  private readonly logger = LoggerFactory.getContextualLogger('SessionCreatedEventHandler');

  async handle(event: DomainEvent): Promise<void> {
    if (event.type !== EventType.SESSION_CREATED) {
      return;
    }

    const contextLogger = this.logger.withData({
      eventId: event.id.toString(),
      sessionId: event.eventData.sessionId,
      identityId: event.aggregateId.toString()
    });

    try {
      contextLogger.info('Handling SessionCreated event', {
        ipAddress: event.eventData.ipAddress,
        authMethod: event.eventData.authMethod
      });

      // 1. Check for suspicious activity
      await this.checkSuspiciousActivity(event);

      // 2. Update login analytics
      await this.updateLoginAnalytics(event);

      // 3. Notify about new device (if applicable)
      await this.checkNewDeviceNotification(event);

      contextLogger.info('SessionCreated event handled successfully');

    } catch (error) {
      contextLogger.error('Failed to handle SessionCreated event', error as Error);
      throw error;
    }
  }

  private async checkSuspiciousActivity(event: DomainEvent): Promise<void> {
    const riskLevel = event.eventData.riskLevel as RiskLevel;
    
    if (riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.CRITICAL) {
      this.logger.warn('High risk session detected', {
        sessionId: event.eventData.sessionId,
        riskLevel,
        ipAddress: event.eventData.ipAddress
      });

      // In a real implementation, this might:
      // - Send security alert
      // - Require additional verification
      // - Temporarily lock the account
    }
  }

  private async updateLoginAnalytics(event: DomainEvent): Promise<void> {
    this.logger.debug('Updating login analytics', {
      identityId: event.aggregateId.toString(),
      ipAddress: event.eventData.ipAddress
    });

    // In a real implementation, this would update analytics
    // - Track login patterns
    // - Update location data
    // - Record device information
  }

  private async checkNewDeviceNotification(event: DomainEvent): Promise<void> {
    // Check if this is a new device and send notification
    this.logger.debug('Checking for new device notification');

    // In a real implementation, this would:
    // - Check if device is recognized
    // - Send new device notification email/SMS
    // - Offer to trust/remember the device
  }
}

