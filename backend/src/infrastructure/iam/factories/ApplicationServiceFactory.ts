
import { IdentityApplicationService } from '@/application/iam/IdentityApplicationService';
import { AccessApplicationService } from '@/application/iam/AccessApplicationService';
import { SessionApplicationService } from '@/application/iam/SessionApplicationService';
import { IAMRepositories } from './RepositoryFactory';
import { IAMAdapters } from './AdapterFactory';
import { IAMDomainServices } from './ServiceFactory';

export interface IAMApplicationServices {
  identityApplicationService: IdentityApplicationService;
  accessApplicationService: AccessApplicationService;
  sessionApplicationService: SessionApplicationService;
}

export class ApplicationServiceFactory {
  static create(
    repositories: IAMRepositories,
    adapters: IAMAdapters,
    domainServices: IAMDomainServices
  ): IAMApplicationServices {
    return {
      identityApplicationService: new IdentityApplicationService(
        repositories.identityRepository,
        adapters.passwordHasher,
        domainServices.identityManagementService,
        adapters.auditLogger
      ),

      accessApplicationService: new AccessApplicationService(
        repositories.accessControlRepository,
        repositories.roleRepository,
        repositories.permissionRepository,
        domainServices.accessControlService,
        adapters.auditLogger
      ),

      sessionApplicationService: new SessionApplicationService(
        repositories.sessionRepository,
        adapters.tokenGenerator,
        adapters.tokenValidator,
        domainServices.sessionManagementService,
        adapters.auditLogger
      )
    };
  }
}