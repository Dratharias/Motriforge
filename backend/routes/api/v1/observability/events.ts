import { json } from '@solidjs/router';
import { APIEvent } from '@solidjs/start/server';
import { db } from '~/database/connection';
import { EventService } from '~/services/observability/event-service';
import { eventRequestSchema, eventFiltersSchema } from '~/shared/types/observability-core';
import { createId } from '@paralleldrive/cuid2';

const eventService = new EventService(db);

/**
 * POST /api/v1/observability/events
 * Process a new event
 */
export async function POST(event: APIEvent): Promise<Response> {
  try {
    const body = await event.request.json();
    const correlationId = createId();

    // Validate request
    const validation = eventRequestSchema.safeParse(body);
    if (!validation.success) {
      return json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.issues,
        correlationId
      }, { status: 400 });
    }

    // Ensure severityLevel and userId are always strings
    const eventData = {
      ...validation.data,
      severityLevel: validation.data.severityLevel ?? '',
      userId: validation.data.userId ?? '',
      sessionId: validation.data.sessionId ?? '',
      traceId: validation.data.traceId ?? '',
      parentEventId: validation.data.parentEventId ?? '',
      contextData: validation.data.contextData ?? {},
      ipAddress: validation.data.ipAddress ?? '',
      userAgent: validation.data.userAgent ?? ''
    };

    // Process event
    const result = await eventService.processEvent(eventData);

    if (result.status === 'failed') {
      return json({
        success: false,
        error: 'Event processing failed',
        details: result.errorDetails,
        correlationId
      }, { status: 500 });
    }

    return json({
      success: true,
      data: result,
      timestamp: new Date(),
      correlationId
    }, { status: 201 });

  } catch (error) {
    const correlationId = createId();
    console.error(`Event processing error [${correlationId}]:`, error);

    return json({
      success: false,
      error: 'Internal server error',
      correlationId
    }, { status: 500 });
  }
}

/**
 * GET /api/v1/observability/events
 * Query events with filtering
 */
export async function GET(event: APIEvent): Promise<Response> {
  try {
    const url = new URL(event.request.url);
    const correlationId = createId();

    // Parse query parameters
    const filters = {
      userId: url.searchParams.get('userId') ?? undefined,
      sessionId: url.searchParams.get('sessionId') ?? undefined,
      traceId: url.searchParams.get('traceId') ?? undefined,
      severityType: url.searchParams.get('severityType') ?? undefined,
      severityLevel: url.searchParams.get('severityLevel') ?? undefined,
      actor: url.searchParams.get('actor') ?? undefined,
      action: url.searchParams.get('action') ?? undefined,
      scope: url.searchParams.get('scope') ?? undefined,
      target: url.searchParams.get('target') ?? undefined,
      startDate: url.searchParams.get('startDate') ? new Date(url.searchParams.get('startDate')!) : undefined,
      endDate: url.searchParams.get('endDate') ? new Date(url.searchParams.get('endDate')!) : undefined,
      status: url.searchParams.get('status') ?? undefined
    };

    const options = {
      limit: parseInt(url.searchParams.get('limit') ?? '50'),
      offset: parseInt(url.searchParams.get('offset') ?? '0'),
      orderDirection: (url.searchParams.get('orderDirection') as 'asc' | 'desc') ?? 'desc'
    };

    // Validate filters
    const filterValidation = eventFiltersSchema.safeParse(filters);
    if (!filterValidation.success) {
      return json({
        success: false,
        error: 'Invalid filter parameters',
        details: filterValidation.error.issues,
        correlationId
      }, { status: 400 });
    }

    // Handle special cases
    if (filters.traceId) {
      const events = await eventService.getEventsByTrace(filters.traceId);
      return json({
        success: true,
        data: {
          events,
          total: events.length,
          limit: options.limit,
          offset: options.offset
        },
        correlationId
      });
    }

    if (filters.actor && filters.action && filters.scope && filters.target) {
      const events = await eventService.getEventsByPattern(
        filters.actor,
        filters.action,
        filters.scope,
        filters.target,
        options
      );
      return json({
        success: true,
        data: {
          events,
          pattern: `${filters.actor}.${filters.action}.${filters.scope}.${filters.target}`,
          limit: options.limit,
          offset: options.offset
        },
        correlationId
      });
    }

    // General query (would need to implement in EventService)
    return json({
      success: true,
      data: {
        events: [],
        total: 0,
        message: 'General event querying not yet implemented. Use traceId or complete pattern (actor.action.scope.target).'
      },
      correlationId
    });

  } catch (error) {
    const correlationId = createId();
    console.error(`Event query error [${correlationId}]:`, error);

    return json({
      success: false,
      error: 'Internal server error',
      correlationId
    }, { status: 500 });
  }
}
