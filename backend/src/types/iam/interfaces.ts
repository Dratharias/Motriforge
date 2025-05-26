import { Types } from 'mongoose';
import { 
  IdentityStatus, 
  SessionStatus, 
  AccessLevel, 
  AuthenticationMethod, 
  DeviceType, 
  RiskLevel, 
  PolicyDecision,
  EventType 
} from './enums';
import { Secret } from 'jsonwebtoken';

// ===== VALUE OBJECTS =====
export interface IdentityId {
  readonly value: Types.ObjectId;
}

export interface Username {
  readonly value: string;
  readonly domain?: string;
}

export interface RoleName {
  readonly value: string;
  readonly scope?: string;
}

export interface PermissionName {
  readonly value: string;
  readonly resource: string;
  readonly action: string;
}

export interface SessionId {
  readonly value: string;
}

export interface DeviceFingerprint {
  readonly value: string;
  readonly components: Record<string, string>;
}

export interface IPAddress {
  readonly value: string;
  readonly type: 'ipv4' | 'ipv6';
}

// ===== DOMAIN ENTITIES =====
export interface Identity {
  readonly id: Types.ObjectId;
  readonly username: Username;
  readonly email: string;
  readonly status: IdentityStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lastLoginAt?: Date;
  readonly failedLoginAttempts: number;
  readonly lockedUntil?: Date;
  readonly emailVerified: boolean;
  readonly phoneVerified: boolean;
  readonly mfaEnabled: boolean;
  readonly attributes: Record<string, unknown>;
}

