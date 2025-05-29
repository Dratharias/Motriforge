import { Types } from 'mongoose';
import { ResourceType, Action } from '../../../types/core/enums';

export enum ShareScope {
  DIRECT = 'DIRECT',
  ORGANIZATION = 'ORGANIZATION',
  TEAM = 'TEAM',
  PUBLIC = 'PUBLIC'
}

export enum SharePermission {
  FULL_ACCESS = 'FULL_ACCESS',
  READ_ONLY = 'READ_ONLY',
  COMMENT_ONLY = 'COMMENT_ONLY',
  CUSTOM = 'CUSTOM'
}

export interface IShareCondition {
  readonly type: string;
  readonly value: unknown;
  readonly operator: string;
}

export interface IShareRequest {
  readonly resourceId: Types.ObjectId;
  readonly resourceType: ResourceType;
  readonly targetUsers: readonly Types.ObjectId[];
  readonly allowedActions: readonly Action[];
  readonly endDate?: Date;
  readonly conditions?: readonly IShareCondition[];
  readonly scope?: ShareScope;
  readonly notes?: string;
}

export interface IShareNotification {
  readonly id: Types.ObjectId;
  readonly shareId: Types.ObjectId;
  readonly recipientId: Types.ObjectId;
  readonly type: 'SHARED' | 'REVOKED' | 'EXPIRED' | 'REMINDER';
  readonly sent: boolean;
  readonly sentAt?: Date;
  readonly createdAt: Date;
}

export interface IShareAuditEntry {
  readonly id: Types.ObjectId;
  readonly shareId: Types.ObjectId;
  readonly action: 'CREATED' | 'UPDATED' | 'REVOKED' | 'EXPIRED' | 'ACCESSED';
  readonly performedBy: Types.ObjectId;
  readonly details: Record<string, unknown>;
  readonly timestamp: Date;
  readonly ipAddress?: string;
  readonly userAgent?: string;
}