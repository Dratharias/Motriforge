import { AssignRoleCommand } from '@/types/iam/interfaces';
import { AccessApplicationService } from '../../AccessApplicationService';
import { ICommandHandler } from './CreateIdentityCommandHandler';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/factory/LoggerFactory';

export class AssignRoleCommandHandler implements ICommandHandler<AssignRoleCommand, void> {
  private readonly logger = LoggerFactory.getContextualLogger('AssignRoleCommandHandler');

  constructor(private readonly accessApplicationService: AccessApplicationService) {}

  async handle(command: AssignRoleCommand): Promise<void> {
    const contextLogger = this.logger.withCorrelationId(command.correlationId);
    
    try {
      contextLogger.info('Handling AssignRoleCommand', {
        identityId: command.identityId.toString(),
        roleId: command.roleId.toString()
      });

      await this.accessApplicationService.assignRole(command);

      contextLogger.info('AssignRoleCommand handled successfully');

    } catch (error) {
      contextLogger.error('Failed to handle AssignRoleCommand', error as Error);
      throw error;
    }
  }
}

