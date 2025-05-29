import { Types } from 'mongoose';
import { Role, ResourceType, Action } from '../../../../types/core/enums';
import { IUser, IResourcePermission, IEntity } from '../../../../types/core/interfaces';

// ===== ACCESS LOG ENTRY =====
export interface IAccessLogEntry {
  readonly userId: string;
  readonly resource: ResourceType;
  readonly action: Action;
  readonly granted: boolean;
  readonly reason?: string;
  readonly timestamp: Date;
}

// ===== PERMISSION CONTEXT =====
export interface IPermissionContext {
  readonly user: IUser;
  readonly resource: ResourceType;
  readonly action: Action;
  readonly resourceId?: Types.ObjectId;
  readonly organizationId?: Types.ObjectId;
  readonly targetUserId?: Types.ObjectId;
  readonly metadata?: Record<string, unknown>;
  readonly timestamp?: Date;
}

// ===== ACCESS CONTEXT =====
export interface IAccessContext {
  readonly resourceId?: Types.ObjectId;
  readonly organizationId?: Types.ObjectId;
  readonly targetUserId?: Types.ObjectId;
  readonly metadata?: Record<string, unknown>;
}

// ===== ACCESS DECISION =====
export interface IAccessDecision {
  readonly granted: boolean;
  readonly reason: string;
  readonly context: IPermissionContext;
  readonly timestamp: Date;
  readonly strategy: string;
}

// ===== PERMISSION SET INTERFACES =====
export interface IPermissionSetData {
  readonly role: Role;
  readonly permissions: readonly IResourcePermission[];
  readonly description: string;
  readonly version?: number;
  readonly metadata?: Record<string, unknown>;
  readonly createdBy?: Types.ObjectId;
}

export interface IPermissionSet extends IEntity {
  readonly role: Role;
  readonly permissions: readonly IResourcePermission[];
  readonly description: string;
  readonly version: number;
  readonly metadata?: Record<string, unknown>;
  
  allows(resource: ResourceType, action: Action): boolean;
  getPermission(resource: ResourceType): IResourcePermission | null;
  getPermissions(): readonly IResourcePermission[];
  hasPermission(resource: ResourceType, action: Action): boolean;
  update(updates: Partial<IPermissionSetData>): IPermissionSet;
  canBeUsed(): boolean;
  isExpired(): boolean;
}

// ===== VALIDATION INTERFACES =====
export interface IValidationResult {
  readonly valid: boolean;
  readonly failedRules: readonly string[];
  readonly warnings: readonly string[];
  readonly context: IPermissionContext;
  readonly timestamp: Date;
}

export interface IAccessValidationRule {
  readonly name: string;
  readonly description: string;
  readonly isRequired: boolean;
  
  appliesTo(context: IPermissionContext): boolean;
  validate(context: IPermissionContext): Promise<{
    valid: boolean;
    reason?: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface IAccessValidator {
  validate(context: IPermissionContext): Promise<IValidationResult>;
  addRule(rule: IAccessValidationRule): void;
  removeRule(ruleName: string): boolean;
  getRules(): readonly IAccessValidationRule[];
  getApplicableRules(context: IPermissionContext): readonly IAccessValidationRule[];
}

// ===== BASE VALIDATION RULE =====
export abstract class BaseValidationRule implements IAccessValidationRule {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly isRequired: boolean;

  abstract appliesTo(context: IPermissionContext): boolean;
  abstract validate(context: IPermissionContext): Promise<{
    valid: boolean;
    reason?: string;
    metadata?: Record<string, unknown>;
  }>;

  protected createResult(
    valid: boolean,
    reason?: string,
    metadata?: Record<string, unknown>
  ): { valid: boolean; reason?: string; metadata?: Record<string, unknown> } {
    return { valid, reason, metadata };
  }

  protected isUserActive(user: IUser): boolean {
    return user.status === 'ACTIVE';
  }

  protected getUserStatus(user: IUser): string {
    return user.status;
  }

  protected isSameOrganization(user: IUser, organizationId: Types.ObjectId): boolean {
    return user.organization.toString() === organizationId.toString();
  }
}

// ===== REPOSITORY INTERFACES =====
export interface IPermissionRepository {
  findByRole(role: Role): Promise<IPermissionSet | null>;
  findById(id: Types.ObjectId): Promise<IPermissionSet | null>;
  create(permissionSet: IPermissionSet): Promise<IPermissionSet>;
  update(id: Types.ObjectId, updates: Partial<IPermissionSetData>): Promise<IPermissionSet | null>;
  delete(id: Types.ObjectId): Promise<boolean>;
  findAll(): Promise<readonly IPermissionSet[]>;
  findActive(): Promise<readonly IPermissionSet[]>;
  isRolePermissionExists(role: Role): Promise<boolean>;
}

// ===== SERVICE INTERFACES =====
export interface IIAMService {
  canAccess(
    user: IUser,
    resource: ResourceType,
    action: Action,
    context?: IAccessContext
  ): Promise<boolean>;

  validateAccess(
    user: IUser,
    resource: ResourceType,
    action: Action,
    context?: IAccessContext
  ): Promise<IAccessDecision>;

  canShare(user: IUser, target: IUser, resource: ResourceType): Promise<boolean>;
  hasPermission(user: IUser, permission: IResourcePermission): Promise<boolean>;
  getUserPermissions(user: IUser): Promise<readonly IResourcePermission[]>;
  
  createPermissionSet(
    role: Role,
    permissions: readonly IResourcePermission[],
    description: string,
    createdBy: Types.ObjectId
  ): Promise<IPermissionSet>;
  
  updateRolePermissions(
    role: Role,
    permissions: readonly IResourcePermission[]
  ): Promise<IPermissionSet | null>;
  
  getRolePermissions(role: Role): Promise<IPermissionSet | null>;
}