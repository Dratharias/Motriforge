import { json } from '@solidjs/router';
import type { APIEvent } from '@solidjs/start/server';
import type { UserCredentials } from '@/shared/types/auth';
import { AuthenticationFacade } from '@/services/auth/AuthenticationFacade';
import { DatabaseService } from '@/database/DatabaseService';
import { rateLimitAuth } from '@/middleware/auth';

export async function POST(event: APIEvent) {
  // Apply rate limiting
  rateLimitAuth(event);

  try {
    const body = await event.requeston() as UserCredentials;

    // Basic validation
    if (!body.email || !body.password) {
      return json({ error: 'Email and password are required' }, { status: 400 });
    }

    const db = new DatabaseService();
    const authFacade = new AuthenticationFacade(db);

    const userAgent = event.request.headers.get('User-Agent') ?? undefined;
    const forwarded = event.request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : undefined;

    const result = await authFacade.login(body, userAgent, ipAddress);

    if (!result.success) {
      return json({ error: result.error }, { status: 401 });
    }

    return json({
      user: {
        id: result.user!.id,
        email: result.user!.email,
        firstName: result.user!.firstName,
        lastName: result.user!.lastName,
        lastLogin: result.user!.lastLogin,
      },
      tokens: result.tokens,
    });
  } catch (error) {
    console.error('Login error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}