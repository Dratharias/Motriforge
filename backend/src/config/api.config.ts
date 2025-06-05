export interface ApiConfig {
  readonly port: number;
  readonly host: string;
  readonly apiVersion: string;
  readonly requestTimeout: number;
  readonly maxRequestSize: number;
  readonly corsOrigins: string[];
  readonly rateLimiting: {
    readonly windowMs: number;
    readonly maxRequests: number;
    readonly skipSuccessfulRequests: boolean;
  };
}

export class ApiConfigFactory {
  public static createForEnvironment(env: string = process.env.NODE_ENV ?? 'development'): ApiConfig {
    const baseConfig: ApiConfig = {
      port: parseInt(process.env.PORT ?? '3000', 10),
      host: process.env.HOST ?? 'localhost',
      apiVersion: process.env.API_VERSION ?? 'v1',
      requestTimeout: parseInt(process.env.REQUEST_TIMEOUT ?? '30000', 10),
      maxRequestSize: parseInt(process.env.MAX_REQUEST_SIZE ?? '10485760', 10), // 10MB
      corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(','),
      rateLimiting: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10), // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '100', 10),
        skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESS === 'true'
      }
    };

    switch (env) {
      case 'production':
        return {
          ...baseConfig,
          corsOrigins: process.env.CORS_ORIGINS?.split(',') ?? ['https://motriforge.com'],
          rateLimiting: {
            ...baseConfig.rateLimiting,
            maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '1000', 10)
          }
        };

      case 'testing':
        return {
          ...baseConfig,
          port: 0, // Random port for testing
          requestTimeout: 5000,
          rateLimiting: {
            ...baseConfig.rateLimiting,
            maxRequests: 10000 // Higher limit for testing
          }
        };

      default:
        return baseConfig;
    }
  }
}
