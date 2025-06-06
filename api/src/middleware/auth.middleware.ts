import { AuthConfig } from "@/shared/config/api.config"
import { APIError } from "@/shared/types/errors"
import { JWTService } from "@/shared/utils/jwt.service"
import { Middleware, AuthenticatedUser } from "./types"

interface AuthMiddlewareOptions {
  readonly skipRoutes?: readonly string[];
  readonly optionalRoutes?: readonly string[];
}

export const authMiddleware = (
  config: AuthConfig,
  options: AuthMiddlewareOptions = {}
): Middleware => {
  const jwtService = new JWTService(config.jwtSecret)
  const { skipRoutes = ["/health"], optionalRoutes = [] } = options

  return async (context, next) => {
    const { request } = context
    const url = new URL(request.url)
    const path = url.pathname

    // Skip authentication for specified routes
    if (skipRoutes.some(route => path.startsWith(route))) {
      return next()
    }

    const authorization = request.headers.get("Authorization")
    const token = authorization?.replace("Bearer ", "")

    if (!token) {
      if (optionalRoutes.some(route => path.startsWith(route))) {
        return next()
      }
      throw new APIError("UNAUTHORIZED", "Authentication token required", 401)
    }

    try {
      const payload = await jwtService.verify(token)
      const user: AuthenticatedUser = {
        id: payload.sub,
        email: payload.email,
        roles: payload.roles ?? [],
        permissions: payload.permissions ?? [],
        institutionId: payload.institutionId
      }

      // Add user to context for downstream middleware
      Object.defineProperty(context, "user", {
        value: user,
        writable: false,
        enumerable: true
      })

      return next()
    } catch (error) {
      throw new APIError("UNAUTHORIZED", "Invalid authentication token", 401)
    }
  }
}
