import { z } from "zod"
import { APIError } from "@/shared/types/errors"
import { Middleware, MiddlewareContext, ValidationUtils } from "./types"

export const validationMiddleware = (): Middleware => {
  return async (context, next) => {
    const { request } = context

    // Add validation utilities to context
    Object.defineProperty(context, "validate", {
      value: createValidationUtils(request, context),
      writable: false,
      enumerable: true
    })

    return next()
  }
}

const createValidationUtils = (request: Request, context: MiddlewareContext): ValidationUtils => ({
  async body<T>(schema: z.ZodSchema<T>): Promise<T> {
    try {
      const body = await request.json()
      return schema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new APIError(
          "VALIDATION_ERROR",
          `Validation failed: ${error.errors.map(e => e.message).join(", ")}`,
          400
        )
      }
      throw new APIError("INVALID_JSON", "Invalid JSON in request body", 400)
    }
  },

  query<T>(schema: z.ZodSchema<T>): T {
    try {
      const url = new URL(request.url)
      const params = Object.fromEntries(url.searchParams)
      return schema.parse(params)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new APIError(
          "VALIDATION_ERROR",
          `Query validation failed: ${error.errors.map(e => e.message).join(", ")}`,
          400
        )
      }
      throw error
    }
  },

  params<T>(schema: z.ZodSchema<T>): T {
    try {
      const params = context.params ?? {}
      return schema.parse(params)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new APIError(
          "VALIDATION_ERROR",
          `Parameter validation failed: ${error.errors.map(e => e.message).join(", ")}`,
          400
        )
      }
      throw error
    }
  }
})