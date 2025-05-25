import { GetIdentityQuery, IdentityProfileReadModel } from '@/types/iam/interfaces';
import { IdentityApplicationService } from '../../IdentityApplicationService';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/LoggerFactory';

export interface IQueryHandler<TQuery, TResult> {
  handle(query: TQuery): Promise<TResult>;
}

export class GetIdentityQueryHandler implements IQueryHandler<GetIdentityQuery, IdentityProfileReadModel | null> {
  private readonly logger = LoggerFactory.getContextualLogger('GetIdentityQueryHandler');

  constructor(private readonly identityApplicationService: IdentityApplicationService) {}

  async handle(query: GetIdentityQuery): Promise<IdentityProfileReadModel | null> {
    try {
      this.logger.debug('Handling GetIdentityQuery', {
        identityId: query.identityId.toString()
      });

      const result = await this.identityApplicationService.getIdentity(query);

      this.logger.debug('GetIdentityQuery handled successfully', {
        found: result !== null
      });

      return result;

    } catch (error) {
      this.logger.error('Failed to handle GetIdentityQuery', error as Error);
      throw error;
    }
  }
}

