import { IIAMService } from '../core/interfaces';
import { AuthenticationMiddleware, IAuthenticationService } from './AuthenticationMiddleware';
import { AuthorizationMiddleware } from './AuthorizationMiddleware';

export interface IAMMiddlewares {
  auth: AuthenticationMiddleware;
  authz: AuthorizationMiddleware;
}

export class IAMMiddlewareFactory {
  static create(
    iamService: IIAMService,
    authService?: IAuthenticationService
  ): IAMMiddlewares {
    return {
      auth: new AuthenticationMiddleware(authService),
      authz: new AuthorizationMiddleware(iamService)
    };
  }
}