import { z } from 'zod'

// =====================================
// CONFIGURATION SCHEMAS
// =====================================

const AuthConfigSchema = z.object({
  jwtSecret: z.string().min(32, 'JWT secret must be at least 32 characters'),
  tokenExpiry: z.string().default('24h'),
  refreshTokenExpiry: z.string().default('7d'),
  issuer: z.string().default('motriforge'),
  audience: z.string().default('motriforge-api'),
})

const CorsConfigSchema = z.object({
  allowedOrigins: z.array(z.string()).default(['http://localhost:3000']),
  allowedMethods: z.array(z.string()).default(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']),
  allowedHeaders: z.array(z.string()).default([
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Request-ID',
  ]),
  allowCredentials: z.boolean().default(true),
  maxAge: z.number().optional(),
})

const RateLimitConfigSchema = z.object({
  windowMs: z.number().default(15 * 60 * 1000), // 15 minutes
  maxRequests: z.number().default(100),
  skipSuccessfulRequests: z.boolean().default(false),
  skipFailedRequests: z.boolean().default(false),
})

const ServiceConfigSchema = z.object({
  baseUrl: z.string().url(),
  timeout: z.number().default(5000),
})

const ServiceConfigsSchema = z.object({
  authService: ServiceConfigSchema,
  userService: ServiceConfigSchema,
  exerciseService: ServiceConfigSchema,
  workoutService: ServiceConfigSchema,
  programService: ServiceConfigSchema,
  mediaService: ServiceConfigSchema,
})

const APIConfigSchema = z.object({
  port: z.number().default(3001),
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  version: z.string().default('1.0.0'),
  auth: AuthConfigSchema,
  cors: CorsConfigSchema,
  rateLimit: RateLimitConfigSchema,
  services: ServiceConfigsSchema,
})

// =====================================
// CONFIGURATION TYPES
// =====================================

export type AuthConfig = z.infer<typeof AuthConfigSchema>
export type CorsConfig = z.infer<typeof CorsConfigSchema>
export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>
export type ServiceConfig = z.infer<typeof ServiceConfigSchema>
export type ServiceConfigs = z.infer<typeof ServiceConfigsSchema>
export type APIConfigType = z.infer<typeof APIConfigSchema>

// =====================================
// CONFIGURATION CLASS
// =====================================

/**
 * API Configuration Manager
 * Validates and provides type-safe access to configuration
 */
export class APIConfig implements APIConfigType {
  public readonly port: number
  public readonly environment: 'development' | 'staging' | 'production'
  public readonly version: string
  public readonly auth: AuthConfig
  public readonly cors: CorsConfig
  public readonly rateLimit: RateLimitConfig
  public readonly services: ServiceConfigs

  private constructor(config: APIConfigType) {
    this.port = config.port
    this.environment = config.environment
    this.version = config.version
    this.auth = config.auth
    this.cors = config.cors
    this.rateLimit = config.rateLimit
    this.services = config.services
  }

  /**
   * Create configuration from environment variables
   */
  public static fromEnvironment(): APIConfig {
    try {
      const config = APIConfigSchema.parse({
        port: Number(process.env.PORT) || 3001,
        environment: process.env.NODE_ENV ?? 'development',
        version: process.env.APP_VERSION ?? '1.0.0',
        
        auth: {
          jwtSecret: process.env.JWT_SECRET ?? (() => {
            throw new Error('JWT_SECRET environment variable is required')
          })(),
          tokenExpiry: process.env.JWT_TOKEN_EXPIRY ?? '24h',
          refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY ?? '7d',
          issuer: process.env.JWT_ISSUER ?? 'motriforge',
          audience: process.env.JWT_AUDIENCE ?? 'motriforge-api',
        },

        cors: {
          allowedOrigins: process.env.CORS_ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
          allowedMethods: process.env.CORS_ALLOWED_METHODS?.split(',') ?? [
            'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'
          ],
          allowedHeaders: process.env.CORS_ALLOWED_HEADERS?.split(',') ?? [
            'Origin',
            'X-Requested-With',
            'Content-Type',
            'Accept',
            'Authorization',
            'X-Request-ID',
          ],
          allowCredentials: process.env.CORS_ALLOW_CREDENTIALS === 'true',
          maxAge: process.env.CORS_MAX_AGE ? Number(process.env.CORS_MAX_AGE) : undefined,
        },

        rateLimit: {
          windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
          maxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
          skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL === 'true',
          skipFailedRequests: process.env.RATE_LIMIT_SKIP_FAILED === 'true',
        },

        services: {
          authService: {
            baseUrl: process.env.AUTH_SERVICE_URL ?? 'http://localhost:3002',
            timeout: Number(process.env.AUTH_SERVICE_TIMEOUT) || 5000,
          },
          userService: {
            baseUrl: process.env.USER_SERVICE_URL ?? 'http://localhost:3003',
            timeout: Number(process.env.USER_SERVICE_TIMEOUT) || 5000,
          },
          exerciseService: {
            baseUrl: process.env.EXERCISE_SERVICE_URL ?? 'http://localhost:3004',
            timeout: Number(process.env.EXERCISE_SERVICE_TIMEOUT) || 5000,
          },
          workoutService: {
            baseUrl: process.env.WORKOUT_SERVICE_URL ?? 'http://localhost:3005',
            timeout: Number(process.env.WORKOUT_SERVICE_TIMEOUT) || 5000,
          },
          programService: {
            baseUrl: process.env.PROGRAM_SERVICE_URL ?? 'http://localhost:3006',
            timeout: Number(process.env.PROGRAM_SERVICE_TIMEOUT) || 5000,
          },
          mediaService: {
            baseUrl: process.env.MEDIA_SERVICE_URL ?? 'http://localhost:3007',
            timeout: Number(process.env.MEDIA_SERVICE_TIMEOUT) || 5000,
          },
        },
      })

      return new APIConfig(config)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join('\n')
        
        throw new Error(`Configuration validation failed:\n${errorMessages}`)
      }
      
      throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Create configuration for testing
   */
  public static forTesting(overrides: Partial<APIConfigType> = {}): APIConfig {
    const defaultConfig: APIConfigType = {
      port: 3001,
      environment: 'development',
      version: '1.0.0-test',
      
      auth: {
        jwtSecret: 'test-secret-key-must-be-at-least-32-characters-long',
        tokenExpiry: '1h',
        refreshTokenExpiry: '1d',
        issuer: 'motriforge-test',
        audience: 'motriforge-api-test',
      },

      cors: {
        allowedOrigins: ['http://localhost:3000'],
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
        allowCredentials: true,
      },

      rateLimit: {
        windowMs: 60 * 1000, // 1 minute for testing
        maxRequests: 1000, // High limit for testing
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      },

      services: {
        authService: { baseUrl: 'http://localhost:3002', timeout: 5000 },
        userService: { baseUrl: 'http://localhost:3003', timeout: 5000 },
        exerciseService: { baseUrl: 'http://localhost:3004', timeout: 5000 },
        workoutService: { baseUrl: 'http://localhost:3005', timeout: 5000 },
        programService: { baseUrl: 'http://localhost:3006', timeout: 5000 },
        mediaService: { baseUrl: 'http://localhost:3007', timeout: 5000 },
      },
    }

    const mergedConfig = { ...defaultConfig, ...overrides }
    const validatedConfig = APIConfigSchema.parse(mergedConfig)
    
    return new APIConfig(validatedConfig)
  }

  /**
   * Check if running in production environment
   */
  public isProduction(): boolean {
    return this.environment === 'production'
  }

  /**
   * Check if running in development environment
   */
  public isDevelopment(): boolean {
    return this.environment === 'development'
  }

  /**
   * Check if running in staging environment
   */
  public isStaging(): boolean {
    return this.environment === 'staging'
  }

  /**
   * Get service configuration by name
   */
  public getServiceConfig(serviceName: keyof ServiceConfigs): ServiceConfig {
    return this.services[serviceName]
  }

  /**
   * Validate configuration without creating instance
   */
  public static validate(): void {
    try {
      APIConfig.fromEnvironment()
    } catch (error) {
      throw new Error(`Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}