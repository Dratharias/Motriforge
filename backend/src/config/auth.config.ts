import type { RateLimitConfig } from '@/shared/types/auth';
import type { EnvironmentConfig, ValidationResult, ValidationError, ValidationWarning } from './environment.config';
import { getEnvironmentConfig } from './index';

export interface AuthConfig {
  readonly jwt: JWTConfig;
  readonly bcrypt: BcryptConfig;
  readonly session: SessionConfig;
  readonly rateLimit: RateLimitingConfig;
  readonly password: PasswordPolicyConfig;
  readonly security: AuthSecurityConfig;
  readonly oauth: OAuthConfig;
  readonly mfa: MFAConfig;
}

export interface JWTConfig {
  readonly accessTokenSecret: string;
  readonly refreshTokenSecret: string;
  readonly accessTokenExpiry: string;
  readonly refreshTokenExpiry: string;
  readonly issuer: string;
  readonly audience: string;
  readonly algorithm: string;
  readonly clockTolerance: number;
  readonly blacklistCheckInterval: number;
}

export interface BcryptConfig {
  readonly saltRounds: number;
  readonly maxPasswordLength: number;
  readonly pepper?: string;
}

export interface SessionConfig {
  readonly cleanupIntervalMs: number;
  readonly maxConcurrentSessions: number;
  readonly extendOnActivity: boolean;
  readonly absoluteTimeoutMs: number;
  readonly slidingTimeoutMs: number;
  readonly enforceIpValidation: boolean;
  readonly enforceUserAgentValidation: boolean;
}

export interface RateLimitingConfig {
  readonly auth: RateLimitConfig;
  readonly api: RateLimitConfig;
  readonly passwordReset: RateLimitConfig;
  readonly registration: RateLimitConfig;
  readonly tokenRefresh: RateLimitConfig;
}

export interface PasswordPolicyConfig {
  readonly minLength: number;
  readonly maxLength: number;
  readonly requireNumbers: boolean;
  readonly requireUppercase: boolean;
  readonly requireLowercase: boolean;
  readonly requireSpecialChars: boolean;
  readonly forbidCommonPasswords: boolean;
  readonly forbidPersonalInfo: boolean;
  readonly maxRepeatingChars: number;
  readonly minUniqueChars: number;
  readonly historyLength: number;
  readonly expiryDays?: number;
}

export interface AuthSecurityConfig {
  readonly maxLoginAttempts: number;
  readonly lockoutDurationMs: number;
  readonly progressiveLockout: boolean;
  readonly suspiciousActivityDetection: boolean;
  readonly requireEmailVerification: boolean;
  readonly allowPasswordReset: boolean;
  readonly logSecurityEvents: boolean;
  readonly encryptStoredSessions: boolean;
}

export interface OAuthConfig {
  readonly enabled: boolean;
  readonly providers: readonly OAuthProvider[];
  readonly defaultScopes: readonly string[];
  readonly stateExpiry: number;
  readonly enforceState: boolean;
  readonly allowAccountLinking: boolean;
}

export interface OAuthProvider {
  readonly name: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly authUrl: string;
  readonly tokenUrl: string;
  readonly userInfoUrl: string;
  readonly scopes: readonly string[];
  readonly enabled: boolean;
}

export interface MFAConfig {
  readonly enabled: boolean;
  readonly enforced: boolean;
  readonly methods: readonly MFAMethod[];
  readonly backupCodes: MFABackupConfig;
  readonly grace: MFAGraceConfig;
}

export interface MFAMethod {
  readonly type: 'totp' | 'sms' | 'email' | 'webauthn';
  readonly enabled: boolean;
  readonly required: boolean;
  readonly config: Record<string, any>;
}

export interface MFABackupConfig {
  readonly enabled: boolean;
  readonly codeLength: number;
  readonly codeCount: number;
  readonly singleUse: boolean;
}

