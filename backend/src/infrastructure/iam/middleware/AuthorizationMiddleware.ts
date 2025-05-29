import { Context, Next, MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { Types } from 'mongoose';
import { IIAMService } from '../core/interfaces';
import { Role, ResourceType, Action } from '../../../types/core/enums';
import { IAMContext } from './types';

export class AuthorizationMiddleware {
  constructor(private readonly iamService: IIAMService) {}

  requireRole(role: Role): MiddlewareHandler {
    return async (c: Context, next: Next) => {
      const iamContext = c.get('iamContext');
      
      if (!iamContext?.user) {
        throw new HTTPException(401, { message: 'Authentication required' });
      }

      if (iamContext.user.role !== role && iamContext.user.role !== Role.ADMIN) {
        throw new HTTPException(403, { message: `Required role: ${role}` });
      }

      await next();
    };
  }

  requirePermission(resource: ResourceType, action: Action): MiddlewareHandler {
    return async (c: Context, next: Next) => {
      const iamContext = c.get('iamContext');
      
      if (!iamContext?.user) {
        throw new HTTPException(401, { message: 'Authentication required' });
      }

      const hasAccess = await this.iamService.canAccess(
        iamContext.user,
        resource,
        action,
        { organizationId: iamContext.organizationId }
      );

      if (!hasAccess) {
        throw new HTTPException(403, { message: `Access denied for ${action} on ${resource}` });
      }

      await next();
    };
  }

  requireAnyPermission(permissions: Array<{ resource: ResourceType; action: Action }>): MiddlewareHandler {
    return async (c: Context, next: Next) => {
      const iamContext = c.get('iamContext');
      
      if (!iamContext?.user) {
        throw new HTTPException(401, { message: 'Authentication required' });
      }

      for (const { resource, action } of permissions) {
        const hasAccess = await this.iamService.canAccess(
          iamContext.user,
          resource,
          action,
          { organizationId: iamContext.organizationId }
        );

        if (hasAccess) {
          await next();
          return;
        }
      }

      throw new HTTPException(403, { message: 'Access denied - insufficient permissions' });
    };
  }

  extractOrganization(): MiddlewareHandler {
    return async (c: Context, next: Next) => {
      const iamContext = c.get('iamContext');
      if (!iamContext) {
        await next();
        return;
      }

      const orgHeader = c.req.header('X-Organization-ID');
      const pathOrgId = this.extractOrgFromPath(c);
      
      let organizationId = iamContext.organizationId;
      
      if (pathOrgId) {
        organizationId = pathOrgId;
      } else if (orgHeader && Types.ObjectId.isValid(orgHeader)) {
        organizationId = new Types.ObjectId(orgHeader);
      }

      // Validate organization access
      if (organizationId && iamContext.user && !iamContext.user.organization.equals(organizationId)) {
        throw new HTTPException(403, { message: 'Cross-organization access denied' });
      }

      c.set('iamContext', { ...iamContext, organizationId });
      await next();
    };
  }

  private extractOrgFromPath(c: Context): Types.ObjectId | undefined {
    const pathMatch = RegExp(/\/orgs\/([a-f0-9]{24})/).exec(c.req.path);
    return pathMatch ? new Types.ObjectId(pathMatch[1]) : undefined;
  }
}

