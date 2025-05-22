// src/core/events/handlers/NotificationEventHandler.ts
import { LoggerFacade } from "@/core/logging";
import { EventHandler, NotificationService, NotificationMapping, NotificationData, EventType } from "@/types/events";
import { DomainEvent } from "../models/DomainEvent";
import { Event } from "../models/Event";

/**
 * Handles creating and sending notifications based on system events
 */
export class NotificationEventHandler implements EventHandler {
  private readonly notificationService: NotificationService;
  /** TODO: Assign type upon implementation */
  private readonly userService: any;
  private readonly logger: LoggerFacade;
  private readonly mappings: NotificationMapping[] = [];
  private readonly pendingNotifications: NotificationData[] = [];
  private batchTimer: NodeJS.Timeout | null = null;

  /**
   * Create a new NotificationEventHandler
   * 
   * @param notificationService Notification service instance
   * @param userService User service instance
   * @param logger Logger instance
   */
  constructor(
    notificationService: NotificationService,
    userService: any,
    logger: LoggerFacade
  ) {
    this.notificationService = notificationService;
    this.userService = userService;
    this.logger = logger.withComponent('NotificationEventHandler');
    
    // Register default notification mappings
    this.registerDefaultMappings();
    
    // Start batch processing
    this.startBatchProcessing();
  }

