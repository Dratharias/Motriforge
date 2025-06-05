import { json } from '@solidjs/router';
import type { APIEvent } from '@solidjs/start/server';
import { requireAuth } from '@/middleware/auth.js';
import { AuthenticationFacade } from '@/services/auth/AuthenticationFacade.js';
import { DatabaseService } from '@/database/DatabaseService.js';

export async function POST(event: APIEvent) {
  try {
    const authRequest = await requireAuth(event);
    
    const db = new DatabaseService();
    const authFacade = new AuthenticationFacade(db);

    const authHeader = event.request.headers.get('Authorization');
    const accessToken = authHeader?.slice(7); // Remove 'Bearer '

    await authFacade.logout(authRequest.session.id, accessToken);

    return json({ message: 'Logout successful' });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Logout error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
