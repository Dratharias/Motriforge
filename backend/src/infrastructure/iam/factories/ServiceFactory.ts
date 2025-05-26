
import { IdentityManagementService } from '@/domain/iam/services/IdentityManagementService';
import { AccessControlService } from '@/domain/iam/services/AccessControlService';
import { SessionManagementService } from '@/domain/iam/services/SessionManagementService';
import { IAMRepositories } from './RepositoryFactory';
import { IAMAdapters } from './AdapterFactory';

export interface IAMDomainServices {
  identityManagementService: IdentityManagementService;
  accessControlService: AccessControlService;
  sessionManagementService: SessionManagementService;
}

export class ServiceFactory {
  static create(
    repositories: IAMRepositories,
    adapters: IAMAdapters
  ): IAMDomainServices {
    return {
      identityManagementService: new IdentityManagementService(
        repositories.identityRepository,
        adapters.passwordHasher,
        adapters.auditLogger
      ),

      accessControlService: new AccessControlService(
        repositories.accessControlRepository,
        repositories.roleRepository,
        repositories.permissionRepository,
        adapters.auditLogger
      ),

      sessionManagementService: new SessionManagementService(
        repositories.sessionRepository,
        repositories.deviceRepository,
        adapters.riskAssessmentService,
        adapters.auditLogger
      )
    };
  }
}