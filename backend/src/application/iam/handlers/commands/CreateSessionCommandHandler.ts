import { CreateSessionCommand, Session } from '@/types/iam/interfaces';
import { SessionApplicationService } from '../../SessionApplicationService';
import { ICommandHandler } from './CreateIdentityCommandHandler';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/LoggerFactory';

export class CreateSessionCommandHandler implements ICommandHandler<CreateSessionCommand, {
  session: Session;
  accessToken: string;
  refreshToken: string;
}> {
  private readonly logger = LoggerFactory.getContextualLogger('CreateSessionCommandHandler');

  constructor(private readonly sessionApplicationService: SessionApplicationService) {}

  async handle(command: CreateSessionCommand): Promise<{
    session: Session;
    accessToken: string;
    refreshToken: string;
  }> {
    const contextLogger = this.logger.withCorrelationId(command.correlationId);
    
    try {
      contextLogger.info('Handling CreateSessionCommand', {
        identityId: command.identityId.toString(),
        ipAddress: command.ipAddress
      });

      const result = await this.sessionApplicationService.createSession(command);

      contextLogger.info('CreateSessionCommand handled successfully', {
        sessionId: result.session.sessionId.value
      });

      return result;

    } catch (error) {
      contextLogger.error('Failed to handle CreateSessionCommand', error as Error);
      throw error;
    }
  }
}

