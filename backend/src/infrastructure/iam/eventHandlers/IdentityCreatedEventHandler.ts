import { DomainEvent, EventType } from '@/types/iam/interfaces';
import { IEventHandler } from '../bus/IAMEventBus';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/factory/LoggerFactory';

export class IdentityCreatedEventHandler implements IEventHandler<DomainEvent> {
  private readonly logger = LoggerFactory.getContextualLogger('IdentityCreatedEventHandler');

  async handle(event: DomainEvent): Promise<void> {
    if (event.type !== EventType.IDENTITY_CREATED) {
      return;
    }

    const contextLogger = this.logger.withData({
      eventId: event.id.toString(),
      aggregateId: event.aggregateId.toString()
    });

    try {
      contextLogger.info('Handling IdentityCreated event', {
        username: event.eventData.username,
        email: event.eventData.email
      });

      // Example integrations:
      // 1. Send welcome email
      await this.sendWelcomeEmail(event);

      // 2. Create default permissions
      await this.createDefaultPermissions(event);

      // 3. Initialize user analytics
      await this.initializeAnalytics(event);

      contextLogger.info('IdentityCreated event handled successfully');

    } catch (error) {
      contextLogger.error('Failed to handle IdentityCreated event', error as Error);
      throw error;
    }
  }

  private async sendWelcomeEmail(event: DomainEvent): Promise<void> {
    // Integration with notification service
    this.logger.debug('Sending welcome email', {
      email: event.eventData.email
    });
    
    // In a real implementation, this would publish to a notification service
    // await this.notificationService.sendWelcomeEmail(event.eventData.email);
  }

  private async createDefaultPermissions(event: DomainEvent): Promise<void> {
    // Create default user permissions
    this.logger.debug('Creating default permissions', {
      identityId: event.aggregateId.toString()
    });
    
    // In a real implementation, this would assign basic user permissions
    // await this.accessService.assignDefaultRole(event.aggregateId);
  }

  private async initializeAnalytics(event: DomainEvent): Promise<void> {
    // Initialize user analytics/tracking
    this.logger.debug('Initializing analytics', {
      identityId: event.aggregateId.toString()
    });
    
    // In a real implementation, this would set up user analytics
    // await this.analyticsService.initializeUser(event.aggregateId);
  }
}

