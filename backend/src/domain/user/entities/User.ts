import { Types } from 'mongoose';
import { IEntity, IUser } from '../../../types/core/interfaces';
import { IArchivable } from '../../../types/core/behaviors';
import { Role, Status, ResourceType, Action } from '../../../types/core/enums';
import { UserProfile } from './UserProfile';
import { UserPreferences } from './UserPreferences';

/**
 * Core user entity representing system users
 */
export class User implements IEntity, IUser, IArchivable {
  public readonly id: Types.ObjectId;
  public readonly email: string;
  public readonly firstName: string;
  public readonly lastName: string;
  public readonly role: Role;
  public readonly status: Status;
  public readonly organization: Types.ObjectId;
  public readonly profile?: UserProfile;
  public readonly preferences?: UserPreferences;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly lastActiveAt?: Date;
  public readonly createdBy: Types.ObjectId;
  public readonly isActive: boolean;
  public readonly isDraft: boolean = false; // Users are not draftable

  constructor(data: {
    id: Types.ObjectId;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    status: Status;
    organization: Types.ObjectId;
    profile?: UserProfile;
    preferences?: UserPreferences;
    createdAt: Date;
    updatedAt: Date;
    lastActiveAt?: Date;
    createdBy: Types.ObjectId;
    isActive: boolean;
  }) {
    this.id = data.id;
    this.email = data.email;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.role = data.role;
    this.status = data.status;
    this.organization = data.organization;
    this.profile = data.profile;
    this.preferences = data.preferences;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.lastActiveAt = data.lastActiveAt;
    this.createdBy = data.createdBy;
    this.isActive = data.isActive;
  }

  /**
   * Get user's full name
   */
  getFullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  /**
   * Check if user can access a resource with specified action
   */
  canAccess(resource: ResourceType, action: Action): boolean {
    // Basic role-based access control
    // This would be enhanced by IAM service in practice
    switch (this.role) {
      case Role.ADMIN:
        return true;
      case Role.MANAGER:
        return action !== Action.DELETE || resource !== ResourceType.EXERCISE;
      case Role.TRAINER:
        return ![Action.DELETE].includes(action) || 
               ![ResourceType.PROGRAM, ResourceType.EXERCISE].includes(resource);
      case Role.CLIENT:
        return [Action.READ, Action.UPDATE].includes(action) && 
               [ResourceType.PROFILE, ResourceType.PROGRESS, ResourceType.DASHBOARD].includes(resource);
      case Role.GUEST:
        return action === Action.READ && resource === ResourceType.DASHBOARD;
      default:
        return false;
    }
  }

  /**
   * Update last active timestamp
   */
  updateLastActive(): User {
    return new User({
      ...this,
      lastActiveAt: new Date(),
      updatedAt: new Date()
    });
  }

  /**
   * Check if user is currently active
   */
  isUserActive(): boolean {
    return this.isActive && this.status === Status.ACTIVE;
  }

  /**
   * Check if user has been active recently (within 30 days)
   */
  isRecentlyActive(): boolean {
    if (!this.lastActiveAt) return false;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return this.lastActiveAt > thirtyDaysAgo;
  }

  /**
   * Get user's display name based on role
   */
  getDisplayName(): string {
    const fullName = this.getFullName();
    
    switch (this.role) {
      case Role.ADMIN:
        return `Admin: ${fullName}`;
      case Role.TRAINER:
        return `Trainer: ${fullName}`;
      case Role.MANAGER:
        return `Manager: ${fullName}`;
      default:
        return fullName;
    }
  }

  /**
   * Check if user can be assigned workouts/programs
   */
  canBeAssigned(): boolean {
    return this.role === Role.CLIENT && this.isUserActive();
  }

  /**
   * Check if user can assign workouts/programs to others
   */
  canAssignToOthers(): boolean {
    return [Role.ADMIN, Role.MANAGER, Role.TRAINER].includes(this.role) && this.isUserActive();
  }

  // IArchivable implementation
  archive(): void {
    // This would be handled by the service layer
  }

  restore(): void {
    // This would be handled by the service layer
  }

  canBeDeleted(): boolean {
    // Users can be deleted if they have no active assignments or data
    return !this.isUserActive();
  }

  getAssociationCount(): number {
    // This would count workouts, programs, progress records, etc.
    // Placeholder for now
    return 0;
  }

  /**
   * Create a new user with updated data
   */
  update(updates: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: Role;
    status?: Status;
  }): User {
    return new User({
      ...this,
      firstName: updates.firstName ?? this.firstName,
      lastName: updates.lastName ?? this.lastName,
      email: updates.email ?? this.email,
      role: updates.role ?? this.role,
      status: updates.status ?? this.status,
      updatedAt: new Date()
    });
  }
}

