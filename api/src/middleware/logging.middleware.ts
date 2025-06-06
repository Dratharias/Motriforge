import { logger } from "@/shared/utils/logger"
import { randomUUID } from "crypto"
import { Middleware } from "./types"

export const loggingMiddleware = (): Middleware => {
  return async (context, next) => {
    const requestId = randomUUID()
    const startTime = Date.now()
    const { request } = context

    // Add request ID and start time to context
    Object.defineProperty(context, "requestId", {
      value: requestId,
      writable: false,
      enumerable: true
    })

    Object.defineProperty(context, "startTime", {
      value: startTime,
      writable: false,
      enumerable: true
    })

    logger.info("Request started", {
      requestId,
      method: request.method,
      url: request.url,
      userAgent: request.headers.get("User-Agent"),
      ip: request.headers.get("X-Forwarded-For") ?? "unknown"
    })

    try {
      const response = await next()
      const duration = Date.now() - startTime

      logger.info("Request completed", {
        requestId,
        status: response.status,
        duration
      })

      // Add request ID to response headers
      response.headers.set("X-Request-ID", requestId)
      
      return response
    } catch (error) {
      const duration = Date.now() - startTime
      
      logger.error("Request failed", {
        requestId,
        duration,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : { error }
      })

      throw error
    }
  }
}