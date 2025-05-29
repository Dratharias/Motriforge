import { EventBus } from '../events/core/EventBus';
import { IAMService } from './core/IAMService';
import { IAMEventPublisher } from './events/IAMEventPublisher';
import { IAMMiddlewareFactory, IAMMiddlewares } from './middleware/IAMMiddlewareFactory';
import { IAuthenticationService } from './middleware/AuthenticationMiddleware';
import { IPermissionRepository } from './core/interfaces';
import { AccessLogHandler, SecurityAlertHandler } from './events/IAMEventHandlers';

export interface IAMSystem {
  readonly iamService: IAMService;
  readonly eventPublisher: IAMEventPublisher;
  readonly middleware: IAMMiddlewares;
  readonly eventBus: EventBus;
}

export class IAMFactory {
  static async createSystem(
    permissionRepository: IPermissionRepository,
    authenticationService?: IAuthenticationService
  ): Promise<IAMSystem> {
    // Create event bus and handlers
    const eventBus = new EventBus(1000);
    eventBus.register(new AccessLogHandler());
    eventBus.register(new SecurityAlertHandler());

    // Create core services
    const iamService = new IAMService(permissionRepository);
    const eventPublisher = new IAMEventPublisher(eventBus);

    // Create middleware
    const middleware = IAMMiddlewareFactory.create(iamService, authenticationService);

    return {
      iamService,
      eventPublisher,
      middleware,
      eventBus
    };
  }
}

