export enum IdentityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  LOCKED = 'locked',
  PENDING_VERIFICATION = 'pending_verification'
}

export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  TERMINATED = 'terminated',
  SUSPENDED = 'suspended'
}

export enum AccessLevel {
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

export enum AuthenticationMethod {
  PASSWORD = 'password',
  OAUTH2 = 'oauth2',
  SAML = 'saml',
  LDAP = 'ldap',
  BIOMETRIC = 'biometric',
  MFA = 'mfa'
}

export enum DeviceType {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  TABLET = 'tablet',
  API_CLIENT = 'api_client'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum PolicyDecision {
  PERMIT = 'permit',
  DENY = 'deny',
  NOT_APPLICABLE = 'not_applicable',
  INDETERMINATE = 'indeterminate'
}

export enum EventType {
  IDENTITY_CREATED = 'identity_created',
  IDENTITY_UPDATED = 'identity_updated',
  ROLE_ASSIGNED = 'role_assigned',
  PERMISSION_GRANTED = 'permission_granted',
  SESSION_CREATED = 'session_created',
  SESSION_EXPIRED = 'session_expired',
  ACCESS_GRANTED = 'access_granted',
  ACCESS_DENIED = 'access_denied',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  LOGIN_ATTEMPT = 'login_attempt'
}

