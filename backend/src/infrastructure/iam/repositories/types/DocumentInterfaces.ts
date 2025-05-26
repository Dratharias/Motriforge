
import { Types, Document } from 'mongoose';
import { IdentityStatus, SessionStatus, AccessLevel, AuthenticationMethod, DeviceType, EventType, RiskLevel } from '@/types/iam/enums';
import { PolicyRule } from '@/types/iam/interfaces';

export interface IdentityDocument extends Document {
  _id: Types.ObjectId;
  username: string;
  usernameDomain?: string;
  email: string;
  status: IdentityStatus;
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  emailVerified: boolean;
  phoneVerified: boolean;
  mfaEnabled: boolean;
  attributes: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionDocument extends Document {
  _id: Types.ObjectId;
  sessionId: string;
  identityId: Types.ObjectId;
  deviceId: Types.ObjectId;
  status: SessionStatus;
  expiresAt: Date;
  lastAccessedAt: Date;
  ipAddress: string;
  userAgent: string;
  authenticationMethod: AuthenticationMethod;
  riskScore: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccessControlDocument extends Document {
  _id: Types.ObjectId;
  identityId: Types.ObjectId;
  roles: Types.ObjectId[];
  permissions: Types.ObjectId[];
  accessLevel: AccessLevel;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleDocument extends Document {
  _id: Types.ObjectId;
  name: {
    value: string;
    scope?: string;
  };
  description: string;
  permissions: Types.ObjectId[];
  parentRoles: Types.ObjectId[];
  childRoles: Types.ObjectId[];
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PermissionDocument extends Document {
  _id: Types.ObjectId;
  name: {
    value: string;
    resource: string;
    action: string;
  };
  description: string;
  resource: string;
  action: string;
  conditions?: Record<string, unknown>;
  isSystemPermission: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeviceDocument extends Document {
  _id: Types.ObjectId;
  fingerprint: {
    value: string;
    components: Record<string, string>;
  };
  type: DeviceType;
  name: string;
  isTrusted: boolean;
  firstSeenAt: Date;
  lastSeenAt: Date;
  attributes: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLogDocument extends Document {
  _id: Types.ObjectId;
  eventType: EventType;
  identityId?: Types.ObjectId;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, unknown>;
  riskLevel: RiskLevel;
  timestamp: Date;
  correlationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  target: {
    subjects?: string[];
    resources?: string[];
    actions?: string[];
    environments?: Record<string, unknown>;
  };
  rules: PolicyRule[];
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}