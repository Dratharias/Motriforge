import { z } from 'zod';

const apiConfigSchema = z.object({
  port: z.number().min(1).max(65535).default(3000),
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  version: z.string().default('1.0.0'),
  auth: z.object({
    jwtSecret: z.string().min(32),
    tokenExpiry: z.string().default('24h'),
    refreshTokenExpiry: z.string().default('7d')
  }),
  cors: z.object({
    allowedOrigins: z.array(z.string()).default(['*']),
    allowedMethods: z.array(z.string()).default(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']),
    allowedHeaders: z.array(z.string()).default(['Content-Type', 'Authorization', 'X-Requested-With']),
    allowCredentials: z.boolean().default(true),
    maxAge: z.number().optional()
  }),
  rateLimit: z.object({
    windowMs: z.number().default(15 * 60 * 1000), // 15 minutes
    maxRequests: z.number().default(100),
    skipSuccessfulRequests: z.boolean().default(false),
    skipFailedRequests: z.boolean().default(false)
  }),
  services: z.object({
    authService: z.object({
      baseUrl: z.string().url(),
      timeout: z.number().default(5000)
    }),
    userService: z.object({
      baseUrl: z.string().url(),
      timeout: z.number().default(5000)
    }),
    exerciseService: z.object({
      baseUrl: z.string().url(),
      timeout: z.number().default(5000)
    }),
    workoutService: z.object({
      baseUrl: z.string().url(),
      timeout: z.number().default(5000)
    }),
    programService: z.object({
      baseUrl: z.string().url(),
      timeout: z.number().default(5000)
    }),
    mediaService: z.object({
      baseUrl: z.string().url(),
      timeout: z.number().default(10000)
    })
  })
});

export type APIConfig = z.infer<typeof apiConfigSchema>;
export type AuthConfig = APIConfig['auth'];
export type CorsConfig = APIConfig['cors'];
export type RateLimitConfig = APIConfig['rateLimit'];
export type ServiceConfig = APIConfig['services'][keyof APIConfig['services']];

export const APIConfig = {
  fromEnvironment(): APIConfig {
    const config = {
      port: parseInt(process.env.PORT ?? '3000', 10),
      environment: process.env.NODE_ENV ?? 'development',
      version: process.env.APP_VERSION ?? '1.0.0',
      auth: {
        jwtSecret: process.env.JWT_SECRET ?? '',
        tokenExpiry: process.env.JWT_EXPIRY ?? '24h',
        refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY ?? '7d'
      },
      cors: {
        allowedOrigins: process.env.CORS_ORIGINS?.split(',') ?? ['*'],
        allowedMethods: process.env.CORS_METHODS?.split(',') ?? ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: process.env.CORS_HEADERS?.split(',') ?? ['Content-Type', 'Authorization', 'X-Requested-With'],
        allowCredentials: process.env.CORS_CREDENTIALS !== 'false',
        maxAge: process.env.CORS_MAX_AGE ? parseInt(process.env.CORS_MAX_AGE, 10) : undefined
      },
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10), // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '100', 10),
        skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESS === 'true',
        skipFailedRequests: process.env.RATE_LIMIT_SKIP_FAILED === 'true'
      },
      services: {
        authService: {
          baseUrl: process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001',
          timeout: parseInt(process.env.AUTH_SERVICE_TIMEOUT ?? '5000', 10)
        },
        userService: {
          baseUrl: process.env.USER_SERVICE_URL ?? 'http://localhost:3002',
          timeout: parseInt(process.env.USER_SERVICE_TIMEOUT ?? '5000', 10)
        },
        exerciseService: {
          baseUrl: process.env.EXERCISE_SERVICE_URL ?? 'http://localhost:3003',
          timeout: parseInt(process.env.EXERCISE_SERVICE_TIMEOUT ?? '5000', 10)
        },
        workoutService: {
          baseUrl: process.env.WORKOUT_SERVICE_URL ?? 'http://localhost:3004',
          timeout: parseInt(process.env.WORKOUT_SERVICE_TIMEOUT ?? '5000', 10)
        },
        programService: {
          baseUrl: process.env.PROGRAM_SERVICE_URL ?? 'http://localhost:3005',
          timeout: parseInt(process.env.PROGRAM_SERVICE_TIMEOUT ?? '5000', 10)
        },
        mediaService: {
          baseUrl: process.env.MEDIA_SERVICE_URL ?? 'http://localhost:3006',
          timeout: parseInt(process.env.MEDIA_SERVICE_TIMEOUT ?? '10000', 10)
        }
      }
    };

    return apiConfigSchema.parse(config);
  }
};