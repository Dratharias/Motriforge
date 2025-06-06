import { CorsConfig } from "@/shared/config/api.config"
import { Middleware } from "./types"

export const corsMiddleware = (config: CorsConfig): Middleware => {
  return async (context, next) => {
    const { request } = context
    const origin = request.headers.get("Origin")

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: buildCorsHeaders(config, origin)
      })
    }

    const response = await next()
    
    // Add CORS headers to response
    const corsHeaders = buildCorsHeaders(config, origin)
    corsHeaders.forEach((value, key) => {
      response.headers.set(key, value)
    })

    return response
  }
}

const buildCorsHeaders = (config: CorsConfig, origin: string | null): Headers => {
  const headers = new Headers()

  // Check if origin is allowed
  const isOriginAllowed = !origin || 
    config.allowedOrigins.includes("*") ||
    config.allowedOrigins.includes(origin)

  if (isOriginAllowed && origin) {
    headers.set("Access-Control-Allow-Origin", origin)
  }

  headers.set("Access-Control-Allow-Methods", config.allowedMethods.join(", "))
  headers.set("Access-Control-Allow-Headers", config.allowedHeaders.join(", "))
  
  if (config.allowCredentials) {
    headers.set("Access-Control-Allow-Credentials", "true")
  }
  
  if (config.maxAge) {
    headers.set("Access-Control-Max-Age", config.maxAge.toString())
  }

  return headers
}