import { APIError } from "@/shared/types/errors";
import { logger } from "@/shared/utils/logger";
import { ErrorResponse } from "@/shared/types/responses";
import { Middleware, MiddlewareContext } from "./types";

export const errorHandler = (): Middleware => {
  return async (context, next) => {
    try {
      return await next();
    } catch (error) {
      return handleError(error, context);
    }
  };
};

const handleError = (error: unknown, context: MiddlewareContext): Response => {
  const { requestId } = context;
  
  if (error instanceof APIError) {
    logger.warn("API Error occurred", {
      requestId,
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode
      }
    });

    const response: ErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        requestId,
        timestamp: new Date().toISOString()
      }
    };

    return new Response(JSON.stringify(response), {
      status: error.statusCode,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Unexpected error
  logger.error("Unexpected error occurred", {
    requestId,
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack
    } : { error }
  });

  const response: ErrorResponse = {
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
      requestId,
      timestamp: new Date().toISOString()
    }
  };

  return new Response(JSON.stringify(response), {
    status: 500,
    headers: { "Content-Type": "application/json" }
  });
};