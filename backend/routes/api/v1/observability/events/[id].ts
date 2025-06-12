import { json } from '@solidjs/router';
import { APIEvent } from '@solidjs/start/server';
import { db } from '~/database/connection';
import { EventService } from '~/services/observability/event-service';
import { createId } from '@paralleldrive/cuid2';

const eventService = new EventService(db);

/**
 * GET /api/v1/observability/events/[id]/children
 * Get child events for event hierarchy
 */
export async function GET(event: APIEvent): Promise<Response> {
  try {
    const url = new URL(event.request.url);
    const correlationId = createId();
    
    // Extract event ID from path
    const pathParts = url.pathname.split('/');
    const eventId = pathParts[pathParts.length - 2]; // -1 is 'children', -2 is the ID

    if (!eventId) {
      return json({
        success: false,
        error: 'Event ID required',
        correlationId
      }, { status: 400 });
    }

    const childEvents = await eventService.getChildEvents(eventId);

    return json({
      success: true,
      data: {
        parentEventId: eventId,
        childEvents,
        count: childEvents.length
      },
      correlationId
    });

  } catch (error) {
    const correlationId = createId();
    console.error(`Child events query error [${correlationId}]:`, error);
    
    return json({
      success: false,
      error: 'Internal server error',
      correlationId
    }, { status: 500 });
  }
}