  /**
   * Handle an event by creating and sending notifications
   * 
   * @param event The event to handle
   */
  public async handleEvent(event: Event): Promise<void> {
    try {
      // Find all mappings that match this event
      const matchingMappings = this.getMatchingMappings(event);
      
      if (matchingMappings.length === 0) {
        return; // No mappings match, nothing to do
      }
      
      this.logger.debug(`Processing notifications for event: ${event.type}`, {
        eventId: event.id,
        eventType: event.type,
        mappingCount: matchingMappings.length
      });
      
      // Determine recipients for this event
      const recipients = await this.determineRecipients(event);
      
      if (recipients.length === 0) {
        this.logger.debug(`No recipients for notifications from event: ${event.type}`);
        return;
      }
      
      // Create notifications for each mapping and recipient
      for (const mapping of matchingMappings) {
        for (const userId of recipients) {
          // Check if this specific user should receive this notification
          if (await this.shouldSendNotification(event, userId, mapping)) {
            const notification = await this.createNotification(event, userId, mapping);
            this.addToBatch(notification);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error handling notifications for event: ${event.type}`, error as Error, {
        eventId: event.id,
        eventType: event.type
      });
      
      // Don't rethrow - notification handling shouldn't block other event handlers
    }
  }

  /**
   * Register a notification mapping
   * 
   * @param mapping The mapping to register
   */
  public registerMapping(mapping: NotificationMapping): void {
    this.mappings.push(mapping);
    
    this.logger.debug(`Registered notification mapping for event type: ${mapping.eventType}`, {
      types: mapping.notificationTypes,
      forRole: mapping.forRole
    });
  }

  /**
   * Get all mappings that match a given event
   * 
   * @param event The event to match mappings against
   * @returns Array of matching notification mappings
   */
  private getMatchingMappings(event: Event): NotificationMapping[] {
    return this.mappings.filter(mapping => {
      // Check if the event type matches the mapping's event type
      const eventTypeMatches = this.matchesEventType(event.type, mapping.eventType);
      
      if (!eventTypeMatches) return false;
      
      // If there's a condition function, check if it passes
      if (mapping.condition && !mapping.condition(event)) return false;
      
      return true;
    });
  }

  /**
   * Check if an event type matches a specific string pattern
   * 
   * @param eventType The event type to check
   * @param pattern The string pattern to match against
   * @returns True if the event type matches the pattern
   */
  private matchesEventType(eventType: EventType, pattern: string): boolean {
    // Exact match
    if (eventType === pattern as EventType) {
      return true;
    }
    
    // Wildcard match (e.g., "user.*")
    if (pattern.endsWith('.*') && 
        typeof eventType === 'string' && 
        eventType.startsWith(pattern.slice(0, -1))) {
      return true;
    }
    
    return false;
  }

  /**
   * Determine which users should receive notifications for an event
   * 
   * @param event The event that triggered notifications
   * @returns Array of user IDs who should receive notifications
   */
  private async determineRecipients(event: Event): Promise<string[]> {
    const recipients = new Set<string>();
    
    await Promise.all([
        this.addDomainEventRecipients(event, recipients),
        this.addUserEventRecipients(event, recipients),
        this.addOrganizationEventRecipients(event, recipients),
        this.addInvitationEventRecipients(event, recipients),
        this.addTrainerClientEventRecipients(event, recipients)
    ]);
    
    return Array.from(recipients);
}

private async addDomainEventRecipients(event: Event, recipients: Set<string>): Promise<void> {
    if (!(event instanceof DomainEvent) || !event.userId) return;
    recipients.add(event.userId);
}

private async addUserEventRecipients(event: Event, recipients: Set<string>): Promise<void> {
    if (!(event instanceof DomainEvent) || !event.type.startsWith('user.')) return;
    recipients.add(event.entityId);
}

private async addOrganizationEventRecipients(event: Event, recipients: Set<string>): Promise<void> {
    if (!(event instanceof DomainEvent) || !event.type.startsWith('organization.')) return;
    
    const orgId = event.entityId;
    try {
        const admins = await this.userService.getOrganizationAdmins(orgId);
        admins.forEach((admin: { id: string; }) => recipients.add(admin.id));
    } catch (error) {
        this.logger.warn(`Could not fetch organization admins for notifications`, {
            organizationId: orgId,
            error: (error as Error).message
        });
    }
}

private async addInvitationEventRecipients(event: Event, recipients: Set<string>): Promise<void> {
    if (!this.matchesEventType(event.type, 'organization.invitation.sent') || !event.payload?.email) return;
    
    try {
        const user = await this.userService.getUserByEmail(event.payload.email);
        if (user) recipients.add(user.id);
    } catch (error) {
        this.logger.debug(`Failed to find user for invitation notification email: ${event.payload.email}`, {
            error: error instanceof Error ? error.message : String(error),
            eventType: event.type
        });
    }
}

private async addTrainerClientEventRecipients(event: Event, recipients: Set<string>): Promise<void> {
    if (!event.type.startsWith('trainer.') && !event.type.startsWith('client.')) return;
    
    if (event.payload?.trainerId) recipients.add(event.payload.trainerId);
    if (event.payload?.clientId) recipients.add(event.payload.clientId);
}

  /**
   * Determine if a notification should be sent to a specific user
   * 
   * @param event The triggering event
   * @param userId The user who would receive the notification
   * @param mapping The notification mapping
   * @returns True if notification should be sent
   */
  private async shouldSendNotification(
    event: Event,
    userId: string,
    mapping: NotificationMapping
  ): Promise<boolean> {
    // If mapping has a specific role, check if user has that role
    if (mapping.forRole) {
      try {
        const hasRole = await this.userService.userHasRole(userId, mapping.forRole);
        if (!hasRole) return false;
      } catch (error) {
        this.logger.warn(`Could not check user role for notification`, {
          userId,
          role: mapping.forRole,
          error: (error as Error).message
        });
        return false;
      }
    }
    
    // Check if user has notifications enabled for this category
    try {
      const preferences = await this.userService.getNotificationPreferences(userId);
      
      // If specific category is disabled, don't send
      if (mapping.category && preferences?.categories?.[mapping.category] === false) {
        return false;
      }
      
      // Check if any notification types are enabled
      for (const type of mapping.notificationTypes) {
        if (preferences?.channels?.[type] !== false) {
          return true;
        }
      }
      
      // No enabled notification types
      return false;
    } catch (error) {
      this.logger.warn(`Could not check notification preferences`, {
        userId,
        error: (error as Error).message
      });
      
      // Default to sending if we can't check preferences
      return true;
    }
  }

  /**
   * Create a notification from an event
   * 
   * @param event The triggering event
   * @param userId The user who will receive the notification
   * @param mapping The notification mapping to use
   * @returns The created notification data
   */
  private async createNotification(
    event: Event,
    userId: string,
    mapping: NotificationMapping
  ): Promise<NotificationData> {
    // Create the base notification
    const notification: NotificationData = {
      userId,
      type: mapping.notificationTypes[0], // Use first type as primary
      title: this.formatTemplate(mapping.titleTemplate, event),
      message: this.formatTemplate(mapping.messageTemplate, event),
      scheduledFor: new Date(),
      priority: mapping.priority,
      category: mapping.category
    };
    
    // Add additional data from event
    notification.data = {
      eventType: event.type,
      eventId: event.id,
      timestamp: event.timestamp.toISOString()
    };
    
    // Add action if specified
    if (mapping.actionTemplate) {
      notification.action = {
        url: this.formatTemplate(mapping.actionTemplate, event)
      };
    }
    
    // Add entity reference for domain events
    if (event instanceof DomainEvent) {
      notification.data = {
        ...notification.data,
        entityType: event.entityType,
        entityId: event.entityId
      };
    }
    
    return notification;
  }

  /**
   * Format a template string using event data
   * 
   * @param template The template string with placeholders
   * @param event The event containing data to fill placeholders
   * @returns The formatted string
   */
  private formatTemplate(template: string, event: Event): string {
    // Replace variables in format {variable}
    return template.replace(/\{([^}]+)\}/g, (match, variable) => {
      // Handle special variables
      if (variable === 'eventType') return event.type;
      if (variable === 'timestamp') return event.timestamp.toISOString();
      
      // Extract from domain event properties
      if (event instanceof DomainEvent) {
        if (variable === 'entityId') return event.entityId;
        if (variable === 'entityType') return event.entityType;
        if (variable === 'action') return event.action;
        if (variable === 'userId') return event.userId ?? '';
      }
      
      // Extract from event payload
      return this.getNestedProperty(event.payload, variable) ?? match;
    });
  }

  /**
   * Get a nested property from an object using dot notation
   * 
   * @param obj The object to extract from
   * @param path The property path in dot notation
   * @returns The property value or undefined if not found
   */
  private getNestedProperty(obj: any, path: string): any {
    if (!obj || typeof obj !== 'object') return undefined;
    
    const parts = path.split('.');
    let value = obj;
    
    for (const part of parts) {
      if (value === undefined || value === null) return undefined;
      value = value[part];
    }
    
    return value !== undefined ? String(value) : undefined;
  }

  /**
   * Add a notification to the pending batch
   * 
   * @param notification The notification to add
   */
  private addToBatch(notification: NotificationData): void {
    this.pendingNotifications.push(notification);
    
    // Process immediately if batch is large enough
    if (this.pendingNotifications.length >= 50) {
      this.processBatch();
    }
  }

  /**
   * Start batch processing timer
   */
  private startBatchProcessing(): void {
    // Process pending notifications every 3 seconds
    this.batchTimer = setInterval(() => {
      this.processBatch();
    }, 3000);
  }

  /**
   * Process pending notifications
   */
  private async processBatch(): Promise<void> {
    if (this.pendingNotifications.length === 0) {
      return;
    }
    
    const notifications = [...this.pendingNotifications];
    this.pendingNotifications.length = 0;
    
    try {
      await this.notificationService.sendBatchNotifications(notifications);
      
      this.logger.debug(`Processed ${notifications.length} notifications`);
    } catch (error) {
      this.logger.error(`Failed to process notifications`, error as Error, {
        notificationCount: notifications.length
      });
      
      // Put notifications back in queue
      this.pendingNotifications.push(...notifications);
    }
  }

  /**
   * Register default notification mappings
   */
  private registerDefaultMappings(): void {
    // User account notifications
    this.registerMapping({
      eventType: 'user.created',
      notificationTypes: ['email'],
      titleTemplate: 'Welcome to the platform!',
      messageTemplate: 'Your account has been created successfully. We\'re excited to have you on board!',
      priority: 'high',
      category: 'account'
    });
    
    this.registerMapping({
      eventType: 'auth.password.reset',
      notificationTypes: ['email'],
      titleTemplate: 'Password Reset Successful',
      messageTemplate: 'Your password has been reset successfully. If you did not request this change, please contact support immediately.',
      priority: 'high',
      category: 'account'
    });
    
    // Organization notifications
    this.registerMapping({
      eventType: 'organization.invitation.sent',
      notificationTypes: ['email', 'in-app'],
      titleTemplate: 'You\'ve been invited to join {organization.name}',
      messageTemplate: '{invitedBy.name} has invited you to join {organization.name} as a {role}.',
      priority: 'normal',
      category: 'organization',
      actionTemplate: '/invitations/{invitation.id}'
    });
    
    this.registerMapping({
      eventType: 'organization.member.added',
      notificationTypes: ['in-app'],
      forRole: 'admin',
      titleTemplate: 'New Member Added',
      messageTemplate: '{user.name} has joined {organization.name} as a {role}.',
      priority: 'low',
      category: 'organization',
      actionTemplate: '/organization/members'
    });
    
    // Training notifications
    this.registerMapping({
      eventType: 'workout.completed',
      notificationTypes: ['in-app', 'push'],
      titleTemplate: 'Workout Completed!',
      messageTemplate: 'You\'ve completed {workout.name}. Great job!',
      priority: 'normal',
      category: 'activity',
      actionTemplate: '/workouts/history/{workout.id}'
    });
    
    this.registerMapping({
      eventType: 'goal.achieved',
      notificationTypes: ['in-app', 'push', 'email'],
      titleTemplate: 'Goal Achieved!',
      messageTemplate: 'Congratulations! You\'ve achieved your goal: {goal.name}',
      priority: 'high',
      category: 'goals',
      actionTemplate: '/goals/{goal.id}'
    });
    
    // Trainer-client notifications
    this.registerMapping({
      eventType: 'trainer.feedback.created',
      notificationTypes: ['in-app', 'push', 'email'],
      titleTemplate: 'New Feedback from Your Trainer',
      messageTemplate: 'Your trainer has provided feedback on your recent workout.',
      priority: 'normal',
      category: 'training',
      actionTemplate: '/feedback/{feedback.id}'
    });
    
    this.registerMapping({
      eventType: 'trainer.program.assigned',
      notificationTypes: ['in-app', 'email'],
      titleTemplate: 'New Training Program Assigned',
      messageTemplate: 'Your trainer has assigned you a new training program: {program.name}',
      priority: 'high',
      category: 'training',
      actionTemplate: '/programs/{program.id}'
    });
  }

  /**
   * Stop batch processing and clean up
   */
  public dispose(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    
    // Process any remaining notifications
    this.processBatch().catch(error => {
      this.logger.error(`Error processing final notification batch`, error as Error);
    });
  }
}