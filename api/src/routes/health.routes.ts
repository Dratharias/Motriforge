import { SuccessResponse } from "@/shared/types/responses"
import { RouteHandler } from "./route.types"

export const healthRoutes = () => {
  return [
    {
      path: "/health",
      method: "GET",
      handler: (async (): Promise<Response> => {
        const response: SuccessResponse<{
          status: string;
          timestamp: string;
          uptime: number;
          version: string;
        }> = {
          success: true,
          data: {
            status: "healthy",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.APP_VERSION ?? "1.0.0"
          }
        }

        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      }) as RouteHandler
    },
    {
      path: "/health/ready",
      method: "GET",
      handler: (async (): Promise<Response> => {
        // TODO: Check service dependencies
        const response: SuccessResponse<{ ready: boolean }> = {
          success: true,
          data: { ready: true }
        }

        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      }) as RouteHandler
    }
  ]
}