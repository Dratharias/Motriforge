import { Types } from 'mongoose';
import { IUser } from '../../../types/core/interfaces';
import { Action } from '../../../types/core/enums';
import { SharedResource } from '../entities/SharedResource';
import { IShareAuditEntry } from '../entities/interfaces';
import { IShareAuditRepository } from './interfaces';

export interface IAuditContext {
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly sessionId?: string;
  readonly metadata?: Record<string, unknown>;
}

export class ShareAuditService {
  constructor(
    private readonly auditRepository: IShareAuditRepository
  ) {}

  async logShareCreated(
    sharedResource: SharedResource,
    sharer: IUser,
    targetUsers: readonly IUser[],
    context?: IAuditContext
  ): Promise<void> {
    await this.createAuditEntry({
      shareId: sharedResource.id,
      action: 'CREATED',
      performedBy: sharer.id,
      details: {
        resourceId: sharedResource.resourceId,
        resourceType: sharedResource.resourceType,
        targetUserIds: targetUsers.map(u => u.id.toString()),
        allowedActions: sharedResource.allowedActions,
        endDate: sharedResource.endDate,
        scope: sharedResource.scope
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent
    });
  }

  async logShareUpdated(
    sharedResource: SharedResource,
    updater: IUser,
    changes: Record<string, unknown>,
    context?: IAuditContext
  ): Promise<void> {
    await this.createAuditEntry({
      shareId: sharedResource.id,
      action: 'UPDATED',
      performedBy: updater.id,
      details: {
        resourceId: sharedResource.resourceId,
        changes
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent
    });
  }

  async logShareRevoked(
    sharedResource: SharedResource,
    revoker: IUser,
    affectedUsers: readonly IUser[],
    context?: IAuditContext
  ): Promise<void> {
    await this.createAuditEntry({
      shareId: sharedResource.id,
      action: 'REVOKED',
      performedBy: revoker.id,
      details: {
        resourceId: sharedResource.resourceId,
        affectedUserIds: affectedUsers.map(u => u.id.toString()),
        revokedAt: new Date()
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent
    });
  }

  async logShareExpired(
    sharedResource: SharedResource,
    affectedUsers: readonly IUser[]
  ): Promise<void> {
    await this.createAuditEntry({
      shareId: sharedResource.id,
      action: 'EXPIRED',
      performedBy: sharedResource.owner, // System action, but attribute to owner
      details: {
        resourceId: sharedResource.resourceId,
        affectedUserIds: affectedUsers.map(u => u.id.toString()),
        expiredAt: new Date(),
        originalEndDate: sharedResource.endDate
      }
    });
  }

  async logAccessAttempt(
    sharedResource: SharedResource,
    user: IUser,
    action: Action,
    successful: boolean,
    reason?: string,
    context?: IAuditContext
  ): Promise<void> {
    await this.createAuditEntry({
      shareId: sharedResource.id,
      action: 'ACCESSED',
      performedBy: user.id,
      details: {
        resourceId: sharedResource.resourceId,
        attemptedAction: action,
        successful,
        reason,
        accessedAt: new Date()
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent
    });
  }

  async logShareError(
    resourceId: Types.ObjectId,
    user: IUser,
    errorType: string,
    errorMessage: string,
    context?: IAuditContext
  ): Promise<void> {
    await this.createAuditEntry({
      shareId: new Types.ObjectId(), // Placeholder for failed share attempts
      action: 'ERROR' as any,
      performedBy: user.id,
      details: {
        resourceId,
        errorType,
        errorMessage,
        occurredAt: new Date()
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent
    });
  }

  async getShareHistory(shareId: Types.ObjectId): Promise<readonly IShareAuditEntry[]> {
    return this.auditRepository.findByShareId(shareId);
  }

  async getUserShareActivity(userId: Types.ObjectId, limit?: number): Promise<readonly IShareAuditEntry[]> {
    const entries = await this.auditRepository.findByUserId(userId);
    return limit ? entries.slice(0, limit) : entries;
  }

  async getShareStatistics(dateRange?: { start: Date; end: Date }): Promise<{
    totalShares: number;
    sharesByAction: Record<string, number>;
    mostActiveUsers: Array<{ userId: string; count: number }>;
    accessAttempts: { successful: number; failed: number };
  }> {
    const entries = dateRange
      ? await this.auditRepository.findByDateRange(dateRange.start, dateRange.end)
      : await this.auditRepository.findByDateRange(
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          new Date()
        );

    const sharesByAction = entries.reduce((acc, entry) => {
      acc[entry.action] = (acc[entry.action] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const userCounts = entries.reduce((acc, entry) => {
      const userId = entry.performedBy.toString();
      acc[userId] = (acc[userId] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostActiveUsers = Object.entries(userCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, count }));

    const accessEntries = entries.filter(e => e.action === 'ACCESSED');
    const accessAttempts = {
      successful: accessEntries.filter(e => e.details.successful).length,
      failed: accessEntries.filter(e => !e.details.successful).length
    };

    return {
      totalShares: sharesByAction['CREATED'] ?? 0,
      sharesByAction,
      mostActiveUsers,
      accessAttempts
    };
  }

  async cleanupOldEntries(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    return this.auditRepository.deleteOlderThan(cutoffDate);
  }

  private async createAuditEntry(data: {
    shareId: Types.ObjectId;
    action: 'CREATED' | 'UPDATED' | 'REVOKED' | 'EXPIRED' | 'ACCESSED' ;
    performedBy: Types.ObjectId;
    details: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<IShareAuditEntry> {
    return this.auditRepository.create({
      shareId: data.shareId,
      action: data.action,
      performedBy: data.performedBy,
      details: data.details,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    });
  }
}