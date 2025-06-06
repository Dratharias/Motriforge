import { RateLimitConfig } from "@/shared/config/api.config"
import { APIError } from "@/shared/types/errors"
import { Middleware, MiddlewareContext } from "./types"

interface RateLimitStore {
  get(key: string): Promise<number | null>;
  set(key: string, value: number, ttl: number): Promise<void>;
  increment(key: string, ttl: number): Promise<number>;
}

export const rateLimitMiddleware = (config: RateLimitConfig): Middleware => {
  const store = createInMemoryStore() // TODO: Replace with Redis in production

  return async (context, next) => {
    const { request } = context
    const identifier = getClientIdentifier(request, context)
    const key = `rate_limit:${identifier}`

    try {
      const current = await store.increment(key, config.windowMs)
      
      if (current > config.maxRequests) {
        throw new APIError(
          "RATE_LIMIT_EXCEEDED",
          "Too many requests, please try again later",
          429
        )
      }

      const response = await next()
      
      // Add rate limit headers
      response.headers.set("X-RateLimit-Limit", config.maxRequests.toString())
      response.headers.set("X-RateLimit-Remaining", Math.max(0, config.maxRequests - current).toString())
      response.headers.set("X-RateLimit-Reset", new Date(Date.now() + config.windowMs).toISOString())

      return response
    } catch (error) {
      if (error instanceof APIError && error.code === "RATE_LIMIT_EXCEEDED") {
        throw error
      }
      // If rate limiting fails, allow request to proceed
      return next()
    }
  }
}

const getClientIdentifier = (request: Request, context: MiddlewareContext): string => {
  // Use user ID if authenticated, otherwise use IP
  if (context.user) {
    return `user:${context.user.id}`
  }
  
  const ip = request.headers.get("X-Forwarded-For") ?? 
             request.headers.get("X-Real-IP") ?? 
             "unknown"
  
  return `ip:${ip}`
}

const createInMemoryStore = (): RateLimitStore => {
  const store = new Map<string, { count: number; expiry: number }>()

  return {
    async get(key: string): Promise<number | null> {
      const entry = store.get(key)
      if (!entry || entry.expiry < Date.now()) {
        store.delete(key)
        return null
      }
      return entry.count
    },

    async set(key: string, value: number, ttl: number): Promise<void> {
      store.set(key, {
        count: value,
        expiry: Date.now() + ttl
      })
    },

    async increment(key: string, ttl: number): Promise<number> {
      const entry = store.get(key)
      const now = Date.now()
      
      if (!entry || entry.expiry < now) {
        const newEntry = { count: 1, expiry: now + ttl }
        store.set(key, newEntry)
        return 1
      }
      
      entry.count++
      return entry.count
    }
  }
}