export interface MFAGraceConfig {
  readonly enabled: boolean;
  readonly durationMs: number;
  readonly maxUsages: number;
}

class AuthConfigCreationStrategy {
  public createFromEnvironment(envConfig: EnvironmentConfig): AuthConfig {
    return {
      jwt: this.createJWTConfig(envConfig),
      bcrypt: this.createBcryptConfig(envConfig),
      session: this.createSessionConfig(envConfig),
      rateLimit: this.createRateLimitConfig(envConfig),
      password: this.createPasswordPolicyConfig(envConfig),
      security: this.createAuthSecurityConfig(envConfig),
      oauth: this.createOAuthConfig(envConfig),
      mfa: this.createMFAConfig(envConfig),
    };
  }

  private createJWTConfig(envConfig: EnvironmentConfig): JWTConfig {
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;

    this.validateJWTSecrets(accessSecret, refreshSecret, envConfig);

    return {
      accessTokenSecret: accessSecret ?? 'default-access-secret-change-in-production',
      refreshTokenSecret: refreshSecret ?? 'default-refresh-secret-change-in-production',
      accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY ?? '15m',
      refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY ?? '30d',
      issuer: process.env.JWT_ISSUER ?? 'motriforge',
      audience: process.env.JWT_AUDIENCE ?? 'motriforge-users',
      algorithm: process.env.JWT_ALGORITHM ?? 'HS256',
      clockTolerance: parseInt(process.env.JWT_CLOCK_TOLERANCE ?? '5', 10),
      blacklistCheckInterval: parseInt(process.env.JWT_BLACKLIST_INTERVAL ?? '300000', 10),
    };
  }

  private validateJWTSecrets(accessSecret: string | undefined, refreshSecret: string | undefined, envConfig: EnvironmentConfig): void {
    if (!accessSecret || !refreshSecret) {
      if (envConfig.isProduction) {
        throw new Error('JWT secrets are required in production environment');
      }
      console.warn('⚠️  Using default JWT secrets. Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in production!');
    }
  }

