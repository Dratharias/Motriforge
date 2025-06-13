// backend/services/observability/index.ts
export { AuditService } from './audit/audit-service';
export type { AuditRequest, AuditEntry, AuditType, AuditConfig } from './audit/audit-service';

// Export other observability services when they exist
// export { LoggingService } from './logging/logging-service';
// export { ErrorService } from './error/error-service';
// export { LifecycleService } from './lifecycle/lifecycle-service';