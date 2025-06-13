import { json } from '@solidjs/router';
import { APIEvent } from '@solidjs/start/server';
import { createId } from '@paralleldrive/cuid2';
import { z } from 'zod';

// Simple validation schemas
const logRequestSchema = z.object({
  actor: z.string().min(1).max(50),
  action: z.string().min(1).max(50),
  scope: z.string().min(1).max(50),
  target: z.string().min(1).max(50),
  severityType: z.enum(['debug', 'info', 'warn', 'error', 'audit', 'lifecycle']),
  severityLevel: z.enum(['negligeable', 'lowest', 'low', 'medium', 'high', 'highest', 'critical']).optional(),
  message: z.string().min(1).max(2000),
  context: z.record(z.any()).optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  traceId: z.string().optional(),
  parentEventId: z.string().optional(),
  sourceComponent: z.string().min(1).max(100),
  sourceFile: z.string().max(255).optional(),
  lineNumber: z.number().int().positive().optional(),
  stackTrace: z.string().optional(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().max(500).optional(),
  correlationId: z.string().optional()
});

const logSearchSchema = z.object({
  searchText: z.string().optional(),
  severityTypes: z.array(z.string()).optional(),
  severityLevels: z.array(z.string()).optional(),
  timeFrom: z.coerce.date().optional(),
  timeTo: z.coerce.date().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  traceId: z.string().optional(),
  correlationId: z.string().optional(),
  sourceComponent: z.string().optional(),
  pattern: z.string().optional(),
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0)
});

/**
 * POST /api/v1/observability/logs
 * Create a new log entry
 */
export async function POST(event: APIEvent): Promise<Response> {
  const correlationId = createId();
  
  try {
    let body: any;
    
    try {
      body = await event.request.json();
    } catch (jsonError) {
      console.error(`Invalid JSON format [${correlationId}]:`, jsonError);
      return json({
        success: false,
        error: 'Invalid JSON format',
        correlationId
      }, { status: 400 });
    }

    // Validate request
    const validation = logRequestSchema.safeParse(body);
    if (!validation.success) {
      return json({
        success: false,
        error: 'Invalid log request data',
        details: validation.error.issues,
        correlationId
      }, { status: 400 });
    }

    // Create a mock log entry for now - this will be replaced with actual service call
    const logEntry = {
      id: createId(),
      pattern: `${validation.data.actor}.${validation.data.action}.${validation.data.scope}.${validation.data.target}`,
      message: validation.data.message,
      severityType: validation.data.severityType,
      severityLevel: validation.data.severityLevel ?? 'medium',
      sourceComponent: validation.data.sourceComponent,
      context: validation.data.context ?? {},
      loggedAt: new Date(),
      correlationId
    };

    return json({
      success: true,
      data: logEntry,
      timestamp: new Date(),
      correlationId
    }, { status: 201 });

  } catch (error) {
    console.error(`Log creation error [${correlationId}]:`, error);

    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      correlationId
    }, { status: 500 });
  }
}

/**
 * GET /api/v1/observability/logs
 * Search and filter logs
 */
export async function GET(event: APIEvent): Promise<Response> {
  const correlationId = createId();
  
  try {
    const url = new URL(event.request.url);

    // Parse query parameters
    const searchParams = {
      searchText: url.searchParams.get('searchText') ?? undefined,
      severityTypes: url.searchParams.get('severityTypes')?.split(',') ?? undefined,
      severityLevels: url.searchParams.get('severityLevels')?.split(',') ?? undefined,
      timeFrom: url.searchParams.get('timeFrom') ? new Date(url.searchParams.get('timeFrom')!) : undefined,
      timeTo: url.searchParams.get('timeTo') ? new Date(url.searchParams.get('timeTo')!) : undefined,
      userId: url.searchParams.get('userId') ?? undefined,
      sessionId: url.searchParams.get('sessionId') ?? undefined,
      traceId: url.searchParams.get('traceId') ?? undefined,
      correlationId: url.searchParams.get('correlationId') ?? undefined,
      sourceComponent: url.searchParams.get('sourceComponent') ?? undefined,
      pattern: url.searchParams.get('pattern') ?? undefined,
      limit: parseInt(url.searchParams.get('limit') ?? '100'),
      offset: parseInt(url.searchParams.get('offset') ?? '0')
    };

    // Validate search parameters
    const validation = logSearchSchema.safeParse(searchParams);
    if (!validation.success) {
      return json({
        success: false,
        error: 'Invalid search parameters',
        details: validation.error.issues,
        correlationId
      }, { status: 400 });
    }

    // Mock search results for now
    const searchResults = {
      results: [
        {
          id: createId(),
          message: validation.data.searchText ? `Found log matching: ${validation.data.searchText}` : 'Mock log entry',
          severityType: validation.data.severityTypes?.[0] ?? 'info',
          severityLevel: 'medium',
          sourceComponent: 'mock-component',
          loggedAt: new Date(),
          pattern: 'user.create.domain.resource'
        }
      ],
      total: 1,
      hasMore: false
    };

    return json({
      success: true,
      data: searchResults,
      correlationId
    });

  } catch (error) {
    console.error(`Log search error [${correlationId}]:`, error);

    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      correlationId
    }, { status: 500 });
  }
}