  private createBcryptConfig(envConfig: EnvironmentConfig): BcryptConfig {
    const saltRounds = envConfig.isProduction ? 14 : 12;
    const pepper = process.env.BCRYPT_PEPPER;
    
    return {
      saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? saltRounds.toString(), 10),
      maxPasswordLength: parseInt(process.env.BCRYPT_MAX_PASSWORD_LENGTH ?? '72', 10),
      ...(pepper !== undefined && { pepper }),
    };
  }

  private createSessionConfig(envConfig: EnvironmentConfig): SessionConfig {
    return {
      cleanupIntervalMs: parseInt(process.env.SESSION_CLEANUP_INTERVAL ?? '3600000', 10),
      maxConcurrentSessions: parseInt(process.env.SESSION_MAX_CONCURRENT ?? '5', 10),
      extendOnActivity: process.env.SESSION_EXTEND_ON_ACTIVITY !== 'false',
      absoluteTimeoutMs: parseInt(process.env.SESSION_ABSOLUTE_TIMEOUT ?? '86400000', 10),
      slidingTimeoutMs: parseInt(process.env.SESSION_SLIDING_TIMEOUT ?? '3600000', 10),
      enforceIpValidation: process.env.SESSION_ENFORCE_IP === 'true' && envConfig.isProduction,
      enforceUserAgentValidation: process.env.SESSION_ENFORCE_UA === 'true' && envConfig.isProduction,
    };
  }

  private createRateLimitConfig(envConfig: EnvironmentConfig): RateLimitingConfig {
    const multiplier = envConfig.isProduction ? 1 : 10;

    return {
      auth: this.createRateLimitRule('AUTH', 900000, 5 * multiplier),
      api: this.createRateLimitRule('API', 60000, 100 * multiplier),
      passwordReset: this.createRateLimitRule('RESET', 3600000, 3 * multiplier),
      registration: this.createRateLimitRule('REGISTER', 3600000, 10 * multiplier),
      tokenRefresh: this.createRateLimitRule('REFRESH', 900000, 20 * multiplier),
    };
  }

  private createRateLimitRule(type: string, defaultWindow: number, defaultMax: number): RateLimitConfig {
    return {
      windowMs: parseInt(process.env[`RATE_LIMIT_${type}_WINDOW`] ?? defaultWindow.toString(), 10),
      maxRequests: parseInt(process.env[`RATE_LIMIT_${type}_MAX`] ?? defaultMax.toString(), 10),
      skipSuccessfulRequests: type === 'API',
    };
  }

  private createPasswordPolicyConfig(envConfig: EnvironmentConfig): PasswordPolicyConfig {
    const isStrict = envConfig.isProduction;
    const expiryDays = process.env.PASSWORD_EXPIRY_DAYS ? parseInt(process.env.PASSWORD_EXPIRY_DAYS, 10) : undefined;

    return {
      minLength: parseInt(process.env.PASSWORD_MIN_LENGTH ?? (isStrict ? '12' : '8'), 10),
      maxLength: parseInt(process.env.PASSWORD_MAX_LENGTH ?? '128', 10),
      requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false' && isStrict,
      requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false' && isStrict,
      requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false' && isStrict,
      requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL !== 'false' && isStrict,
      forbidCommonPasswords: process.env.PASSWORD_FORBID_COMMON !== 'false',
      forbidPersonalInfo: process.env.PASSWORD_FORBID_PERSONAL !== 'false',
      maxRepeatingChars: parseInt(process.env.PASSWORD_MAX_REPEATING ?? '3', 10),
      minUniqueChars: parseInt(process.env.PASSWORD_MIN_UNIQUE ?? '6', 10),
      historyLength: parseInt(process.env.PASSWORD_HISTORY_LENGTH ?? (isStrict ? '12' : '5'), 10),
      ...(expiryDays !== undefined && { expiryDays }),
    };
  }

  private createAuthSecurityConfig(envConfig: EnvironmentConfig): AuthSecurityConfig {
    return {
      maxLoginAttempts: parseInt(process.env.AUTH_MAX_LOGIN_ATTEMPTS ?? '5', 10),
      lockoutDurationMs: parseInt(process.env.AUTH_LOCKOUT_DURATION ?? '900000', 10),
      progressiveLockout: process.env.AUTH_PROGRESSIVE_LOCKOUT === 'true',
      suspiciousActivityDetection: process.env.AUTH_SUSPICIOUS_DETECTION === 'true',
      requireEmailVerification: process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === 'true',
      allowPasswordReset: process.env.AUTH_ALLOW_PASSWORD_RESET !== 'false',
      logSecurityEvents: process.env.AUTH_LOG_SECURITY_EVENTS !== 'false',
      encryptStoredSessions: process.env.AUTH_ENCRYPT_SESSIONS === 'true' || envConfig.isProduction,
    };
  }

  private createOAuthConfig(_envConfig: EnvironmentConfig): OAuthConfig {
    const providers = this.createOAuthProviders();
    
    return {
      enabled: process.env.OAUTH_ENABLED === 'true',
      providers,
      defaultScopes: ['openid', 'profile', 'email'],
      stateExpiry: parseInt(process.env.OAUTH_STATE_EXPIRY ?? '600000', 10),
      enforceState: process.env.OAUTH_ENFORCE_STATE !== 'false',
      allowAccountLinking: process.env.OAUTH_ALLOW_LINKING === 'true',
    };
  }

  private createOAuthProviders(): OAuthProvider[] {
    const providers: OAuthProvider[] = [];
    
    if (process.env.OAUTH_GOOGLE_CLIENT_ID && process.env.OAUTH_GOOGLE_CLIENT_SECRET) {
      providers.push({
        name: 'google',
        clientId: process.env.OAUTH_GOOGLE_CLIENT_ID,
        clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET,
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scopes: ['openid', 'profile', 'email'],
        enabled: process.env.OAUTH_GOOGLE_ENABLED !== 'false',
      });
    }

    return providers;
  }

  private createMFAConfig(_envConfig: EnvironmentConfig): MFAConfig {
    const methods = this.createMFAMethods();

    return {
      enabled: process.env.MFA_ENABLED === 'true',
      enforced: process.env.MFA_ENFORCED === 'true',
      methods,
      backupCodes: this.createMFABackupConfig(),
      grace: this.createMFAGraceConfig(),
    };
  }

  private createMFAMethods(): MFAMethod[] {
    const methods: MFAMethod[] = [];

    if (process.env.MFA_TOTP_ENABLED === 'true') {
      methods.push({
        type: 'totp',
        enabled: true,
        required: process.env.MFA_TOTP_REQUIRED === 'true',
        config: {
          issuer: process.env.MFA_TOTP_ISSUER ?? 'MōtriForge',
          algorithm: process.env.MFA_TOTP_ALGORITHM ?? 'SHA1',
          digits: parseInt(process.env.MFA_TOTP_DIGITS ?? '6', 10),
          period: parseInt(process.env.MFA_TOTP_PERIOD ?? '30', 10),
        },
      });
    }

    return methods;
  }

  private createMFABackupConfig(): MFABackupConfig {
    return {
      enabled: process.env.MFA_BACKUP_CODES_ENABLED === 'true',
      codeLength: parseInt(process.env.MFA_BACKUP_CODE_LENGTH ?? '8', 10),
      codeCount: parseInt(process.env.MFA_BACKUP_CODE_COUNT ?? '10', 10),
      singleUse: process.env.MFA_BACKUP_SINGLE_USE !== 'false',
    };
  }

  private createMFAGraceConfig(): MFAGraceConfig {
    return {
      enabled: process.env.MFA_GRACE_ENABLED === 'true',
      durationMs: parseInt(process.env.MFA_GRACE_DURATION ?? '86400000', 10),
      maxUsages: parseInt(process.env.MFA_GRACE_MAX_USAGES ?? '3', 10),
    };
  }
}

