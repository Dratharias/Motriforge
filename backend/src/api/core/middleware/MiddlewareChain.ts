import type { Middleware, RequestContext, NextFunction } from '@/shared/types/api';
import { Logger } from '@/utils/Logger';

export class MiddlewareChain {
  private readonly middlewares: Middleware[] = [];
  private readonly logger: Logger;

  constructor() {
    this.logger = new Logger('MiddlewareChain');
  }

  public use(middleware: Middleware): void {
    this.middlewares.push(middleware);
    this.logger.debug(`Middleware registered: ${middleware.constructor.name}`);
  }

  public async execute(context: RequestContext): Promise<void> {
    let index = 0;

    const next: NextFunction = async () => {
      if (index >= this.middlewares.length) {
        return;
      }

      const middleware = this.middlewares[index++];
      if (!middleware) {
        return;
      }

      try {
        await middleware.execute(context, next);
      } catch (error) {
        this.logger.error(`Middleware error in ${middleware.constructor.name}`, error);
        throw error;
      }
    };

    await next();
  }

  public compose(): (context: RequestContext) => Promise<void> {
    return async (context: RequestContext) => {
      await this.execute(context);
    };
  }
}