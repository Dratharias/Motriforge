import { z } from 'zod'

const AuthConfigSchema = z.object({
  port: z.number().default(3002),
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  version: z.string().default('1.0.0'),
  jwt: z.object({
    secret: z.string().min(32),
    accessTokenExpiry: z.string().default('15m'),
    refreshTokenExpiry: z.string().default('7d'),
    issuer: z.string().default('motriforge-auth'),
    audience: z.string().default('motriforge')
  }),
  password: z.object({
    minLength: z.number().default(8),
    requireUppercase: z.boolean().default(true),
    requireLowercase: z.boolean().default(true),
    requireNumbers: z.boolean().default(true),
    requireSpecialChars: z.boolean().default(true),
    saltRounds: z.number().default(12)
  }),
  rateLimiting: z.object({
    loginAttempts: z.number().default(5),
    lockoutDuration: z.number().default(15 * 60 * 1000) // 15 minutes
  })
})

export type AuthConfigType = z.infer<typeof AuthConfigSchema>

export class AuthConfig implements AuthConfigType {
  public readonly port: number
  public readonly environment: 'development' | 'staging' | 'production'
  public readonly version: string
  public jwt: {
    readonly secret: string
    readonly accessTokenExpiry: string
    readonly refreshTokenExpiry: string
    readonly issuer: string
    readonly audience: string
  }
  public password: {
    readonly minLength: number
    readonly requireUppercase: boolean
    readonly requireLowercase: boolean
    readonly requireNumbers: boolean
    readonly requireSpecialChars: boolean
    readonly saltRounds: number
  }
  public rateLimiting: {
    readonly loginAttempts: number
    readonly lockoutDuration: number
  }

  private constructor(config: AuthConfigType) {
    this.port = config.port
    this.environment = config.environment
    this.version = config.version
    this.jwt = config.jwt
    this.password = config.password
    this.rateLimiting = config.rateLimiting
  }

  public static fromEnvironment(): AuthConfig {
    try {
      const config = AuthConfigSchema.parse({
        port: Number(process.env.AUTH_SERVICE_PORT) || 3002,
        environment: process.env.NODE_ENV ?? 'development',
        version: process.env.AUTH_SERVICE_VERSION ?? '1.0.0',
        jwt: {
          secret: process.env.JWT_SECRET ?? (() => {
            throw new Error('JWT_SECRET environment variable is required')
          })(),
          accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY ?? '15m',
          refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY ?? '7d',
          issuer: process.env.JWT_ISSUER ?? 'motriforge-auth',
          audience: process.env.JWT_AUDIENCE ?? 'motriforge'
        },
        password: {
          minLength: Number(process.env.PASSWORD_MIN_LENGTH) || 8,
          requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE === 'true',
          requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE === 'true',
          requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS === 'true',
          requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL === 'true',
          saltRounds: Number(process.env.PASSWORD_SALT_ROUNDS) || 12
        },
        rateLimiting: {
          loginAttempts: Number(process.env.RATE_LIMIT_LOGIN_ATTEMPTS) || 5,
          lockoutDuration: Number(process.env.RATE_LIMIT_LOCKOUT_DURATION) || 15 * 60 * 1000
        }
      })

      return new AuthConfig(config)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join('\n')
        
        throw new Error(`Auth service configuration validation failed:\n${errorMessages}`)
      }
      
      throw new Error(`Failed to load auth service configuration: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  public isProduction(): boolean {
    return this.environment === 'production'
  }

  public isDevelopment(): boolean {
    return this.environment === 'development'
  }
}