class AuthConfigValidator {
  public validateConfig(config: AuthConfig, envConfig: EnvironmentConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    errors.push(...this.validateJWTConfig(config.jwt, envConfig));
    warnings.push(...this.validateBcryptConfig(config.bcrypt));
    errors.push(...this.validatePasswordPolicy(config.password));
    errors.push(...this.validateSessionConfig(config.session));
    errors.push(...this.validateRateLimitConfig(config.rateLimit));

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateJWTConfig(config: JWTConfig, envConfig: EnvironmentConfig): ValidationError[] {
    const errors: ValidationError[] = [];

    if (envConfig.isProduction) {
      if (config.accessTokenSecret.length < 32) {
        errors.push({
          field: 'jwt.accessTokenSecret',
          message: 'JWT access token secret must be at least 32 characters in production',
          code: 'INSUFFICIENT_SECURITY',
          value: config.accessTokenSecret.length
        });
      }
      if (config.refreshTokenSecret.length < 32) {
        errors.push({
          field: 'jwt.refreshTokenSecret',
          message: 'JWT refresh token secret must be at least 32 characters in production',
          code: 'INSUFFICIENT_SECURITY',
          value: config.refreshTokenSecret.length
        });
      }
    }

    return errors;
  }

  private validateBcryptConfig(config: BcryptConfig): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (config.saltRounds < 10) {
      warnings.push({
        field: 'bcrypt.saltRounds',
        message: 'Bcrypt salt rounds below 10 may be insecure',
        recommendation: 'Use at least 10 salt rounds for better security'
      });
    }

    if (config.saltRounds > 15) {
      warnings.push({
        field: 'bcrypt.saltRounds',
        message: 'Bcrypt salt rounds above 15 may impact performance',
        recommendation: 'Consider reducing salt rounds if performance is affected'
      });
    }

    return warnings;
  }

