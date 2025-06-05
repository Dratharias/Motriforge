import { json } from '@solidjs/router';
import type { APIEvent } from '@solidjs/start/server';
import { requireAuth, rateLimitAPI } from '@/middleware/auth';

export async function GET(event: APIEvent) {
  // Apply rate limiting
  rateLimitAPI(event);

  try {
    const authRequest = await requireAuth(event);

    return json({
      user: {
        id: authRequest.user.id,
        email: authRequest.user.email,
        firstName: authRequest.user.firstName,
        lastName: authRequest.user.lastName,
        lastLogin: authRequest.user.lastLogin,
      },
      permissions: authRequest.permissions.map((p: { resource: any; action: any; }) => `${p.resource}:${p.action}`),
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Profile error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}