import { json } from '@solidjs/router';
import { APIEvent } from '@solidjs/start/server';
import { db } from '~/database/connection';
import { AuditService } from '~/services/observability/audit/audit-service';
import { EventBus } from '~/shared/event-bus/event-bus';
import { createId } from '@paralleldrive/cuid2';
import { z } from 'zod';

// Updated validation schema to match the simplified audit service
const auditRequestSchema = z.object({
  entityType: z.string().min(1).max(100),
  entityId: z.string().min(1),
  action: z.string().min(1).max(50),
  oldValues: z.record(z.any()).optional(),
  newValues: z.record(z.any()).optional(),
  reason: z.string().max(500).optional(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().max(500).optional(),
  createdBy: z.string().min(1),
  // Additional context fields (not stored in DB but used for events)
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  traceId: z.string().optional()
});

const auditSearchSchema = z.object({
  entityType: z.string().optional(),
  action: z.string().optional(),
  createdBy: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0)
});

// Initialize audit service
const auditConfig = {
  enableRiskAssessment: true,
  riskThresholds: {
    low: 30,
    medium: 70,
    high: 100
  },
  retentionYears: 7,
  complianceRules: {
    gdpr: true,
    hipaa: false
  },
  enableRealTimeAlerts: true
};

const eventBus = new EventBus();
const auditService = new AuditService(db, eventBus, auditConfig);

/**
 * POST /api/v1/observability/audit
 * Create a new audit entry
 */
export async function POST(event: APIEvent): Promise<Response> {
  const correlationId = createId();
  
  try {
    const requestBody = await event.request.json();
    
    // Validate request body
    const validation = auditRequestSchema.safeParse(requestBody);
    if (!validation.success) {
      return json({
        success: false,
        error: 'Invalid audit request data',
        details: validation.error.issues,
        correlationId
      }, { status: 400 });
    }

    // Create audit entry
    const auditEntry = await auditService.audit(validation.data);

    return json({
      success: true,
      data: {
        id: auditEntry.id,
        entityType: auditEntry.entityType,
        entityId: auditEntry.entityId,
        action: auditEntry.action,
        oldValues: auditEntry.oldValues,
        newValues: auditEntry.newValues,
        reason: auditEntry.reason,
        ipAddress: auditEntry.ipAddress,
        userAgent: auditEntry.userAgent,
        createdBy: auditEntry.createdBy,
        createdAt: auditEntry.createdAt,
        isActive: auditEntry.isActive
      },
      correlationId
    }, { status: 201 });

  } catch (error) {
    console.error(`Audit creation error [${correlationId}]:`, error);

    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      correlationId
    }, { status: 500 });
  }
}

/**
 * GET /api/v1/observability/audit
 * Search and filter audit entries
 */
export async function GET(event: APIEvent): Promise<Response> {
  const correlationId = createId();
  
  try {
    const url = new URL(event.request.url);

    // Parse query parameters
    const searchParams = {
      entityType: url.searchParams.get('entityType') ?? undefined,
      action: url.searchParams.get('action') ?? undefined,
      createdBy: url.searchParams.get('createdBy') ?? undefined,
      startDate: url.searchParams.get('startDate') ? new Date(url.searchParams.get('startDate')!) : undefined,
      endDate: url.searchParams.get('endDate') ? new Date(url.searchParams.get('endDate')!) : undefined,
      limit: parseInt(url.searchParams.get('limit') ?? '100'),
      offset: parseInt(url.searchParams.get('offset') ?? '0')
    };

    // Validate search parameters
    const validation = auditSearchSchema.safeParse(searchParams);
    if (!validation.success) {
      return json({
        success: false,
        error: 'Invalid search parameters',
        details: validation.error.issues,
        correlationId
      }, { status: 400 });
    }

    // Search audit entries with proper type handling
    const searchFilters = {
      entityType: validation.data.entityType,
      action: validation.data.action,
      createdBy: validation.data.createdBy,
      startDate: validation.data.startDate,
      endDate: validation.data.endDate,
      limit: validation.data.limit,
      offset: validation.data.offset
    };

    const results = await auditService.searchAuditEntries(searchFilters);

    return json({
      success: true,
      data: {
        results: results.results,
        total: results.total,
        hasMore: results.hasMore,
        offset: validation.data.offset,
        limit: validation.data.limit
      },
      correlationId
    });

  } catch (error) {
    console.error(`Audit search error [${correlationId}]:`, error);

    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      correlationId
    }, { status: 500 });
  }
}

/**
 * POST /api/v1/observability/audit/security
 * Convenience endpoint for security audits
 */
export async function POST_security(event: APIEvent): Promise<Response> {
  const correlationId = createId();
  
  try {
    const requestBody = await event.request.json();
    
    // Add default action for security audits if not provided
    const securityRequest = {
      action: 'security_event',
      ...requestBody
    };
    
    const validation = auditRequestSchema.safeParse(securityRequest);
    if (!validation.success) {
      return json({
        success: false,
        error: 'Invalid security audit request data',
        details: validation.error.issues,
        correlationId
      }, { status: 400 });
    }

    const auditEntry = await auditService.auditSecurity(validation.data);

    return json({
      success: true,
      data: auditEntry,
      correlationId
    }, { status: 201 });

  } catch (error) {
    console.error(`Security audit creation error [${correlationId}]:`, error);

    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      correlationId
    }, { status: 500 });
  }
}

/**
 * POST /api/v1/observability/audit/compliance
 * Convenience endpoint for compliance audits
 */
export async function POST_compliance(event: APIEvent): Promise<Response> {
  const correlationId = createId();
  
  try {
    const requestBody = await event.request.json();
    
    // Add default action for compliance audits if not provided
    const complianceRequest = {
      action: 'compliance_event',
      ...requestBody
    };
    
    const validation = auditRequestSchema.safeParse(complianceRequest);
    if (!validation.success) {
      return json({
        success: false,
        error: 'Invalid compliance audit request data',
        details: validation.error.issues,
        correlationId
      }, { status: 400 });
    }

    const auditEntry = await auditService.auditCompliance(validation.data);

    return json({
      success: true,
      data: auditEntry,
      correlationId
    }, { status: 201 });

  } catch (error) {
    console.error(`Compliance audit creation error [${correlationId}]:`, error);

    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      correlationId
    }, { status: 500 });
  }
}

/**
 * POST /api/v1/observability/audit/financial
 * Convenience endpoint for financial audits
 */
export async function POST_financial(event: APIEvent): Promise<Response> {
  const correlationId = createId();
  
  try {
    const requestBody = await event.request.json();
    
    // Add default action for financial audits if not provided
    const financialRequest = {
      action: 'financial_event',
      ...requestBody
    };
    
    const validation = auditRequestSchema.safeParse(financialRequest);
    if (!validation.success) {
      return json({
        success: false,
        error: 'Invalid financial audit request data',
        details: validation.error.issues,
        correlationId
      }, { status: 400 });
    }

    const auditEntry = await auditService.auditFinancial(validation.data);

    return json({
      success: true,
      data: auditEntry,
      correlationId
    }, { status: 201 });

  } catch (error) {
    console.error(`Financial audit creation error [${correlationId}]:`, error);

    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      correlationId
    }, { status: 500 });
  }
}