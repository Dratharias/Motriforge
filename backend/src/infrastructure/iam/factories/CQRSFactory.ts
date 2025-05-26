
import { IAMCommandBus } from '../bus/IAMCommandBus';
import { IAMQueryBus } from '../bus/IAMQueryBus';
import { IAMEventBus } from '../bus/IAMEventBus';
import { IAMApplicationServices } from './ApplicationServiceFactory';
import { CreateIdentityCommandHandler } from '@/application/iam/handlers/commands/CreateIdentityCommandHandler';
import { AssignRoleCommandHandler } from '@/application/iam/handlers/commands/AssignRoleCommandHandler';
import { CreateSessionCommandHandler } from '@/application/iam/handlers/commands/CreateSessionCommandHandler';
import { GetIdentityQueryHandler } from '@/application/iam/handlers/queries/GetIdentityQueryHandler';
import { CheckAccessQueryHandler } from '@/application/iam/handlers/queries/CheckAccessQueryHandler';
import { IdentityCreatedEventHandler } from '../eventHandlers/IdentityCreatedEventHandler';
import { SessionCreatedEventHandler } from '../eventHandlers/SessionCreatedEventHandler';
import { AccessDeniedEventHandler } from '../eventHandlers/AccessDeniedEventHandler';
import { EventType } from '@/types/iam/enums';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/factory/LoggerFactory';

export interface IAMCQRS {
  commandBus: IAMCommandBus;
  queryBus: IAMQueryBus;
  eventBus: IAMEventBus;
}

export class CQRSFactory {
  private static readonly logger = LoggerFactory.getContextualLogger('CQRSFactory');

  static async create(applicationServices: IAMApplicationServices): Promise<IAMCQRS> {
    this.logger.debug('Creating CQRS components');

    const commandBus = new IAMCommandBus();
    const queryBus = new IAMQueryBus();
    const eventBus = new IAMEventBus();

    try {
      // Register Command Handlers
      this.logger.debug('Registering command handlers');
      commandBus.registerHandler(
        'CreateIdentityCommand',
        new CreateIdentityCommandHandler(applicationServices.identityApplicationService)
      );

      commandBus.registerHandler(
        'AssignRoleCommand',
        new AssignRoleCommandHandler(applicationServices.accessApplicationService)
      );

      commandBus.registerHandler(
        'CreateSessionCommand',
        new CreateSessionCommandHandler(applicationServices.sessionApplicationService)
      );

      // Register Query Handlers
      this.logger.debug('Registering query handlers');
      queryBus.registerHandler(
        'GetIdentityQuery',
        new GetIdentityQueryHandler(applicationServices.identityApplicationService)
      );

      queryBus.registerHandler(
        'CheckAccessQuery',
        new CheckAccessQueryHandler(applicationServices.accessApplicationService)
      );

      // Register Event Handlers
      this.logger.debug('Registering event handlers');
      eventBus.registerHandler(
        EventType.IDENTITY_CREATED,
        new IdentityCreatedEventHandler()
      );

      eventBus.registerHandler(
        EventType.SESSION_CREATED,
        new SessionCreatedEventHandler()
      );

      eventBus.registerHandler(
        EventType.ACCESS_DENIED,
        new AccessDeniedEventHandler()
      );

      this.logger.debug('CQRS components created successfully');

      return {
        commandBus,
        queryBus,
        eventBus
      };
    } catch (error) {
      this.logger.error('Failed to create CQRS components', error as Error);
      throw error;
    }
  }
}