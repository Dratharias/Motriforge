import { CheckAccessQuery } from '@/types/iam/interfaces';
import { AccessApplicationService } from '../../AccessApplicationService';
import { IQueryHandler } from './GetIdentityQueryHandler';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/LoggerFactory';

export class CheckAccessQueryHandler implements IQueryHandler<CheckAccessQuery, boolean> {
  private readonly logger = LoggerFactory.getContextualLogger('CheckAccessQueryHandler');

  constructor(private readonly accessApplicationService: AccessApplicationService) {}

  async handle(query: CheckAccessQuery): Promise<boolean> {
    try {
      this.logger.debug('Handling CheckAccessQuery', {
        subject: query.subject.toString(),
        resource: query.resource,
        action: query.action
      });

      const result = await this.accessApplicationService.checkAccess(query);

      this.logger.debug('CheckAccessQuery handled successfully', {
        hasAccess: result
      });

      return result;

    } catch (error) {
      this.logger.error('Failed to handle CheckAccessQuery', error as Error);
      throw error;
    }
  }
}

