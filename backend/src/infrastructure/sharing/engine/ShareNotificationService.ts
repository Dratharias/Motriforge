import { Types } from 'mongoose';
import { IUser } from '../../../types/core/interfaces';
import { SharedResource } from '../entities/SharedResource';
import { IShareNotification } from '../entities/interfaces';

export interface INotificationTemplate {
  readonly type: 'SHARED' | 'REVOKED' | 'EXPIRED' | 'REMINDER';
  readonly subject: string;
  readonly body: string;
  readonly priority: 'LOW' | 'NORMAL' | 'HIGH';
}

export interface INotificationContext {
  readonly sharedResource: SharedResource;
  readonly recipient: IUser;
  readonly sharer?: IUser;
  readonly additionalData?: Record<string, unknown>;
}

export class ShareNotificationService {
  private readonly templates = new Map<string, INotificationTemplate>();

  constructor() {
    this.initializeTemplates();
  }

  async notifyResourceShared(sharedResource: SharedResource, recipients: readonly IUser[], sharer: IUser): Promise<readonly IShareNotification[]> {
    const notifications: IShareNotification[] = [];

    for (const recipient of recipients) {
      const notification = await this.createNotification({
        shareId: sharedResource.id,
        recipientId: recipient.id,
        type: 'SHARED',
        context: {
          sharedResource,
          recipient,
          sharer
        }
      });

      notifications.push(notification);
    }

    return notifications;
  }

  async notifyResourceRevoked(sharedResource: SharedResource, recipients: readonly IUser[], revoker: IUser): Promise<readonly IShareNotification[]> {
    const notifications: IShareNotification[] = [];

    for (const recipient of recipients) {
      const notification = await this.createNotification({
        shareId: sharedResource.id,
        recipientId: recipient.id,
        type: 'REVOKED',
        context: {
          sharedResource,
          recipient,
          sharer: revoker
        }
      });

      notifications.push(notification);
    }

    return notifications;
  }

  async notifyResourceExpired(sharedResource: SharedResource, recipients: readonly IUser[]): Promise<readonly IShareNotification[]> {
    const notifications: IShareNotification[] = [];

    for (const recipient of recipients) {
      const notification = await this.createNotification({
        shareId: sharedResource.id,
        recipientId: recipient.id,
        type: 'EXPIRED',
        context: {
          sharedResource,
          recipient
        }
      });

      notifications.push(notification);
    }

    return notifications;
  }

  async sendExpirationReminder(sharedResource: SharedResource, recipients: readonly IUser[]): Promise<readonly IShareNotification[]> {
    if (!sharedResource.endDate || sharedResource.getDaysRemaining() > 7) {
      return [];
    }

    const notifications: IShareNotification[] = [];

    for (const recipient of recipients) {
      const notification = await this.createNotification({
        shareId: sharedResource.id,
        recipientId: recipient.id,
        type: 'REMINDER',
        context: {
          sharedResource,
          recipient,
          additionalData: {
            daysRemaining: sharedResource.getDaysRemaining()
          }
        }
      });

      notifications.push(notification);
    }

    return notifications;
  }

  private async createNotification(params: {
    shareId: Types.ObjectId;
    recipientId: Types.ObjectId;
    type: 'SHARED' | 'REVOKED' | 'EXPIRED' | 'REMINDER';
    context: INotificationContext;
  }): Promise<IShareNotification> {
    const notification: IShareNotification = {
      id: new Types.ObjectId(),
      shareId: params.shareId,
      recipientId: params.recipientId,
      type: params.type,
      sent: false,
      createdAt: new Date()
    };

    // In a real implementation, this would send the actual notification
    await this.sendNotification(notification, params.context);

    return {
      ...notification,
      sent: true,
      sentAt: new Date()
    };
  }

  private async sendNotification(notification: IShareNotification, context: INotificationContext): Promise<void> {
    const template = this.templates.get(notification.type);
    if (!template) {
      throw new Error(`No template found for notification type: ${notification.type}`);
    }

    const content = this.populateTemplate(template, context);
    
    // Mock notification sending - in real implementation, integrate with email/push service
    console.log(`Sending ${notification.type} notification to ${context.recipient.email}:`, content);
  }

  private populateTemplate(template: INotificationTemplate, context: INotificationContext): { subject: string; body: string } {
    const sharerName = context.sharer?.email ?? 'Unknown User';
    const resourceType = context.sharedResource.resourceType;
    const daysRemaining = context.additionalData?.daysRemaining as number;

    let subject = template.subject
      .replace('{{sharerName}}', sharerName)
      .replace('{{resourceType}}', resourceType);

    let body = template.body
      .replace('{{sharerName}}', sharerName)
      .replace('{{resourceType}}', resourceType)
      .replace('{{recipientName}}', context.recipient.email);

    if (daysRemaining !== undefined) {
      subject = subject.replace('{{daysRemaining}}', daysRemaining.toString());
      body = body.replace('{{daysRemaining}}', daysRemaining.toString());
    }

    return { subject, body };
  }

  private initializeTemplates(): void {
    this.templates.set('SHARED', {
      type: 'SHARED',
      subject: '{{sharerName}} shared a {{resourceType}} with you',
      body: 'Hello {{recipientName}},\n\n{{sharerName}} has shared a {{resourceType}} with you. You can now access it from your dashboard.\n\nBest regards,\nFitness App Team',
      priority: 'NORMAL'
    });

    this.templates.set('REVOKED', {
      type: 'REVOKED',
      subject: 'Access to {{resourceType}} has been revoked',
      body: 'Hello {{recipientName}},\n\nYour access to a {{resourceType}} has been revoked by {{sharerName}}.\n\nBest regards,\nFitness App Team',
      priority: 'NORMAL'
    });

    this.templates.set('EXPIRED', {
      type: 'EXPIRED',
      subject: 'Your access to {{resourceType}} has expired',
      body: 'Hello {{recipientName}},\n\nYour access to a {{resourceType}} has expired. Please contact the owner if you need continued access.\n\nBest regards,\nFitness App Team',
      priority: 'LOW'
    });

    this.templates.set('REMINDER', {
      type: 'REMINDER',
      subject: 'Your access to {{resourceType}} expires in {{daysRemaining}} days',
      body: 'Hello {{recipientName}},\n\nYour access to a {{resourceType}} will expire in {{daysRemaining}} days. Please contact the owner if you need an extension.\n\nBest regards,\nFitness App Team',
      priority: 'LOW'
    });
  }
}

