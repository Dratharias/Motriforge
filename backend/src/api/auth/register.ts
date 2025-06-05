import { json } from '@solidjs/router';
import type { APIEvent } from '@solidjs/start/server';
import type { UserRegistration } from '@/shared/types/auth.js';
import { AuthenticationFacade } from '@/services/auth/AuthenticationFacade.js';
import { DatabaseService } from '@/database/DatabaseService.js';
import { rateLimitAuth } from '@/middleware/auth.js';

export async function POST(event: APIEvent) {
  // Apply rate limiting
  rateLimitAuth(event);

  try {
    const body = await event.request.json() as UserRegistration;

    // Basic validation
    if (!body.email || !body.password || !body.firstName || !body.lastName) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = new DatabaseService();
    const authFacade = new AuthenticationFacade(db);

    // For now, use a default visibility ID - in a real app, this would be properly managed
    const defaultVisibilityId = '00000000-0000-0000-0000-000000000001';

    const result = await authFacade.register(body, defaultVisibilityId);

    if (!result.success) {
      return json({ error: result.error }, { status: 400 });
    }

    return json({
      user: {
        id: result.user!.id,
        email: result.user!.email,
        firstName: result.user!.firstName,
        lastName: result.user!.lastName,
      },
      tokens: result.tokens,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
