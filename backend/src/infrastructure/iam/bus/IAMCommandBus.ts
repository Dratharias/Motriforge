import { ICommandHandler } from '@/application/iam/handlers/commands/CreateIdentityCommandHandler';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/factory/LoggerFactory';
import { CreateIdentityCommand, AssignRoleCommand, CreateSessionCommand } from '@/types/iam/interfaces';

export class IAMCommandBus {
  private readonly logger = LoggerFactory.getContextualLogger('IAMCommandBus');
  private readonly handlers = new Map<string, ICommandHandler<any, any>>();

  registerHandler<TCommand, TResult>(
    commandType: string,
    handler: ICommandHandler<TCommand, TResult>
  ): void {
    this.handlers.set(commandType, handler);
    this.logger.debug('Command handler registered', { commandType });
  }

  async dispatch<TResult>(commandType: string, command: any): Promise<TResult> {
    const contextLogger = this.logger.withData({ commandType });

    try {
      contextLogger.debug('Dispatching command');

      const handler = this.handlers.get(commandType);
      if (!handler) {
        throw new Error(`No handler registered for command type: ${commandType}`);
      }

      const result = await handler.handle(command);

      contextLogger.debug('Command dispatched successfully');
      return result;

    } catch (error) {
      contextLogger.error('Failed to dispatch command', error as Error);
      throw error;
    }
  }

  // Strongly typed dispatch methods
  async createIdentity(command: CreateIdentityCommand) {
    return this.dispatch('CreateIdentityCommand', command);
  }

  async assignRole(command: AssignRoleCommand) {
    return this.dispatch('AssignRoleCommand', command);
  }

  async createSession(command: CreateSessionCommand) {
    return this.dispatch('CreateSessionCommand', command);
  }
}

