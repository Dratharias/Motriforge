import { RateLimitConfig } from "@/shared/types/auth";

export interface AuthConfig {
  readonly jwt: {
    readonly accessTokenSecret: string;
    readonly refreshTokenSecret: string;
    readonly accessTokenExpiry: string;
    readonly refreshTokenExpiry: string;
    readonly issuer: string;
    readonly audience: string;
  };
  readonly bcrypt: {
    readonly saltRounds: number;
  };
  readonly session: {
    readonly cleanupIntervalMs: number;
    readonly maxConcurrentSessions: number;
  };
  readonly rateLimit: {
    readonly auth: RateLimitConfig;
    readonly api: RateLimitConfig;
    readonly passwordReset: RateLimitConfig;
  };
  readonly password: {
    readonly minLength: number;
    readonly requireNumbers: boolean;
    readonly requireUppercase: boolean;
    readonly requireLowercase: boolean;
    readonly requireSpecialChars: boolean;
  };
}

export const authConfig: AuthConfig = {
  jwt: {
    accessTokenSecret: process.env.JWT_ACCESS_SECRET ?? '',
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET ?? '',
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '30d',
    issuer: 'motriforge',
    audience: 'motriforge-users',
  },
  bcrypt: {
    saltRounds: 12,
  },
  session: {
    cleanupIntervalMs: 1000 * 60 * 60, // 1 hour
    maxConcurrentSessions: 5,
  },
  rateLimit: {
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
      skipSuccessfulRequests: false,
    },
    api: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
      skipSuccessfulRequests: true,
    },
    passwordReset: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3,
      skipSuccessfulRequests: false,
    },
  },
  password: {
    minLength: 8,
    requireNumbers: true,
    requireUppercase: true,
    requireLowercase: true,
    requireSpecialChars: true,
  },
};