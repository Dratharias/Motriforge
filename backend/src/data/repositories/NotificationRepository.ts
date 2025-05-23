import { Model, Types } from 'mongoose';
import { LoggerFacade } from '@/core/logging';
import { EventMediator } from '@/core/events/EventMediator';
import { CacheFacade } from '@/core/cache/facade/CacheFacade';
import { BaseRepository } from './BaseRepository';
import { ValidationHelpers } from './helpers';
import { 
  ValidationResult, 
  RepositoryContext,
  INotification,
  INotificationRepository,
  DeliveryStatus,
  NotificationChannel,
  NotificationPriority, 
} from '@/types/repositories';

/**
 * Repository for notification operations with enhanced validation and caching
 */
export class NotificationRepository extends BaseRepository<INotification> implements INotificationRepository {
  private static readonly CACHE_TTL = 300; // 5 minutes
  private static readonly USER_NOTIFICATIONS_TTL = 180; // 3 minutes
  private static readonly UNREAD_COUNT_TTL = 60; // 1 minute
  private static readonly SCHEDULED_CACHE_TTL = 120; // 2 minutes

  constructor(
    notificationModel: Model<INotification>,
    logger: LoggerFacade,
    eventMediator: EventMediator,
    cache?: CacheFacade
  ) {
    super(notificationModel, logger, eventMediator, cache, 'NotificationRepository');
  }

