import { Types } from 'mongoose';
import { EventType, RiskLevel } from '@/types/iam/interfaces';

export interface IAuditLogger {
  logSecurityEvent(
    type: EventType,
    identityId: Types.ObjectId | null,
    details: Record<string, unknown>,
    riskLevel: RiskLevel
  ): Promise<void>;
  
  logAccessAttempt(
    identityId: Types.ObjectId | null,
    success: boolean,
    ipAddress: string,
    userAgent: string,
    details: Record<string, unknown>
  ): Promise<void>;
  
  logDataChange(
    identityId: Types.ObjectId,
    entityType: string,
    entityId: string,
    changes: Record<string, unknown>
  ): Promise<void>;
}