export interface Role {
  readonly id: Types.ObjectId;
  readonly name: RoleName;
  readonly description: string;
  readonly permissions: Types.ObjectId[];
  readonly parentRoles: Types.ObjectId[];
  readonly childRoles: Types.ObjectId[];
  readonly isSystemRole: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface Permission {
  readonly id: Types.ObjectId;
  readonly name: PermissionName;
  readonly description: string;
  readonly resource: string;
  readonly action: string;
  readonly conditions?: Record<string, unknown>;
  readonly isSystemPermission: boolean;
  readonly createdAt: Date;
}

export interface AccessControl {
  readonly id: Types.ObjectId;
  readonly identityId: Types.ObjectId;
  readonly roles: Types.ObjectId[];
  readonly permissions: Types.ObjectId[];
  readonly accessLevel: AccessLevel;
  readonly effectiveFrom: Date;
  readonly effectiveUntil?: Date;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface Session {
  readonly id: Types.ObjectId;
  readonly sessionId: SessionId;
  readonly identityId: Types.ObjectId;
  readonly deviceId: Types.ObjectId;
  readonly status: SessionStatus;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly lastAccessedAt: Date;
  readonly ipAddress: IPAddress;
  readonly userAgent: string;
  readonly authenticationMethod: AuthenticationMethod;
  readonly riskScore: number;
  readonly metadata: Record<string, unknown>;
}

export interface Device {
  readonly id: Types.ObjectId;
  readonly fingerprint: DeviceFingerprint;
  readonly type: DeviceType;
  readonly name: string;
  readonly isTrusted: boolean;
  readonly firstSeenAt: Date;
  readonly lastSeenAt: Date;
  readonly attributes: Record<string, unknown>;
}

export interface AccessToken {
  readonly id: Types.ObjectId;
  readonly token: string;
  readonly type: 'bearer' | 'jwt' | 'opaque';
  readonly sessionId: Types.ObjectId;
  readonly scopes: string[];
  readonly issuedAt: Date;
  readonly expiresAt: Date;
  readonly isRevoked: boolean;
}

export interface RefreshToken {
  readonly id: Types.ObjectId;
  readonly token: string;
  readonly sessionId: Types.ObjectId;
  readonly issuedAt: Date;
  readonly expiresAt: Date;
  readonly isUsed: boolean;
  readonly isRevoked: boolean;
}

export interface AccessAttempt {
  readonly id: Types.ObjectId;
  readonly identityId?: Types.ObjectId;
  readonly username?: string;
  readonly ipAddress: IPAddress;
  readonly userAgent: string;
  readonly authenticationMethod: AuthenticationMethod;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly riskLevel: RiskLevel;
  readonly timestamp: Date;
  readonly metadata: Record<string, unknown>;
}

// ===== SECURITY CONTEXT =====
export interface SecurityContext {
  readonly identity: Identity;
  readonly session: Session;
  readonly permissions: Permission[];
  readonly roles: Role[];
  readonly accessTokens: AccessToken[];
  readonly accessLevel: AccessLevel;
  readonly riskScore: number;
}

// ===== POLICY ENGINE =====
export interface PolicyRequest {
  readonly subject: Types.ObjectId;
  readonly resource: string;
  readonly action: string;
  readonly environment: Record<string, unknown>;
}

export interface PolicyResponse {
  readonly decision: PolicyDecision;
  readonly obligations?: string[];
  readonly advice?: string[];
  readonly reason?: string;
}

export interface Policy {
  readonly id: Types.ObjectId;
  readonly name: string;
  readonly description: string;
  readonly target: PolicyTarget;
  readonly rules: PolicyRule[];
  readonly isActive: boolean;
  readonly priority: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface PolicyTarget {
  readonly subjects?: string[];
  readonly resources?: string[];
  readonly actions?: string[];
  readonly environments?: Record<string, unknown>;
}

export interface PolicyRule {
  readonly id: string;
  readonly effect: 'permit' | 'deny';
  readonly condition?: PolicyCondition;
  readonly obligations?: string[];
  readonly advice?: string[];
}

export interface PolicyCondition {
  readonly operator: 'and' | 'or' | 'not' | 'equals' | 'contains' | 'greater_than' | 'less_than';
  readonly operands: (PolicyCondition | PolicyAttribute)[];
}

export interface PolicyAttribute {
  readonly category: 'subject' | 'resource' | 'action' | 'environment';
  readonly attribute: string;
  readonly value?: unknown;
}

// ===== DOMAIN EVENTS =====
export interface DomainEvent {
  readonly id: Types.ObjectId;
  readonly type: EventType;
  readonly aggregateId: Types.ObjectId;
  readonly aggregateType: string;
  readonly eventData: Record<string, unknown>;
  readonly metadata: EventMetadata;
  readonly timestamp: Date;
}

export interface EventMetadata {
  readonly correlationId: string;
  readonly causationId?: string;
  readonly userId?: Types.ObjectId;
  readonly sessionId?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
}

// ===== COMMANDS =====
export interface CreateIdentityCommand {
  readonly correlationId: string;
  readonly username: string;
  readonly email: string;
  readonly password?: string;
  readonly attributes?: Record<string, unknown>;
}

export interface UpdateIdentityCommand {
  readonly correlationId: string;
  readonly identityId: Types.ObjectId;
  readonly email?: string;
  readonly status?: IdentityStatus;
  readonly attributes?: Record<string, unknown>;
}

export interface AssignRoleCommand {
  readonly correlationId: string;
  readonly identityId: Types.ObjectId;
  readonly roleId: Types.ObjectId;
  readonly effectiveFrom: Date;
  readonly effectiveUntil?: Date;
}

export interface GrantPermissionCommand {
  readonly correlationId: string;
  readonly identityId: Types.ObjectId;
  readonly permissionId: Types.ObjectId;
  readonly conditions?: Record<string, unknown>;
}

export interface CreateSessionCommand {
  readonly correlationId: string;
  readonly identityId: Types.ObjectId;
  readonly deviceFingerprint: string;
  readonly ipAddress: string;
  readonly userAgent: string;
  readonly authenticationMethod: AuthenticationMethod;
}

export interface RefreshSessionCommand {
  readonly correlationId: string;
  readonly refreshToken: string;
  readonly ipAddress: string;
  readonly userAgent: string;
}

export interface RevokeSessionCommand {
  readonly correlationId: string;
  readonly sessionId: string;
  readonly reason: string;
}

export interface ValidateAccessCommand {
  readonly correlationId: string;
  readonly subject: Types.ObjectId;
  readonly resource: string;
  readonly action: string;
  readonly environment?: Record<string, unknown>;
}

// ===== QUERIES =====
export interface GetIdentityQuery {
  readonly identityId: Types.ObjectId;
}

export interface GetPermissionsQuery {
  readonly identityId: Types.ObjectId;
  readonly resource?: string;
}

export interface GetRolesQuery {
  readonly identityId: Types.ObjectId;
}

export interface GetActiveSessionsQuery {
  readonly identityId: Types.ObjectId;
}

export interface CheckAccessQuery {
  readonly subject: Types.ObjectId;
  readonly resource: string;
  readonly action: string;
  readonly environment?: Record<string, unknown>;
}

export interface GetAccessHistoryQuery {
  readonly identityId: Types.ObjectId;
  readonly from: Date;
  readonly to: Date;
  readonly limit?: number;
}

// ===== READ MODELS =====
export interface IdentityProfileReadModel {
  readonly id: Types.ObjectId;
  readonly username: string;
  readonly email: string;
  readonly status: IdentityStatus;
  readonly lastLoginAt?: Date;
  readonly emailVerified: boolean;
  readonly mfaEnabled: boolean;
  readonly roles: string[];
  readonly permissions: string[];
  readonly activeSessions: number;
}

export interface AccessControlDashboardReadModel {
  readonly identityId: Types.ObjectId;
  readonly accessLevel: AccessLevel;
  readonly roles: RoleHierarchyItem[];
  readonly permissions: PermissionItem[];
  readonly restrictions: string[];
  readonly lastAccess: Date;
}

export interface RoleHierarchyItem {
  readonly id: Types.ObjectId;
  readonly name: string;
  readonly level: number;
  readonly isInherited: boolean;
}

export interface PermissionItem {
  readonly id: Types.ObjectId;
  readonly name: string;
  readonly resource: string;
  readonly action: string;
  readonly source: 'direct' | 'role';
}

export interface ActiveSessionsReadModel {
  readonly identityId: Types.ObjectId;
  readonly sessions: SessionItem[];
  readonly totalSessions: number;
  readonly suspiciousSessions: number;
}

export interface SessionItem {
  readonly sessionId: string;
  readonly deviceType: DeviceType;
  readonly ipAddress: string;
  readonly lastAccess: Date;
  readonly riskScore: number;
  readonly location?: string;
}

export interface SecurityAuditReadModel {
  readonly identityId: Types.ObjectId;
  readonly events: AuditEventItem[];
  readonly riskScore: number;
  readonly alerts: SecurityAlert[];
}

export interface AuditEventItem {
  readonly type: EventType;
  readonly timestamp: Date;
  readonly success: boolean;
  readonly riskLevel: RiskLevel;
  readonly details: string;
}

export interface SecurityAlert {
  readonly type: string;
  readonly severity: RiskLevel;
  readonly message: string;
  readonly timestamp: Date;
}

export { RiskLevel, EventType, PolicyDecision, SessionStatus, AuthenticationMethod, IdentityStatus, AccessLevel, DeviceType };
