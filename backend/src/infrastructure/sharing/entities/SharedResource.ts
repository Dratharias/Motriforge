import { Types } from 'mongoose';
import { IEntity, IUser } from '../../../types/core/interfaces';
import { IArchivable } from '../../../types/core/behaviors';
import { ResourceType, Action } from '../../../types/core/enums';
import { IShareCondition, ShareScope } from './interfaces';

export class SharedResource implements IEntity, IArchivable {
  public readonly id: Types.ObjectId;
  public readonly resourceId: Types.ObjectId;
  public readonly resourceType: ResourceType;
  public readonly owner: Types.ObjectId;
  public readonly sharedWith: readonly Types.ObjectId[];
  public readonly allowedActions: readonly Action[];
  public readonly startDate: Date;
  public readonly endDate?: Date;
  public readonly conditions: readonly IShareCondition[];
  public readonly scope: ShareScope;
  public readonly archived: boolean;
  public readonly notes: string;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly createdBy: Types.ObjectId;
  public readonly isActive: boolean;
  public readonly isDraft: boolean;

  constructor(data: {
    id?: Types.ObjectId;
    resourceId: Types.ObjectId;
    resourceType: ResourceType;
    owner: Types.ObjectId;
    sharedWith: readonly Types.ObjectId[];
    allowedActions: readonly Action[];
    startDate: Date;
    endDate?: Date;
    conditions?: readonly IShareCondition[];
    scope?: ShareScope;
    archived?: boolean;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
    createdBy: Types.ObjectId;
    isActive?: boolean;
  }) {
    this.id = data.id ?? new Types.ObjectId();
    this.resourceId = data.resourceId;
    this.resourceType = data.resourceType;
    this.owner = data.owner;
    this.sharedWith = data.sharedWith;
    this.allowedActions = data.allowedActions;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.conditions = data.conditions ?? [];
    this.scope = data.scope ?? ShareScope.DIRECT;
    this.archived = data.archived ?? false;
    this.notes = data.notes ?? '';
    this.createdAt = data.createdAt ?? new Date();
    this.updatedAt = data.updatedAt ?? new Date();
    this.createdBy = data.createdBy;
    this.isActive = data.isActive ?? true;
    this.isDraft = false;

    this.validateSharedResource();
  }

  isValid(): boolean {
    try {
      this.validateSharedResource();
      return !this.hasExpired() && this.isActive && !this.archived;
    } catch {
      return false;
    }
  }

  hasExpired(): boolean {
    return this.endDate ? this.endDate <= new Date() : false;
  }

  canUserAccess(user: IUser, action: Action): boolean {
    if (this.archived || !this.isActive || this.hasExpired()) {
      return false;
    }

    if (this.owner.equals(user.id)) {
      return true;
    }

    if (!this.sharedWith.some(userId => userId.equals(user.id))) {
      return false;
    }

    return this.allowedActions.includes(action);
  }

  addSharedUser(userId: Types.ObjectId): SharedResource {
    if (this.sharedWith.some(id => id.equals(userId))) {
      return this;
    }

    return new SharedResource({
      ...this,
      sharedWith: [...this.sharedWith, userId],
      updatedAt: new Date()
    });
  }

  removeSharedUser(userId: Types.ObjectId): SharedResource {
    return new SharedResource({
      ...this,
      sharedWith: this.sharedWith.filter(id => !id.equals(userId)),
      updatedAt: new Date()
    });
  }

  updateActions(actions: readonly Action[]): SharedResource {
    return new SharedResource({
      ...this,
      allowedActions: actions,
      updatedAt: new Date()
    });
  }

  extend(newEndDate: Date): SharedResource {
    return new SharedResource({
      ...this,
      endDate: newEndDate,
      updatedAt: new Date()
    });
  }

  archive(): void {
    // Implemented through repository
  }

  restore(): void {
    // Implemented through repository
  }

  canBeDeleted(): boolean {
    return this.archived || this.hasExpired();
  }

  getAssociationCount(): number {
    return this.sharedWith.length;
  }

  getDaysRemaining(): number {
    if (!this.endDate) return Infinity;
    const now = new Date();
    const diff = this.endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  private validateSharedResource(): void {
    if (!this.resourceId) {
      throw new Error('Resource ID is required');
    }

    if (!this.resourceType) {
      throw new Error('Resource type is required');
    }

    if (!this.owner) {
      throw new Error('Owner is required');
    }

    if (this.allowedActions.length === 0) {
      throw new Error('At least one action must be allowed');
    }

    if (this.endDate && this.endDate <= this.startDate) {
      throw new Error('End date must be after start date');
    }

    if (this.sharedWith.some(userId => userId.equals(this.owner))) {
      throw new Error('Cannot share resource with owner');
    }
  }
}

