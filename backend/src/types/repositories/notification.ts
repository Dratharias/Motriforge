import { Types } from "mongoose";


/**
 * Notification model interface
 */
export interface INotification {
  readonly _id: Types.ObjectId;
  readonly user: Types.ObjectId;
  readonly title: string;
  readonly message: string;
  readonly type: string;
  readonly category: string;
  readonly priority: 'low' | 'normal' | 'high' | 'urgent';
  readonly isRead: boolean;
  readonly readAt?: Date;
  readonly data?: Record<string, any>;
  readonly relatedEntity?: {
    readonly type: string;
    readonly id: Types.ObjectId;
  };
  readonly scheduledFor?: Date;
  readonly sentAt?: Date;
  readonly deliveryStatus: 'pending' | 'sent' | 'delivered' | 'failed' | 'cancelled';
  readonly channels: string[]; // email, push, sms, in-app
  readonly metadata?: Record<string, any>;
  expiresAt?: Date;
  readonly organizationId?: Types.ObjectId;
  readonly createdBy?: Types.ObjectId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Notification repository interface
 */
export interface INotificationRepository {
  findByUser(userId: string | Types.ObjectId): Promise<INotification[]>;
  findUnreadByUser(userId: string | Types.ObjectId): Promise<INotification[]>;
  findByType(type: string): Promise<INotification[]>;
  findByCategory(category: string): Promise<INotification[]>;
  findByPriority(priority: string): Promise<INotification[]>;
  findScheduledNotifications(before?: Date): Promise<INotification[]>;
  findExpiredNotifications(): Promise<INotification[]>;
  markAsRead(id: string | Types.ObjectId, userId: string | Types.ObjectId): Promise<INotification | null>;
  markAllAsRead(userId: string | Types.ObjectId): Promise<number>;
  deleteExpiredNotifications(): Promise<number>;
  countUnreadByUser(userId: string | Types.ObjectId): Promise<number>;
  findRecentByUser(userId: string | Types.ObjectId, limit?: number): Promise<INotification[]>;
  bulkCreate(notifications: Partial<INotification>[]): Promise<INotification[]>;
  findByRelatedEntity(entityType: string, entityId: string | Types.ObjectId): Promise<INotification[]>;
  findPendingDelivery(channel?: string): Promise<INotification[]>;
  updateDeliveryStatus(id: string | Types.ObjectId, status: string, metadata?: Record<string, any>): Promise<INotification | null>;
}