  private validatePasswordPolicy(config: PasswordPolicyConfig): ValidationError[] {
    const errors: ValidationError[] = [];

    if (config.minLength < 1) {
      errors.push({
        field: 'password.minLength',
        message: 'Minimum password length must be at least 1',
        code: 'INVALID_RANGE',
        value: config.minLength
      });
    }

    if (config.maxLength > 72) {
      errors.push({
        field: 'password.maxLength',
        message: 'Maximum password length cannot exceed 72 characters (bcrypt limitation)',
        code: 'INVALID_RANGE',
        value: config.maxLength
      });
    }

    return errors;
  }

  private validateSessionConfig(config: SessionConfig): ValidationError[] {
    const errors: ValidationError[] = [];

    if (config.maxConcurrentSessions < 1) {
      errors.push({
        field: 'session.maxConcurrentSessions',
        message: 'Maximum concurrent sessions must be at least 1',
        code: 'INVALID_RANGE',
        value: config.maxConcurrentSessions
      });
    }

    if (config.absoluteTimeoutMs < config.slidingTimeoutMs) {
      errors.push({
        field: 'session.absoluteTimeoutMs',
        message: 'Absolute timeout must be greater than or equal to sliding timeout',
        code: 'INVALID_CONFIGURATION',
        value: { absolute: config.absoluteTimeoutMs, sliding: config.slidingTimeoutMs }
      });
    }

    return errors;
  }

  private validateRateLimitConfig(config: RateLimitingConfig): ValidationError[] {
    const errors: ValidationError[] = [];
    const rateLimits = [
      { name: 'auth', config: config.auth },
      { name: 'api', config: config.api },
      { name: 'passwordReset', config: config.passwordReset },
      { name: 'registration', config: config.registration },
      { name: 'tokenRefresh', config: config.tokenRefresh },
    ];

    for (const { name, config: limitConfig } of rateLimits) {
      if (limitConfig.maxRequests < 1) {
        errors.push({
          field: `rateLimit.${name}.maxRequests`,
          message: 'Rate limit max requests must be at least 1',
          code: 'INVALID_RANGE',
          value: limitConfig.maxRequests
        });
      }
      if (limitConfig.windowMs < 1000) {
        errors.push({
          field: `rateLimit.${name}.windowMs`,
          message: 'Rate limit window must be at least 1 second',
          code: 'INVALID_RANGE',
          value: limitConfig.windowMs
        });
      }
    }

    return errors;
  }
}

export class AuthConfigFactory {
  private static readonly creationStrategy = new AuthConfigCreationStrategy();
  private static readonly validator = new AuthConfigValidator();

