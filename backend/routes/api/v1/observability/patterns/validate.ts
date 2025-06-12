import { json } from '@solidjs/router';
import { APIEvent } from '@solidjs/start/server';
import { db } from '~/database/connection';
import { EventService } from '~/services/observability/event-service';
import { actorActionPatternSchema } from '~/shared/types/observability-core';
import { createId } from '@paralleldrive/cuid2';

const eventService = new EventService(db);

/**
 * POST /api/v1/observability/patterns/validate
 * Validate Actor.Action.Scope.Target pattern
 */
export async function POST(event: APIEvent): Promise<Response> {
  try {
    const body = await event.request.json();
    const correlationId = createId();

    // Validate request
    const validation = actorActionPatternSchema.safeParse(body);
    if (!validation.success) {
      return json({
        success: false,
        error: 'Invalid pattern data',
        details: validation.error.issues,
        correlationId
      }, { status: 400 });
    }

    const { actor, action, scope, target } = validation.data;
    const isValid = await eventService.validatePattern(actor, action, scope, target);
    const pattern = `${actor}.${action}.${scope}.${target}`;

    return json({
      success: true,
      data: {
        pattern,
        isValid,
        components: {
          actor: { name: actor, valid: true }, // Would need individual validation
          action: { name: action, valid: true },
          scope: { name: scope, valid: true },
          target: { name: target, valid: true }
        }
      },
      correlationId
    });

  } catch (error) {
    const correlationId = createId();
    console.error(`Pattern validation error [${correlationId}]:`, error);
    
    return json({
      success: false,
      error: 'Internal server error',
      correlationId
    }, { status: 500 });
  }
}