import { DatabaseService } from "@/shared/database/database.service"
import { UserRepository } from "@/shared/database/repositories/user.repository"
import { createServer } from "http"
import { parse } from "url"
import { AuthConfig } from "./config/auth.config"
import { AuthController } from "./controllers/auth.controller"
import { corsMiddleware } from "./middleware/cors.middleware"
import { AuthService } from "./services/auth.service"
import { logger } from "./utils/logger"

/**
 * Auth Service - JWT Authentication & User Management
 */
class AuthServer {
  private readonly config: AuthConfig
  private readonly authService: AuthService
  private readonly authController: AuthController
  private server?: ReturnType<typeof createServer>

  constructor() {
    this.config = AuthConfig.fromEnvironment()
    
    // Initialize dependencies
    const userRepository = new UserRepository()
    this.authService = new AuthService(userRepository, this.config)
    this.authController = new AuthController(this.authService)
  }

  public async start(): Promise<void> {
    try {
      logger.info('Starting Auth Service...', {
        port: this.config.port,
        environment: this.config.environment
      })

      // Connect to database
      await DatabaseService.getInstance().connect()

      this.server = createServer(async (req, res) => {
        try {
          await this.handleRequest(req, res)
        } catch (error) {
          await this.handleError(error, res)
        }
      })

      await new Promise<void>((resolve, reject) => {
        this.server!.listen(this.config.port, (error?: Error) => {
          if (error) {
            reject(error)
          } else {
            resolve()
          }
        })
      })

      logger.info('Auth Service started successfully', {
        port: this.config.port
      })
    } catch (error) {
      logger.error('Failed to start Auth Service', { error })
      throw error
    }
  }

  public async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down Auth Service...')
      
      if (this.server) {
        await new Promise<void>((resolve, reject) => {
          this.server!.close((error) => {
            if (error) {
              reject(error)
            } else {
              resolve()
            }
          })
        })
      }

      await DatabaseService.getInstance().disconnect()
      logger.info('Auth Service shutdown complete')
    } catch (error) {
      logger.error('Error during shutdown', { error })
      throw error
    }
  }

  private async handleRequest(req: any, res: any): Promise<void> {
    // Add CORS headers
    corsMiddleware()(req, res, () => {})

    const url = parse(req.url ?? '', true)
    const method = req.method ?? 'GET'
    const pathname = url.pathname ?? '/'

    // Health check
    if (pathname === '/health' && method === 'GET') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        status: 'healthy',
        service: 'auth-service',
        timestamp: new Date().toISOString()
      }))
      return
    }

    // Route to controller
    if (pathname.startsWith('/auth/')) {
      await this.authController.handleRequest(req, res, pathname, method)
      return
    }

    // 404 Not Found
    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Route ${method} ${pathname} not found`
      }
    }))
  }

  private async handleError(error: unknown, res: any): Promise<void> {
    logger.error('Request error', { error })
    
    if (!res.headersSent) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        }
      }))
    }
  }
}

async function main(): Promise<void> {
  try {
    const server = new AuthServer()

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`)
      await server.shutdown()
      process.exit(0)
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))

    await server.start()
  } catch (error) {
    logger.error('Failed to start auth service', { error })
    process.exit(1)
  }
}

main().catch((error) => {
  logger.error('Unhandled error in main', { error })
  process.exit(1)
})