  public static createFromEnvironment(envConfig?: EnvironmentConfig): AuthConfig {
    const environment = envConfig ?? getEnvironmentConfig();
    const config = this.creationStrategy.createFromEnvironment(environment);
    
    const validation = this.validator.validateConfig(config, environment);
    if (!validation.isValid) {
      throw new Error(`Auth configuration validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    return config;
  }

  public static createForTesting(): AuthConfig {
    return {
      jwt: {
        accessTokenSecret: 'test-access-secret-key-for-testing-purposes-only',
        refreshTokenSecret: 'test-refresh-secret-key-for-testing-purposes-only',
        accessTokenExpiry: '15m',
        refreshTokenExpiry: '7d',
        issuer: 'motriforge-test',
        audience: 'motriforge-test-users',
        algorithm: 'HS256',
        clockTolerance: 5,
        blacklistCheckInterval: 60000,
      },
      bcrypt: {
        saltRounds: 4,
        maxPasswordLength: 128,
      },
      session: {
        cleanupIntervalMs: 60000,
        maxConcurrentSessions: 10,
        extendOnActivity: true,
        absoluteTimeoutMs: 3600000,
        slidingTimeoutMs: 1800000,
        enforceIpValidation: false,
        enforceUserAgentValidation: false,
      },
      rateLimit: {
        auth: { windowMs: 60000, maxRequests: 100, skipSuccessfulRequests: false },
        api: { windowMs: 60000, maxRequests: 1000, skipSuccessfulRequests: true },
        passwordReset: { windowMs: 3600000, maxRequests: 10, skipSuccessfulRequests: false },
        registration: { windowMs: 3600000, maxRequests: 20, skipSuccessfulRequests: false },
        tokenRefresh: { windowMs: 900000, maxRequests: 50, skipSuccessfulRequests: false },
      },
      password: {
        minLength: 6,
        maxLength: 128,
        requireNumbers: false,
        requireUppercase: false,
        requireLowercase: false,
        requireSpecialChars: false,
        forbidCommonPasswords: false,
        forbidPersonalInfo: false,
        maxRepeatingChars: 10,
        minUniqueChars: 3,
        historyLength: 0,
      },
      security: {
        maxLoginAttempts: 100,
        lockoutDurationMs: 1000,
        progressiveLockout: false,
        suspiciousActivityDetection: false,
        requireEmailVerification: false,
        allowPasswordReset: true,
        logSecurityEvents: false,
        encryptStoredSessions: false,
      },
      oauth: {
        enabled: false,
        providers: [],
        defaultScopes: [],
        stateExpiry: 600000,
        enforceState: true,
        allowAccountLinking: false,
      },
      mfa: {
        enabled: false,
        enforced: false,
        methods: [],
        backupCodes: {
          enabled: false,
          codeLength: 8,
          codeCount: 10,
          singleUse: true,
        },
        grace: {
          enabled: false,
          durationMs: 86400000,
          maxUsages: 3,
        },
      },
    };
  }

  public static validateConfig(config: AuthConfig, envConfig: EnvironmentConfig): ValidationResult {
    return this.validator.validateConfig(config, envConfig);
  }

  public static getConfigSummary(config: AuthConfig): Record<string, any> {
    return {
      jwt: {
        algorithm: config.jwt.algorithm,
        accessExpiry: config.jwt.accessTokenExpiry,
        refreshExpiry: config.jwt.refreshTokenExpiry,
        issuer: config.jwt.issuer,
      },
      security: {
        maxLoginAttempts: config.security.maxLoginAttempts,
        lockoutDuration: config.security.lockoutDurationMs,
        emailVerification: config.security.requireEmailVerification,
        encryptSessions: config.security.encryptStoredSessions,
      },
      password: {
        minLength: config.password.minLength,
        requireNumbers: config.password.requireNumbers,
        requireUppercase: config.password.requireUppercase,
        requireSpecialChars: config.password.requireSpecialChars,
        historyLength: config.password.historyLength,
      },
      session: {
        maxConcurrent: config.session.maxConcurrentSessions,
        absoluteTimeout: config.session.absoluteTimeoutMs,
        slidingTimeout: config.session.slidingTimeoutMs,
        enforceIp: config.session.enforceIpValidation,
      },
      oauth: {
        enabled: config.oauth.enabled,
        providersCount: config.oauth.providers.length,
        allowLinking: config.oauth.allowAccountLinking,
      },
      mfa: {
        enabled: config.mfa.enabled,
        enforced: config.mfa.enforced,
        methodsCount: config.mfa.methods.length,
        backupCodes: config.mfa.backupCodes.enabled,
      },
      rateLimiting: {
        auth: config.rateLimit.auth.maxRequests,
        api: config.rateLimit.api.maxRequests,
        passwordReset: config.rateLimit.passwordReset.maxRequests,
      },
    };
  }
}

// Legacy export for backward compatibility
export const authConfig = AuthConfigFactory.createFromEnvironment();