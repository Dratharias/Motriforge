import { json } from '@solidjs/router';
import type { APIEvent } from '@solidjs/start/server';
import { AuthenticationFacade } from '@/services/auth/AuthenticationFacade.js';
import { DatabaseService } from '@/database/DatabaseService.js';
import { rateLimitAuth } from '@/middleware/auth.js';

export async function POST(event: APIEvent) {
  // Apply rate limiting
  rateLimitAuth(event);

  try {
    const body = await event.request.json() as { refreshToken: string };

    if (!body.refreshToken) {
      return json({ error: 'Refresh token is required' }, { status: 400 });
    }

    const db = new DatabaseService();
    const authFacade = new AuthenticationFacade(db);

    const result = await authFacade.refreshToken(body.refreshToken);

    if (!result.success) {
      return json({ error: result.error }, { status: 401 });
    }

    return json({
      tokens: result.tokens,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}