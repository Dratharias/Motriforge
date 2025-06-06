export interface BaseResponse {
  readonly success: boolean;
  readonly timestamp?: string;
  readonly requestId?: string;
}

export interface SuccessResponse<T = unknown> extends BaseResponse {
  readonly success: true;
  readonly data: T;
}

export interface ErrorResponse extends BaseResponse {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, unknown>;
    readonly requestId?: string;
    readonly timestamp: string;
  };
}

export interface PaginatedResponse<T = unknown> extends SuccessResponse<T[]> {
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
    readonly hasNext: boolean;
    readonly hasPrev: boolean;
  };
}

export type APIResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;