import { json } from '@solidjs/router';
import type { APIEvent } from '@solidjs/start/server';
import { requireAuth, rateLimitAuth } from '@/middleware/auth';
import { AuthenticationFacade } from '@/services/auth/AuthenticationFacade';
import { DatabaseService } from '@/database/DatabaseService';

export async function POST(event: APIEvent) {
  // Apply rate limiting
  rateLimitAuth(event);

  try {
    const authRequest = await requireAuth(event);
    const body = await event.requeston() as { 
      oldPassword: string; 
      newPassword: string; 
    };

    if (!body.oldPassword || !body.newPassword) {
      return json({ error: 'Old password and new password are required' }, { status: 400 });
    }

    const db = new DatabaseService();
    const authFacade = new AuthenticationFacade(db);

    const result = await authFacade.changePassword(
      authRequest.user.id,
      body.oldPassword,
      body.newPassword
    );

    if (!result.success) {
      return json({ error: result.error }, { status: 400 });
    }

    return json({ message: 'Password changed successfully' });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Change password error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}