import { IdentityApplicationService } from '../../IdentityApplicationService';
import { CreateIdentityCommand, Identity } from '@/types/iam/interfaces';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/factory/LoggerFactory';

export interface ICommandHandler<TCommand, TResult> {
  handle(command: TCommand): Promise<TResult>;
}

export class CreateIdentityCommandHandler implements ICommandHandler<CreateIdentityCommand, Identity> {
  private readonly logger = LoggerFactory.getContextualLogger('CreateIdentityCommandHandler');

  constructor(private readonly identityApplicationService: IdentityApplicationService) {}

  async handle(command: CreateIdentityCommand): Promise<Identity> {
    const contextLogger = this.logger.withCorrelationId(command.correlationId);
    
    try {
      contextLogger.info('Handling CreateIdentityCommand', {
        username: command.username,
        email: command.email
      });

      const identity = await this.identityApplicationService.createIdentity(command);

      contextLogger.info('CreateIdentityCommand handled successfully', {
        identityId: identity.id.toString()
      });

      return identity;

    } catch (error) {
      contextLogger.error('Failed to handle CreateIdentityCommand', error as Error);
      throw error;
    }
  }
}