  /**
   * Find notifications by user
   */
  public async findByUser(userId: string | Types.ObjectId): Promise<INotification[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('user', { 
      userId: userId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<INotification[]>(cacheKey);
    if (cached) {
      return cached.map(notification => this.mapToEntity(notification));
    }

    try {
      this.logger.debug('Finding notifications by user', { 
        userId: userId.toString() 
      });
      
      const notifications = await this.crudOps.find({
        user: userId
      }, {
        sort: [{ field: 'createdAt', direction: 'desc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(
          cacheKey, 
          notifications, 
          NotificationRepository.USER_NOTIFICATIONS_TTL
        );
      }

      return notifications.map(notification => this.mapToEntity(notification));
    } catch (error) {
      this.logger.error('Error finding notifications by user', error as Error, { 
        userId: userId.toString() 
      });
      throw error;
    }
  }

  /**
   * Find unread notifications by user
   */
  public async findUnreadByUser(userId: string | Types.ObjectId): Promise<INotification[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('unread_user', { 
      userId: userId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<INotification[]>(cacheKey);
    if (cached) {
      return cached.map(notification => this.mapToEntity(notification));
    }

    try {
      this.logger.debug('Finding unread notifications by user', { 
        userId: userId.toString() 
      });
      
      const notifications = await this.crudOps.find({
        user: userId,
        isRead: false
      }, {
        sort: [{ field: 'createdAt', direction: 'desc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(
          cacheKey, 
          notifications, 
          NotificationRepository.UNREAD_COUNT_TTL
        );
      }

      return notifications.map(notification => this.mapToEntity(notification));
    } catch (error) {
      this.logger.error('Error finding unread notifications by user', error as Error, { 
        userId: userId.toString() 
      });
      throw error;
    }
  }

  /**
   * Find notifications by type
   */
  public async findByType(type: string): Promise<INotification[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('type', { type });
    
    const cached = await this.cacheHelpers.getCustom<INotification[]>(cacheKey);
    if (cached) {
      return cached.map(notification => this.mapToEntity(notification));
    }

    try {
      this.logger.debug('Finding notifications by type', { type });
      
      const notifications = await this.crudOps.find({
        type: type
      }, {
        sort: [{ field: 'createdAt', direction: 'desc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, notifications, NotificationRepository.CACHE_TTL);
      }

      return notifications.map(notification => this.mapToEntity(notification));
    } catch (error) {
      this.logger.error('Error finding notifications by type', error as Error, { type });
      throw error;
    }
  }

  /**
   * Find notifications by category
   */
  public async findByCategory(category: string): Promise<INotification[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('category', { category });
    
    const cached = await this.cacheHelpers.getCustom<INotification[]>(cacheKey);
    if (cached) {
      return cached.map(notification => this.mapToEntity(notification));
    }

    try {
      this.logger.debug('Finding notifications by category', { category });
      
      const notifications = await this.crudOps.find({
        category: category
      }, {
        sort: [{ field: 'createdAt', direction: 'desc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, notifications, NotificationRepository.CACHE_TTL);
      }

      return notifications.map(notification => this.mapToEntity(notification));
    } catch (error) {
      this.logger.error('Error finding notifications by category', error as Error, { category });
      throw error;
    }
  }

  /**
   * Find notifications by priority
   */
  public async findByPriority(priority: string): Promise<INotification[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('priority', { priority });
    
    const cached = await this.cacheHelpers.getCustom<INotification[]>(cacheKey);
    if (cached) {
      return cached.map(notification => this.mapToEntity(notification));
    }

    try {
      this.logger.debug('Finding notifications by priority', { priority });
      
      const notifications = await this.crudOps.find({
        priority: priority
      }, {
        sort: [{ field: 'createdAt', direction: 'desc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, notifications, NotificationRepository.CACHE_TTL);
      }

      return notifications.map(notification => this.mapToEntity(notification));
    } catch (error) {
      this.logger.error('Error finding notifications by priority', error as Error, { priority });
      throw error;
    }
  }

  /**
   * Find scheduled notifications
   */
  public async findScheduledNotifications(before?: Date): Promise<INotification[]> {
    const beforeDate = before ?? new Date();
    const cacheKey = this.cacheHelpers.generateCustomKey('scheduled', { 
      before: beforeDate.toISOString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<INotification[]>(cacheKey);
    if (cached) {
      return cached.map(notification => this.mapToEntity(notification));
    }

    try {
      this.logger.debug('Finding scheduled notifications', { before: beforeDate });
      
      const notifications = await this.crudOps.find({
        scheduledFor: { $lte: beforeDate },
        deliveryStatus: 'pending'
      }, {
        sort: [{ field: 'scheduledFor', direction: 'asc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(
          cacheKey, 
          notifications, 
          NotificationRepository.SCHEDULED_CACHE_TTL
        );
      }

      return notifications.map(notification => this.mapToEntity(notification));
    } catch (error) {
      this.logger.error('Error finding scheduled notifications', error as Error, { before: beforeDate });
      throw error;
    }
  }

  /**
   * Find expired notifications
   */
  public async findExpiredNotifications(): Promise<INotification[]> {
    const now = new Date();
    
    try {
      this.logger.debug('Finding expired notifications');
      
      const notifications = await this.crudOps.find({
        expiresAt: { $lt: now }
      });

      return notifications.map(notification => this.mapToEntity(notification));
    } catch (error) {
      this.logger.error('Error finding expired notifications', error as Error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  public async markAsRead(
    id: string | Types.ObjectId, 
    userId: string | Types.ObjectId
  ): Promise<INotification | null> {
    try {
      this.logger.debug('Marking notification as read', { 
        id: id.toString(), 
        userId: userId.toString() 
      });

      const notification = await this.crudOps.update(id, {
        isRead: true,
        readAt: new Date()
      });

      if (notification && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateAfterUpdate(id, notification);
        // Invalidate user-specific caches
        await this.cacheHelpers.invalidateByPattern(`user:${userId.toString()}*`);
        await this.cacheHelpers.invalidateByPattern(`unread_user:${userId.toString()}*`);
      }

      if (notification) {
        await this.publishEvent('notification.read', {
          notificationId: id.toString(),
          userId: userId.toString(),
          timestamp: new Date()
        });
      }

      return notification ? this.mapToEntity(notification) : null;
    } catch (error) {
      this.logger.error('Error marking notification as read', error as Error, { 
        id: id.toString(), 
        userId: userId.toString() 
      });
      throw error;
    }
  }

  /**
   * Mark all notifications as read for user
   */
  public async markAllAsRead(userId: string | Types.ObjectId): Promise<number> {
    try {
      this.logger.debug('Marking all notifications as read for user', { 
        userId: userId.toString() 
      });

      const result = await this.crudOps.updateMany({
        user: userId,
        isRead: false
      }, {
        isRead: true,
        readAt: new Date()
      });

      if (result.modifiedCount > 0 && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateByPattern(`user:${userId.toString()}*`);
        await this.cacheHelpers.invalidateByPattern(`unread_user:${userId.toString()}*`);
      }

      if (result.modifiedCount > 0) {
        await this.publishEvent('notification.all_read', {
          userId: userId.toString(),
          count: result.modifiedCount,
          timestamp: new Date()
        });
      }

      return result.modifiedCount;
    } catch (error) {
      this.logger.error('Error marking all notifications as read', error as Error, { 
        userId: userId.toString() 
      });
      throw error;
    }
  }

  /**
   * Delete expired notifications
   */
  public async deleteExpiredNotifications(): Promise<number> {
    const now = new Date();

    try {
      this.logger.debug('Deleting expired notifications');

      const result = await this.crudOps.deleteMany({
        expiresAt: { $lt: now }
      });

      if (result.deletedCount > 0) {
        if (this.cacheHelpers.isEnabled) {
          await this.cacheHelpers.invalidateByPattern('*');
        }

        await this.publishEvent('notification.expired_cleanup', {
          deletedCount: result.deletedCount,
          timestamp: new Date()
        });
      }

      return result.deletedCount;
    } catch (error) {
      this.logger.error('Error deleting expired notifications', error as Error);
      throw error;
    }
  }

  /**
   * Count unread notifications by user
   */
  public async countUnreadByUser(userId: string | Types.ObjectId): Promise<number> {
    const cacheKey = this.cacheHelpers.generateCustomKey('unread_count', { 
      userId: userId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<number>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {
      const count = await this.crudOps.count({
        user: userId,
        isRead: false
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(
          cacheKey, 
          count, 
          NotificationRepository.UNREAD_COUNT_TTL
        );
      }

      return count;
    } catch (error) {
      this.logger.error('Error counting unread notifications', error as Error, { 
        userId: userId.toString() 
      });
      throw error;
    }
  }

  /**
   * Find recent notifications by user
   */
  public async findRecentByUser(
    userId: string | Types.ObjectId, 
    limit: number = 20
  ): Promise<INotification[]> {
    try {
      this.logger.debug('Finding recent notifications by user', { 
        userId: userId.toString(), 
        limit 
      });
      
      const notifications = await this.crudOps.find({
        user: userId
      }, {
        sort: [{ field: 'createdAt', direction: 'desc' }],
        pagination: { limit, offset: 0, page: 1, pageSize: limit }
      });

      return notifications.map(notification => this.mapToEntity(notification));
    } catch (error) {
      this.logger.error('Error finding recent notifications', error as Error, { 
        userId: userId.toString(), 
        limit 
      });
      throw error;
    }
  }

  /**
   * Bulk create notifications
   */
  public async bulkCreate(notifications: Partial<INotification>[]): Promise<INotification[]> {
    try {
      this.logger.debug('Bulk creating notifications', { count: notifications.length });

      const createdNotifications = await this.createMany(notifications);

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateByPattern('*');
      }

      await this.publishEvent('notification.bulk_created', {
        count: createdNotifications.length,
        timestamp: new Date()
      });

      return createdNotifications;
    } catch (error) {
      this.logger.error('Error bulk creating notifications', error as Error);
      throw error;
    }
  }

  /**
   * Find notifications by related entity
   */
  public async findByRelatedEntity(
    entityType: string, 
    entityId: string | Types.ObjectId
  ): Promise<INotification[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('related_entity', { 
      entityType, 
      entityId: entityId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<INotification[]>(cacheKey);
    if (cached) {
      return cached.map(notification => this.mapToEntity(notification));
    }

    try {
      this.logger.debug('Finding notifications by related entity', { 
        entityType, 
        entityId: entityId.toString() 
      });
      
      const notifications = await this.crudOps.find({
        'relatedEntity.type': entityType,
        'relatedEntity.id': entityId
      }, {
        sort: [{ field: 'createdAt', direction: 'desc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, notifications, NotificationRepository.CACHE_TTL);
      }

      return notifications.map(notification => this.mapToEntity(notification));
    } catch (error) {
      this.logger.error('Error finding notifications by related entity', error as Error, { 
        entityType, 
        entityId: entityId.toString() 
      });
      throw error;
    }
  }

  /**
   * Find pending delivery notifications
   */
  public async findPendingDelivery(channel?: string): Promise<INotification[]> {
    try {
      this.logger.debug('Finding pending delivery notifications', { channel });
      
      const query: any = {
        deliveryStatus: 'pending'
      };

      if (channel) {
        query.channels = { $in: [channel] };
      }

      const notifications = await this.crudOps.find(query, {
        sort: [{ field: 'scheduledFor', direction: 'asc' }]
      });

      return notifications.map(notification => this.mapToEntity(notification));
    } catch (error) {
      this.logger.error('Error finding pending delivery notifications', error as Error, { channel });
      throw error;
    }
  }

  /**
   * Update delivery status
   */
  public async updateDeliveryStatus(
    id: string | Types.ObjectId, 
    status: string, 
    metadata?: Record<string, any>
  ): Promise<INotification | null> {
    try {
      this.logger.debug('Updating delivery status', { 
        id: id.toString(), 
        status 
      });

      const updateData: any = {
        deliveryStatus: status
      };

      if (status === 'sent' || status === 'delivered') {
        updateData.sentAt = new Date();
      }

      if (metadata) {
        updateData.metadata = { ...updateData.metadata, ...metadata };
      }

      const notification = await this.crudOps.update(id, updateData);

      if (notification && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateAfterUpdate(id, notification);
      }

      if (notification) {
        await this.publishEvent('notification.delivery_status_updated', {
          notificationId: id.toString(),
          status,
          metadata,
          timestamp: new Date()
        });
      }

      return notification ? this.mapToEntity(notification) : null;
    } catch (error) {
      this.logger.error('Error updating delivery status', error as Error, { 
        id: id.toString(), 
        status 
      });
      throw error;
    }
  }

  /**
   * Override create to handle notification-specific logic
   */
  public async create(data: Partial<INotification>, context?: RepositoryContext): Promise<INotification> {
    // Set default values
    const notificationData: Partial<INotification> = {
      ...data,
      isRead: false,
      priority: data.priority ?? 'normal',
      deliveryStatus: data.deliveryStatus ?? 'pending',
      channels: data.channels ?? ['in-app'],
      data: data.data ?? {},
      metadata: data.metadata ?? {}
    };

    // Set expiration if not provided
    if (!notificationData.expiresAt) {
      const defaultExpiration = new Date();
      defaultExpiration.setDate(defaultExpiration.getDate() + 30); // 30 days default
      notificationData.expiresAt = defaultExpiration;
    }

    const notification = await super.create(notificationData, context);

    // Invalidate user-specific caches
    if (notification.user && this.cacheHelpers.isEnabled) {
      await this.cacheHelpers.invalidateByPattern(`user:${notification.user.toString()}*`);
      await this.cacheHelpers.invalidateByPattern(`unread_user:${notification.user.toString()}*`);
    }

    // Publish notification creation event
    await this.publishEvent('notification.created', {
      notificationId: notification._id.toString(),
      userId: notification.user.toString(),
      type: notification.type,
      category: notification.category,
      priority: notification.priority,
      channels: notification.channels,
      timestamp: new Date()
    });

    return notification;
  }
  
  protected validateData(data: Partial<INotification>): ValidationResult {
    const errors = [
      ...this.validateTitle(data.title),
      ...this.validateMessage(data.message),
      ...this.validatePriority(data.priority),
      ...this.validateDeliveryStatus(data.deliveryStatus),
      ...this.validateChannels(data.channels)
    ];

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
  
  private validateTitle(title?: string): string[] {
    if (title === undefined) return [];
    const result = ValidationHelpers.validateFieldLength(title, 'title', 1, 200);
    return result.valid ? [] : result.errors;
  }

  private validateMessage(message?: string): string[] {
    if (message === undefined) return [];
    const result = ValidationHelpers.validateFieldLength(message, 'message', 1, 1000);
    return result.valid ? [] : result.errors;
  }

  private validatePriority(priority?: string): string[] {
    if (priority === undefined) return [];
    const validPriorities = Object.values(NotificationPriority);
    return validPriorities.includes(priority as NotificationPriority)
      ? []
      : [`Priority must be one of: ${validPriorities.join(', ')}`];
  }

  private validateDeliveryStatus(status?: string): string[] {
    if (status === undefined) return [];
    const validStatuses = Object.values(DeliveryStatus);
    return validStatuses.includes(status as DeliveryStatus)
      ? []
      : [`Delivery status must be one of: ${validStatuses.join(', ')}`];
  }

  private validateChannels(channels?: string[]): string[] {
    if (channels === undefined) return [];
    if (!Array.isArray(channels) || channels.length === 0) {
      return ['Channels must be a non-empty array'];
    }
    const validChannels = Object.values(NotificationChannel);
    const invalidChannels = channels.filter(ch => !validChannels.includes(ch as NotificationChannel));
    return invalidChannels.length > 0
      ? [`Invalid channels: ${invalidChannels.join(', ')}`]
      : [];
  }

  /**
   * Map database document to domain entity
   */
  protected mapToEntity(data: any): INotification {
    return {
      _id: data._id,
      user: data.user,
      title: data.title,
      message: data.message,
      type: data.type,
      category: data.category,
      priority: data.priority ?? 'normal',
      isRead: data.isRead ?? false,
      readAt: data.readAt,
      data: data.data ?? {},
      relatedEntity: data.relatedEntity,
      scheduledFor: data.scheduledFor,
      sentAt: data.sentAt,
      deliveryStatus: data.deliveryStatus ?? 'pending',
      channels: data.channels ?? ['in-app'],
      metadata: data.metadata ?? {},
      expiresAt: data.expiresAt,
      organizationId: data.organizationId,
      createdBy: data.createdBy,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    } as INotification;
  }

  /**
   * Map domain entity to database document
   */
  protected mapFromEntity(entity: INotification): any {
    const doc = { ...entity };
    
    // Remove any computed fields
    delete (doc as any).__v;
    
    return doc;
  }
}