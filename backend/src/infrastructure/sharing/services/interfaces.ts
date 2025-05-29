import { Types } from 'mongoose';
import { IUser } from '../../../types/core/interfaces';
import { Action } from '../../../types/core/enums';
import { SharedResource } from '../entities/SharedResource';
import { IShareRequest, IShareAuditEntry } from '../entities/interfaces';
import { ShareValidator } from '../engine/ShareValidator';
import { ShareNotificationService } from '../engine/ShareNotificationService';
import { ShareExpirationService } from '../engine/ShareExpirationService';
import { ShareAuditService } from './ShareAuditService';
import { IShareRuleEngine } from '../rules/interfaces';

// Repository Interfaces
export interface IShareRepository {
  findById(id: Types.ObjectId): Promise<SharedResource | null>;
  findByUserAndResource(userId: Types.ObjectId, resourceId: Types.ObjectId): Promise<SharedResource | null>;
  findByOwnerId(ownerId: Types.ObjectId): Promise<readonly SharedResource[]>;
  findBySharedUserId(userId: Types.ObjectId): Promise<readonly SharedResource[]>;
  findByResourceId(resourceId: Types.ObjectId): Promise<readonly SharedResource[]>;
  create(share: SharedResource): Promise<SharedResource>;
  update(id: Types.ObjectId, updates: SharedResource): Promise<SharedResource | null>;
  archive(id: Types.ObjectId): Promise<boolean>;
  bulkArchiveExpired(): Promise<number>;
}

export interface IShareAuditRepository {
  create(entry: Omit<IShareAuditEntry, 'id' | 'timestamp'>): Promise<IShareAuditEntry>;
  findByShareId(shareId: Types.ObjectId): Promise<readonly IShareAuditEntry[]>;
  findByUserId(userId: Types.ObjectId): Promise<readonly IShareAuditEntry[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<readonly IShareAuditEntry[]>;
  deleteOlderThan(cutoffDate: Date): Promise<number>;
}

// Service Dependencies
export interface ISharingServiceDependencies {
  readonly shareRepository: IShareRepository;
  readonly shareValidator: ShareValidator;
  readonly ruleEngine?: IShareRuleEngine;  // Optional for backward compatibility
  readonly notificationService: ShareNotificationService;
  readonly expirationService: ShareExpirationService;
  readonly auditService: ShareAuditService;
}

// Rule Evaluation Interfaces
export interface IShareRuleEvaluationContext {
  readonly request: IShareRequest;
  readonly sharer: IUser;
  readonly targetUsers: readonly IUser[];
  readonly resourceOwner: IUser;
}

// Enhanced Validation Results
export interface IEnhancedValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly suggestedActions?: readonly Action[];
  readonly maxDuration?: number;
  readonly appliedRules: readonly string[];
  readonly failedRules: readonly string[];
}