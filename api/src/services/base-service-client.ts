import { logger } from "@/shared/utils/logger"
import { APIError } from "@/shared/types/errors"
import { ServiceClient, ServiceRequest, ServiceResponse } from "./service-client.interface"

export abstract class BaseServiceClient implements ServiceClient {
  public readonly serviceName: string
  public readonly baseUrl: string
  public readonly timeout: number

  constructor(serviceName: string, baseUrl: string, timeout: number = 5000) {
    this.serviceName = serviceName
    this.baseUrl = baseUrl
    this.timeout = timeout
  }

  protected async request<T>(request: ServiceRequest): Promise<ServiceResponse<T>> {
    const { method, path, body, query, headers = {} } = request
    const url = this.buildUrl(path, query)

    try {
      logger.debug("Service request started", {
        service: this.serviceName,
        method,
        url: url.toString()
      })

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.timeout)
      })

      const result = await response.json() as ServiceResponse<T>

      if (!response.ok) {
        logger.warn("Service request failed", {
          service: this.serviceName,
          status: response.status,
          error: result.error
        })

        throw new APIError(
          result.error?.code ?? "SERVICE_ERROR",
          result.error?.message ?? "Service request failed",
          response.status
        )
      }

      logger.debug("Service request completed", {
        service: this.serviceName,
        success: result.success
      })

      return result
    } catch (error) {
      if (error instanceof APIError) {
        throw error
      }

      logger.error("Service request error", {
        service: this.serviceName,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : { error }
      })

      throw new APIError(
        "SERVICE_UNAVAILABLE",
        `${this.serviceName} service unavailable`,
        503
      )
    }
  }

  private buildUrl(path: string, query?: Record<string, string>): URL {
    const url = new URL(path, this.baseUrl)
    
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })
    }

    return url
  }
}
