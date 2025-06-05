import type { APIEvent } from '@solidjs/start/server';
import { authConfig } from '@/config/auth';
import { DatabaseService } from '@/database/DatabaseService';
import { AuthenticationFacade } from '@/services/auth/AuthenticationFacade';
import type { RateLimitConfig, User } from '@/shared/types/auth';
import type { AuthenticatedRequest } from '@/shared/types/middleware';

let authFacade: AuthenticationFacade | undefined;

function getAuthFacade(): AuthenticationFacade {
  if (!authFacade) {
    const db = new DatabaseService();
    authFacade = new AuthenticationFacade(db);
  }
  return authFacade;
}

export function createRateLimitMiddleware(config: RateLimitConfig) {
  return (event: APIEvent) => {
    const facade = getAuthFacade();
    const clientKey = getClientKey(event);
    const result = facade.rateLimit.checkRateLimit(clientKey, config);
    
    if (!result.allowed) {
      const response = new Response('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': result.retryAfter?.toString() ?? '60',
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetTime.toISOString(),
        },
      });
      throw response;
    }

    // For SolidStart, we need to handle headers differently
    // Setting headers in response instead of event.node
    event.nativeEvent.node?.res?.setHeader?.('X-RateLimit-Limit', config.maxRequests.toString());
    event.nativeEvent.node?.res?.setHeader?.('X-RateLimit-Remaining', result.remaining.toString());
    event.nativeEvent.node?.res?.setHeader?.('X-RateLimit-Reset', result.resetTime.toISOString());
  };
}

export async function requireAuth(event: APIEvent): Promise<AuthenticatedRequest> {
  const facade = getAuthFacade();
  const authHeader = event.request.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const token = authHeader.slice(7);

  try {
    const payload = facade.jwt.verifyAccessToken(token);
    const sessionResult = await facade.session.getSession(payload.jti);
    
    if (!sessionResult) {
      throw new Response('Invalid session', { status: 401 });
    }

    await facade.session.updateLastActivity(sessionResult.id);
    
    const userResult = await getUserById(payload.sub);
    if (!userResult?.isActive) {
      throw new Response('User not found or inactive', { status: 401 });
    }

    const permissions = await facade.getUserPermissions(payload.sub);

    return {
      user: userResult,
      session: sessionResult,
      permissions,
    };
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    throw new Response('Unauthorized', { status: 401 });
  }
}

export function requirePermission(resource: string, action: string) {
  return async (event: APIEvent): Promise<AuthenticatedRequest> => {
    const authRequest = await requireAuth(event);
    const facade = getAuthFacade();
    
    const hasPermission = await facade.checkPermission(
      authRequest.user.id,
      resource,
      action
    );

    if (!hasPermission) {
      throw new Response('Forbidden', { status: 403 });
    }

    return authRequest;
  };
}

export const rateLimitAuth = createRateLimitMiddleware(authConfig.rateLimit.auth);
export const rateLimitAPI = createRateLimitMiddleware(authConfig.rateLimit.api);

function getClientKey(event: APIEvent): string {
  const forwarded = event.request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0]?.trim() : '127.0.0.1';
  return `client:${ip}`;
}

async function getUserById(id: string): Promise<User | null> {
  try {
    const db = new DatabaseService();
    const result = await db.query<{
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      date_of_birth: Date | null;
      notes: string | null;
      visibility_id: string;
      created_by: string;
      created_at: Date;
      updated_at: Date;
      last_login: Date | null;
      is_active: boolean;
    }>(`
      SELECT id, email, first_name, last_name, date_of_birth, notes,
             visibility_id, created_by, created_at, updated_at, last_login, is_active
      FROM "user"
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const user: User = {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      visibilityId: row.visibility_id,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      isActive: row.is_active,
      roles: []
    };

    if (row.date_of_birth) {
      Object.assign(user, { dateOfBirth: new Date(row.date_of_birth) });
    }
    if (row.notes) {
      Object.assign(user, { notes: row.notes });
    }
    if (row.last_login) {
      Object.assign(user, { lastLogin: new Date(row.last_login) });
    }

    return user;
  } catch (error) {
    console.error('Failed to get user by ID:', error);
    return null;
  }
}