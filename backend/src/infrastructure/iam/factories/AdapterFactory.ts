
import { JWTTokenAdapter } from '../adapters/JWTTokenAdapter';
import { BcryptPasswordAdapter } from '../adapters/BcryptPasswordAdapter';
import { SecurityAuditAdapter } from '../adapters/SecurityAuditAdapter';
import { RiskAssessmentAdapter } from '../adapters/RiskAssessmentAdapter';
import { ITokenGenerator } from '@/domain/iam/ports/ITokenGenerator';
import { ITokenValidator } from '@/domain/iam/ports/ITokenValidator';
import { IPasswordHasher } from '@/domain/iam/ports/IPasswordHasher';
import { IAuditLogger } from '@/domain/iam/ports/IAuditLogger';
import { IRiskAssessmentService } from '@/domain/iam/ports/IRiskAssessmentService';
import { AuditLogModel } from '../schemas/AuditLogSchema';

export interface IAMAdapters {
  tokenGenerator: ITokenGenerator;
  tokenValidator: ITokenValidator;
  passwordHasher: IPasswordHasher;
  auditLogger: IAuditLogger;
  riskAssessmentService: IRiskAssessmentService;
}

export interface AdapterConfig {
  jwtAccessTokenSecret: string;
  jwtRefreshTokenSecret: string;
  jwtIssuer: string;
  bcryptSaltRounds: number;
}

export class AdapterFactory {
  static create(config: AdapterConfig): IAMAdapters {
    const tokenAdapter = new JWTTokenAdapter(
      config.jwtAccessTokenSecret,
      config.jwtRefreshTokenSecret,
      config.jwtIssuer
    );

    return {
      tokenGenerator: tokenAdapter,
      tokenValidator: tokenAdapter,
      passwordHasher: new BcryptPasswordAdapter(config.bcryptSaltRounds),
      auditLogger: new SecurityAuditAdapter(AuditLogModel),
      riskAssessmentService: new RiskAssessmentAdapter()
    };
  }
}