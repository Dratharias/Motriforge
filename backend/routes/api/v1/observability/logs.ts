import { json } from '@solidjs/router';
import { APIEvent } from '@solidjs/start/server';
import { db } from '~/database/connection';
import { LoggingService } from '~/services/observability/logging/logging-service';
import { eventBus } from '~/shared/event-bus/event-bus';
import { createId } from '@paralleldrive/cuid2';
import { z } from 'zod';

// Validation schemas
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
  searchText: z.string().optional().or(z.undefined()),
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

// Initialize logging service
const loggingConfig = {
  maxMessageLength: 2000,
  maxContextSize: 10000,
  enableFileLogging: process.env.NODE_ENV === 'development',
  logFilePath: 'logs/application.log',
  batchSize: 100,
  flushIntervalMs: 5000,
  enableSearch: true,
  retentionDays: 90
};

const loggingService = new LoggingService(db, eventBus, loggingConfig);

/**
 * POST /api/v1/observability/logs
 * Create a new log entry
 */
export async function POST(event: APIEvent): Promise<Response> {
  try {
    const body = await event.request.json();
    const correlationId = createId();

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

    // Create log entry
    const {
      lineNumber,
      ...restData
    } = validation.data;

    const logEntry = await loggingService.log({
      ...restData,
      severityLevel: validation.data.severityLevel ?? 'medium',
      context: validation.data.context ?? {},
      userId: validation.data.userId ?? '',
      sessionId: validation.data.sessionId ?? '',
      traceId: validation.data.traceId ?? '',
      parentEventId: validation.data.parentEventId ?? '',
      sourceFile: validation.data.sourceFile ?? '',
      stackTrace: validation.data.stackTrace ?? '',
      ipAddress: validation.data.ipAddress ?? '',
      userAgent: validation.data.userAgent ?? '',
      correlationId: validation.data.correlationId ?? '',
      ...(typeof lineNumber === 'number' ? { lineNumber } : {})
    });

    return json({
      success: true,
      data: logEntry,
      timestamp: new Date(),
      correlationId
    }, { status: 201 });

  } catch (error) {
    const correlationId = createId();
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
  try {
    const url = new URL(event.request.url);
    const correlationId = createId();

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

    // Perform search
    // Ensure searchText is always a string (empty string if undefined)
    // Ensure severityTypes and severityLevels are always arrays
    const { timeFrom, timeTo, userId, sessionId, traceId, correlationId: searchCorrelationId, sourceComponent, pattern, ...rest } = validation.data;
    const searchQuery = {
      ...rest,
      searchText: validation.data.searchText ?? '',
      severityTypes: validation.data.severityTypes ?? [],
      severityLevels: validation.data.severityLevels ?? [],
      ...(timeFrom ? { timeFrom } : {}),
      ...(timeTo ? { timeTo } : {}),
      ...(userId !== undefined ? { userId } : {}),
      ...(sessionId !== undefined ? { sessionId } : {}),
      ...(traceId !== undefined ? { traceId } : {}),
      ...(searchCorrelationId !== undefined ? { correlationId: searchCorrelationId } : {}),
      ...(sourceComponent !== undefined ? { sourceComponent } : {}),
      ...(pattern !== undefined ? { pattern } : {})
    };
    const searchResults = await loggingService.searchLogs(searchQuery);

    return json({
      success: true,
      data: searchResults,
      correlationId
    });

  } catch (error) {
    const correlationId = createId();
    console.error(`Log search error [${correlationId}]:`, error);
    
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      correlationId
    }, { status: 500 });
  }
}

/**
 * GET /api/v1/observability/logs/analytics/patterns
 * Analyze log patterns for insights
 */
export async function GET_patterns(event: APIEvent): Promise<Response> {
  try {
    const url = new URL(event.request.url);
    const correlationId = createId();
    
    const hoursBack = parseInt(url.searchParams.get('hoursBack') ?? '24');
    
    if (hoursBack < 1 || hoursBack > 168) { // Max 1 week
      return json({
        success: false,
        error: 'hoursBack must be between 1 and 168',
        correlationId
      }, { status: 400 });
    }

    const patterns = await loggingService.analyzePatterns(hoursBack);

    return json({
      success: true,
      data: {
        patterns,
        analysisWindow: `${hoursBack} hours`,
        generatedAt: new Date()
      },
      correlationId
    });

  } catch (error) {
    const correlationId = createId();
    console.error(`Pattern analysis error [${correlationId}]:`, error);
    
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      correlationId
    }, { status: 500 });
  }
}

/**
 * GET /api/v1/observability/logs/trace/[traceId]
 * Get all logs for a specific trace ID
 */
export async function GET_trace(event: APIEvent): Promise<Response> {
  try {
    const url = new URL(event.request.url);
    const correlationId = createId();
    
    // Extract trace ID from path
    const pathParts = url.pathname.split('/');
    const traceId = pathParts[pathParts.length - 1];

    if (!traceId) {
      return json({
        success: false,
        error: 'Trace ID required',
        correlationId
      }, { status: 400 });
    }

    const logs = await loggingService.getLogsByTrace(traceId);

    return json({
      success: true,
      data: {
        traceId,
        logs,
        count: logs.length
      },
      correlationId
    });

  } catch (error) {
    const correlationId = createId();
    console.error(`Trace logs error [${correlationId}]:`, error);
    
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      correlationId
    }, { status: 500 });
  }
}

/**
 * GET /api/v1/observability/logs/filters
 * Get available filter options for UI
 */
export async function GET_filters(event: APIEvent): Promise<Response> {
  try {
    const correlationId = createId();
    
    const filterOptions = await loggingService.getFilterOptions();

    return json({
      success: true,
      data: filterOptions,
      correlationId
    });

  } catch (error) {
    const correlationId = createId();
    console.error(`Filter options error [${correlationId}]:`, error);
    
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      correlationId
    }, { status: 500 });
  }
}

/**
 * POST /api/v1/observability/logs/quick
 * Quick logging with automatic pattern detection
 */
export async function POST_quick(event: APIEvent): Promise<Response> {
  try {
    const body = await event.request.json();
    const correlationId = createId();

    const quickLogSchema = z.object({
      source: z.string().min(1).max(100),
      action: z.string().min(1).max(50),
      severityType: z.enum(['debug', 'info', 'warn', 'error']),
      message: z.string().min(1).max(2000),
      context: z.record(z.any()).optional(),
      userId: z.string().optional(),
      sessionId: z.string().optional(),
      traceId: z.string().optional()
    });

    const validation = quickLogSchema.safeParse(body);
    if (!validation.success) {
      return json({
        success: false,
        error: 'Invalid quick log request',
        details: validation.error.issues,
        correlationId
      }, { status: 400 });
    }

    const logEntry = await loggingService.logFromSource(
      validation.data.source,
      validation.data.action,
      validation.data.severityType,
      validation.data.message,
      validation.data.context
    );

    return json({
      success: true,
      data: logEntry,
      timestamp: new Date(),
      correlationId
    }, { status: 201 });

  } catch (error) {
    const correlationId = createId();
    console.error(`Quick log error [${correlationId}]:`, error);
    
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      correlationId
    }, { status: 500 });
  }
}