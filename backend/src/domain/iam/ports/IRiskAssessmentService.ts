import { Types } from 'mongoose';
import { RiskLevel } from '@/types/iam/interfaces';

export interface IRiskAssessmentService {
  assessLoginRisk(
    identityId: Types.ObjectId,
    ipAddress: string,
    deviceFingerprint: string,
    userAgent: string
  ): Promise<{
    riskScore: number;
    riskLevel: RiskLevel;
    factors: string[];
  }>;
  
  assessSessionRisk(
    sessionId: string,
    activities: Record<string, unknown>[]
  ): Promise<{
    riskScore: number;
    riskLevel: RiskLevel;
    recommendations: string[];
  }>;
}

