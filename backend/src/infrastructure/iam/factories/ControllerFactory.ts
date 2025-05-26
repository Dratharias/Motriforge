
import { IdentityController } from '@/presentation/iam/controllers/IdentityController';
import { SessionController } from '@/presentation/iam/controllers/SessionController';
import { AccessController } from '@/presentation/iam/controllers/AccessController';
import { AuthenticationMiddleware } from '@/presentation/iam/middleware/AuthenticationMiddleware';
import { IAMApplicationServices } from './ApplicationServiceFactory';
import { IAMCQRS } from './CQRSFactory';
import { IAMAdapters } from './AdapterFactory';

export interface IAMControllers {
  identityController: IdentityController;
  sessionController: SessionController;
  accessController: AccessController;
  authenticationMiddleware: AuthenticationMiddleware;
}

export class ControllerFactory {
  static create(
    applicationServices: IAMApplicationServices,
    cqrs: IAMCQRS,
    adapters: IAMAdapters
  ): IAMControllers {
    return {
      identityController: new IdentityController(
        applicationServices.identityApplicationService,
        cqrs.commandBus,
        cqrs.queryBus
      ),

      sessionController: new SessionController(
        applicationServices.sessionApplicationService,
        cqrs.commandBus,
        cqrs.queryBus
      ),

      accessController: new AccessController(
        applicationServices.accessApplicationService,
        cqrs.commandBus,
        cqrs.queryBus
      ),

      authenticationMiddleware: new AuthenticationMiddleware(
        adapters.tokenValidator,
        applicationServices.sessionApplicationService
      )
    };
  }
}