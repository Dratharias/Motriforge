import { Types } from 'mongoose';
import { AccessAttempt, RiskLevel } from '@/types/iam/interfaces';

export interface IAccessAttemptRepository {
  save(attempt: AccessAttempt): Promise<void>;
  findByIdentityId(identityId: Types.ObjectId, limit?: number): Promise<AccessAttempt[]>;
  findByIpAddress(ipAddress: string, since: Date): Promise<AccessAttempt[]>;
  findFailedAttempts(since: Date, limit?: number): Promise<AccessAttempt[]>;
  findByRiskLevel(riskLevel: RiskLevel, since: Date): Promise<AccessAttempt[]>;
  deleteOldAttempts(olderThan: Date): Promise<number>;
}

