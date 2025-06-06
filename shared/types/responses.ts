/**
 * Base response interface for all API responses
 */
export interface BaseResponse {
  readonly success: boolean
  readonly timestamp?: string
  readonly requestId?: string
}

/**
 * Success response with data payload
 */
export interface SuccessResponse<T = unknown> extends BaseResponse {
  readonly success: true
  readonly data: T
}

/**
 * Error response with error details
 */
export interface ErrorResponse extends BaseResponse {
  readonly success: false
  readonly error: {
    readonly code: string
    readonly message: string
    readonly requestId?: string
    readonly timestamp: string
    readonly details?: Record<string, unknown>
  }
}

/**
 * Paginated response for list endpoints
 */
export interface PaginatedResponse<T = unknown> extends SuccessResponse<T[]> {
  readonly pagination: {
    readonly page: number
    readonly limit: number
    readonly total: number
    readonly totalPages: number
    readonly hasNextPage: boolean
    readonly hasPreviousPage: boolean
  }
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  readonly status: 'healthy' | 'unhealthy' | 'degraded'
  readonly timestamp: string
  readonly uptime: number
  readonly version: string
  readonly services?: {
    readonly [serviceName: string]: {
      readonly status: 'healthy' | 'unhealthy'
      readonly responseTime?: number
      readonly details?: Record<string, unknown>
    }
  }
}

/**
 * Authentication response
 */
export interface AuthResponse {
  readonly accessToken: string
  readonly refreshToken: string
  readonly expiresIn: number
  readonly tokenType: 'Bearer'
  readonly user: {
    readonly id: string
    readonly email: string
    readonly firstName: string
    readonly lastName: string
  }
}

/**
 * Create standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  requestId?: string
): SuccessResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    ...(requestId && { requestId }),
  }
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  requestId?: string,
  details?: Record<string, unknown>
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
      ...(details && { details }),
    },
    timestamp: new Date().toISOString(),
    ...(requestId && { requestId }),
  }
}

/**
 * Create standardized paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: {
    page: number
    limit: number
    total: number
  },
  requestId?: string
): PaginatedResponse<T> {
  const totalPages = Math.ceil(pagination.total / pagination.limit)
  const hasNextPage = pagination.page < totalPages
  const hasPreviousPage = pagination.page > 1

  return {
    success: true,
    data,
    pagination: {
      ...pagination,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    },
    timestamp: new Date().toISOString(),
    ...(requestId && { requestId }),
  }
}

/**
 * Validation error details
 */
export interface ValidationErrorDetail {
  readonly field: string
  readonly message: string
  readonly value?: unknown
}

/**
 * Validation error response
 */
export interface ValidationErrorResponse extends ErrorResponse {
  readonly error: {
    readonly code: 'VALIDATION_ERROR'
    readonly message: string
    readonly requestId?: string
    readonly timestamp: string
    readonly details: {
      readonly validationErrors: readonly ValidationErrorDetail[]
    }
  }
}

/**
 * Create validation error response
 */
export function createValidationErrorResponse(
  validationErrors: readonly ValidationErrorDetail[],
  requestId?: string
): ValidationErrorResponse {
  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
      details: {
        validationErrors,
      },
    },
    timestamp: new Date().toISOString(),
    ...(requestId && { requestId }),
  }
}