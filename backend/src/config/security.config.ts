import type { EnvironmentConfig, ValidationResult, ValidationError, ValidationWarning } from './environment.config';

export interface SecurityConfig {
  readonly cors: CORSConfig;
  readonly csp: CSPConfig;
  readonly rateLimiting: RateLimitingConfig;
  readonly helmet: HelmetConfig;
  readonly trustedProxies: readonly string[];
  readonly encryption: EncryptionConfig;
  readonly session: SessionSecurityConfig;
  readonly apiSecurity: APISecurityConfig;
}

export interface CORSConfig {
  readonly enabled: boolean;
  readonly origins: readonly string[];
  readonly methods: readonly string[];
  readonly allowedHeaders: readonly string[];
  readonly exposedHeaders: readonly string[];
  readonly credentials: boolean;
  readonly maxAge: number;
  readonly preflightContinue: boolean;
  readonly optionsSuccessStatus: number;
}

export interface CSPConfig {
  readonly enabled: boolean;
  readonly reportOnly: boolean;
  readonly directives: CSPDirectives;
  readonly reportUri?: string;
  readonly upgradeInsecureRequests: boolean;
}

export interface CSPDirectives {
  readonly defaultSrc: readonly string[];
  readonly scriptSrc: readonly string[];
  readonly styleSrc: readonly string[];
  readonly imgSrc: readonly string[];
  readonly connectSrc: readonly string[];
  readonly fontSrc: readonly string[];
  readonly objectSrc: readonly string[];
  readonly mediaSrc: readonly string[];
  readonly frameSrc: readonly string[];
  readonly childSrc: readonly string[];
  readonly workerSrc: readonly string[];
  readonly manifestSrc: readonly string[];
  readonly formAction: readonly string[];
  readonly frameAncestors: readonly string[];
  readonly baseUri: readonly string[];
}

export interface RateLimitingConfig {
  readonly enabled: boolean;
  readonly global: RateLimitRule;
  readonly api: RateLimitRule;
  readonly auth: RateLimitRule;
  readonly upload: RateLimitRule;
  readonly skipSuccessfulRequests: boolean;
  readonly skipFailedRequests: boolean;
  readonly keyGenerator: string;
  readonly store: RateLimitStoreConfig;
}

export interface RateLimitRule {
  readonly windowMs: number;
  readonly maxRequests: number;
  readonly message: string;
  readonly standardHeaders: boolean;
  readonly legacyHeaders: boolean;
}

export interface RateLimitStoreConfig {
  readonly type: 'memory' | 'redis';
  readonly prefix: string;
  readonly expiry: number;
  readonly resetExpiryOnChange: boolean;
}

export interface HelmetConfig {
  readonly enabled: boolean;
  readonly contentSecurityPolicy: boolean;
  readonly hsts: HSTSConfig;
  readonly frameOptions: FrameOptionsConfig;
  readonly contentTypeOptions: boolean;
  readonly referrerPolicy: ReferrerPolicyConfig;
  readonly xssFilter: boolean;
  readonly hidePoweredBy: boolean;
}

export interface HSTSConfig {
  readonly enabled: boolean;
  readonly maxAge: number;
  readonly includeSubDomains: boolean;
  readonly preload: boolean;
}

export interface FrameOptionsConfig {
  readonly enabled: boolean;
  readonly action: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM';
  readonly domain?: string;
}

export interface ReferrerPolicyConfig {
  readonly enabled: boolean;
  readonly policy: string;
}

export interface EncryptionConfig {
  readonly algorithm: string;
  readonly keyDerivation: KeyDerivationConfig;
  readonly saltLength: number;
  readonly ivLength: number;
  readonly tagLength: number;
}

export interface KeyDerivationConfig {
  readonly algorithm: string;
  readonly iterations: number;
  readonly keyLength: number;
  readonly hashAlgorithm: string;
}

export interface SessionSecurityConfig {
  readonly cookieSecure: boolean;
  readonly cookieHttpOnly: boolean;
  readonly cookieSameSite: 'strict' | 'lax' | 'none';
  readonly cookieDomain?: string;
  readonly cookiePath: string;
  readonly maxAge: number;
  readonly rotateSecret: boolean;
  readonly secretRotationInterval: number;
}

export interface APISecurityConfig {
  readonly requireApiKey: boolean;
  readonly apiKeyHeader: string;
  readonly apiKeyQueryParam: string;
  readonly allowApiKeyInQuery: boolean;
  readonly rateLimitByApiKey: boolean;
  readonly requireUserAgent: boolean;
  readonly maxRequestSize: number;
  readonly allowedContentTypes: readonly string[];
}

class CORSConfigCreator {
  public createConfig(envConfig: EnvironmentConfig): CORSConfig {
    const defaultOrigins = envConfig.isDevelopment 
      ? ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4173']
      : [];

    return {
      enabled: process.env.CORS_ENABLED !== 'false',
      origins: this.parseOrigins(process.env.CORS_ORIGINS) ?? defaultOrigins,
      methods: this.parseMethods(process.env.CORS_METHODS) ?? ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: this.parseHeaders(process.env.CORS_ALLOWED_HEADERS) ?? [
        'Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Version', 'X-Request-ID'
      ],
      exposedHeaders: this.parseHeaders(process.env.CORS_EXPOSED_HEADERS) ?? [
        'X-Request-ID', 'X-API-Version', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'
      ],
      credentials: process.env.CORS_CREDENTIALS === 'true',
      maxAge: parseInt(process.env.CORS_MAX_AGE ?? '86400', 10),
      preflightContinue: process.env.CORS_PREFLIGHT_CONTINUE === 'true',
      optionsSuccessStatus: parseInt(process.env.CORS_OPTIONS_STATUS ?? '204', 10)
    };
  }

  private parseOrigins(originsString?: string): string[] | null {
    if (!originsString) return null;
    return originsString.split(',').map(origin => origin.trim()).filter(Boolean);
  }

  private parseMethods(methodsString?: string): string[] | null {
    if (!methodsString) return null;
    return methodsString.split(',').map(method => method.trim().toUpperCase()).filter(Boolean);
  }

  private parseHeaders(headersString?: string): string[] | null {
    if (!headersString) return null;
    return headersString.split(',').map(header => header.trim()).filter(Boolean);
  }
}

class CSPConfigCreator {
  public createConfig(envConfig: EnvironmentConfig): CSPConfig {
    const reportUri = process.env.CSP_REPORT_URI;
    
    return {
      enabled: process.env.CSP_ENABLED !== 'false' && envConfig.isProduction,
      reportOnly: process.env.CSP_REPORT_ONLY === 'true' || envConfig.isDevelopment,
      ...(reportUri !== undefined && { reportUri }),
      upgradeInsecureRequests: process.env.CSP_UPGRADE_INSECURE === 'true' && envConfig.isProduction,
      directives: this.createDirectives(envConfig)
    };
  }

  private createDirectives(envConfig: EnvironmentConfig): CSPDirectives {
    return {
      defaultSrc: ["'self'"],
      scriptSrc: envConfig.isDevelopment ? ["'self'", "'unsafe-eval'", "'unsafe-inline'"] : ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https:', 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      childSrc: ["'none'"],
      workerSrc: ["'self'"],
      manifestSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"]
    };
  }
}

class RateLimitingConfigCreator {
  public createConfig(envConfig: EnvironmentConfig): RateLimitingConfig {
    const baseMultiplier = envConfig.isProduction ? 1 : 10;

    return {
      enabled: process.env.RATE_LIMITING_ENABLED !== 'false',
      global: this.createRateLimitRule('GLOBAL', 900000, 1000 * baseMultiplier, 'Too many requests from this IP, please try again later.'),
      api: this.createRateLimitRule('API', 60000, 100 * baseMultiplier, 'Too many API requests, please try again later.'),
      auth: this.createRateLimitRule('AUTH', 900000, 5 * baseMultiplier, 'Too many authentication attempts, please try again later.'),
      upload: this.createRateLimitRule('UPLOAD', 3600000, 50 * baseMultiplier, 'Too many uploads, please try again later.'),
      skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESS === 'true',
      skipFailedRequests: process.env.RATE_LIMIT_SKIP_FAILED === 'true',
      keyGenerator: process.env.RATE_LIMIT_KEY_GENERATOR ?? 'ip',
      store: this.createStoreConfig()
    };
  }

  private createRateLimitRule(type: string, defaultWindow: number, defaultMax: number, message: string): RateLimitRule {
    return {
      windowMs: parseInt(process.env[`RATE_LIMIT_${type}_WINDOW`] ?? defaultWindow.toString(), 10),
      maxRequests: parseInt(process.env[`RATE_LIMIT_${type}_MAX`] ?? defaultMax.toString(), 10),
      message,
      standardHeaders: true,
      legacyHeaders: false
    };
  }

  private createStoreConfig(): RateLimitStoreConfig {
    return {
      type: process.env.RATE_LIMIT_STORE_TYPE === 'redis' ? 'redis' : 'memory',
      prefix: process.env.RATE_LIMIT_STORE_PREFIX ?? 'rl:',
      expiry: parseInt(process.env.RATE_LIMIT_STORE_EXPIRY ?? '3600', 10),
      resetExpiryOnChange: process.env.RATE_LIMIT_RESET_EXPIRY === 'true'
    };
  }
}

class HelmetConfigCreator {
  public createConfig(envConfig: EnvironmentConfig): HelmetConfig {
    return {
      enabled: process.env.HELMET_ENABLED !== 'false',
      contentSecurityPolicy: process.env.HELMET_CSP !== 'false',
      hsts: this.createHSTSConfig(envConfig),
      frameOptions: this.createFrameOptionsConfig(),
      contentTypeOptions: process.env.HELMET_CONTENT_TYPE !== 'false',
      referrerPolicy: this.createReferrerPolicyConfig(),
      xssFilter: process.env.HELMET_XSS_FILTER !== 'false',
      hidePoweredBy: process.env.HELMET_HIDE_POWERED_BY !== 'false'
    };
  }

  private createHSTSConfig(envConfig: EnvironmentConfig): HSTSConfig {
    return {
      enabled: process.env.HELMET_HSTS !== 'false' && envConfig.isProduction,
      maxAge: parseInt(process.env.HELMET_HSTS_MAX_AGE ?? '31536000', 10),
      includeSubDomains: process.env.HELMET_HSTS_SUBDOMAINS !== 'false',
      preload: process.env.HELMET_HSTS_PRELOAD === 'true'
    };
  }

  private createFrameOptionsConfig(): FrameOptionsConfig {
    const domain = process.env.HELMET_FRAME_DOMAIN;
    
    return {
      enabled: process.env.HELMET_FRAME_OPTIONS !== 'false',
      action: (process.env.HELMET_FRAME_ACTION as any) ?? 'DENY',
      ...(domain !== undefined && { domain })
    };
  }

  private createReferrerPolicyConfig(): ReferrerPolicyConfig {
    return {
      enabled: process.env.HELMET_REFERRER_POLICY !== 'false',
      policy: process.env.HELMET_REFERRER_POLICY_VALUE ?? 'strict-origin-when-cross-origin'
    };
  }
}

class SecurityConfigValidator {
  public validateConfig(config: SecurityConfig, envConfig: EnvironmentConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    errors.push(...this.validateCORSConfig(config.cors, envConfig));
    warnings.push(...this.validateCSPConfig(config.csp));
    errors.push(...this.validateRateLimitingConfig(config.rateLimiting));
    warnings.push(...this.validateSecurityHeaders(config.helmet, envConfig));
    warnings.push(...this.validateSessionSecurity(config.session, envConfig));
    warnings.push(...this.validateEncryptionConfig(config.encryption));
    warnings.push(...this.validateAPISecurityConfig(config.apiSecurity, envConfig));

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateCORSConfig(config: CORSConfig, _envConfig: EnvironmentConfig): ValidationError[] {
    const errors: ValidationError[] = [];

    if (config.enabled) {
      if (config.origins.length === 0) {
        errors.push({
          field: 'cors.origins',
          message: 'At least one CORS origin must be specified when CORS is enabled',
          code: 'REQUIRED_FIELD',
          value: config.origins
        });
      }

      if (config.origins.includes('*') && config.credentials) {
        errors.push({
          field: 'cors.credentials',
          message: 'Cannot use credentials with wildcard origin',
          code: 'INVALID_COMBINATION',
          value: { origins: config.origins, credentials: config.credentials }
        });
      }
    }

    return errors;
  }

  private validateCSPConfig(config: CSPConfig): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (config.enabled) {
      if (config.directives.defaultSrc.length === 0) {
        warnings.push({
          field: 'csp.directives.defaultSrc',
          message: 'Default CSP source not specified',
          recommendation: 'Set default-src directive for better security'
        });
      }

      if (config.directives.scriptSrc.includes("'unsafe-eval'") || 
          config.directives.scriptSrc.includes("'unsafe-inline'")) {
        warnings.push({
          field: 'csp.directives.scriptSrc',
          message: 'Unsafe script sources detected',
          recommendation: 'Avoid unsafe-eval and unsafe-inline for better security'
        });
      }
    }

    return warnings;
  }

  private validateRateLimitingConfig(config: RateLimitingConfig): ValidationError[] {
    const errors: ValidationError[] = [];
    const rules = [
      { name: 'global', rule: config.global },
      { name: 'api', rule: config.api },
      { name: 'auth', rule: config.auth },
      { name: 'upload', rule: config.upload }
    ];

    for (const { name, rule } of rules) {
      if (rule.windowMs < 1000 || rule.windowMs > 3600000) {
        errors.push({
          field: `rateLimiting.${name}.windowMs`,
          message: 'Rate limit window should be between 1 second and 1 hour',
          code: 'INVALID_RANGE',
          value: rule.windowMs
        });
      }

      if (rule.maxRequests < 1) {
        errors.push({
          field: `rateLimiting.${name}.maxRequests`,
          message: 'Maximum requests must be at least 1',
          code: 'INVALID_RANGE',
          value: rule.maxRequests
        });
      }
    }

    return errors;
  }

  private validateSecurityHeaders(config: HelmetConfig, envConfig: EnvironmentConfig): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (config.hsts.enabled && !envConfig.isProduction) {
      warnings.push({
        field: 'helmet.hsts.enabled',
        message: 'HSTS enabled in non-production environment',
        recommendation: 'Consider enabling HSTS only in production'
      });
    }

    return warnings;
  }

  private validateSessionSecurity(config: SessionSecurityConfig, envConfig: EnvironmentConfig): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (envConfig.isProduction) {
      if (!config.cookieSecure) {
        warnings.push({
          field: 'session.cookieSecure',
          message: 'Secure cookies should be enabled in production',
          recommendation: 'Enable secure cookies for production environment'
        });
      }

      if (config.cookieSameSite === 'none') {
        warnings.push({
          field: 'session.cookieSameSite',
          message: 'SameSite=None may have security implications',
          recommendation: 'Use strict or lax for better security unless cross-site requests are required'
        });
      }
    }

    return warnings;
  }

  private validateEncryptionConfig(config: EncryptionConfig): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (config.keyDerivation.iterations < 10000) {
      warnings.push({
        field: 'encryption.keyDerivation.iterations',
        message: 'Low key derivation iterations may be vulnerable to attacks',
        recommendation: 'Use at least 10,000 iterations for key derivation'
      });
    }

    return warnings;
  }

  private validateAPISecurityConfig(config: APISecurityConfig, envConfig: EnvironmentConfig): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (config.allowApiKeyInQuery && envConfig.isProduction) {
      warnings.push({
        field: 'apiSecurity.allowApiKeyInQuery',
        message: 'API keys in query parameters may be logged',
        recommendation: 'Use headers for API keys in production'
      });
    }

    return warnings;
  }
}

export class SecurityConfigFactory {
  private static readonly corsCreator = new CORSConfigCreator();
  private static readonly cspCreator = new CSPConfigCreator();
  private static readonly rateLimitCreator = new RateLimitingConfigCreator();
  private static readonly helmetCreator = new HelmetConfigCreator();
  private static readonly validator = new SecurityConfigValidator();

  public static createFromEnvironment(envConfig: EnvironmentConfig): SecurityConfig {
    const config: SecurityConfig = {
      cors: this.corsCreator.createConfig(envConfig),
      csp: this.cspCreator.createConfig(envConfig),
      rateLimiting: this.rateLimitCreator.createConfig(envConfig),
      helmet: this.helmetCreator.createConfig(envConfig),
      trustedProxies: this.parseTrustedProxies(process.env.TRUSTED_PROXIES),
      encryption: this.createEncryptionConfig(envConfig),
      session: this.createSessionSecurityConfig(envConfig),
      apiSecurity: this.createAPISecurityConfig(envConfig),
    };

    const validation = this.validator.validateConfig(config, envConfig);
    if (!validation.isValid) {
      throw new Error(`Security configuration validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    return config;
  }

  public static validateConfig(config: SecurityConfig, envConfig: EnvironmentConfig): ValidationResult {
    return this.validator.validateConfig(config, envConfig);
  }

  private static createEncryptionConfig(_envConfig: EnvironmentConfig): EncryptionConfig {
    return {
      algorithm: process.env.ENCRYPTION_ALGORITHM ?? 'aes-256-gcm',
      keyDerivation: {
        algorithm: process.env.KEY_DERIVATION_ALGORITHM ?? 'pbkdf2',
        iterations: parseInt(process.env.KEY_DERIVATION_ITERATIONS ?? '100000', 10),
        keyLength: parseInt(process.env.KEY_DERIVATION_LENGTH ?? '32', 10),
        hashAlgorithm: process.env.KEY_DERIVATION_HASH ?? 'sha512'
      },
      saltLength: parseInt(process.env.ENCRYPTION_SALT_LENGTH ?? '32', 10),
      ivLength: parseInt(process.env.ENCRYPTION_IV_LENGTH ?? '16', 10),
      tagLength: parseInt(process.env.ENCRYPTION_TAG_LENGTH ?? '16', 10)
    };
  }

  private static createSessionSecurityConfig(envConfig: EnvironmentConfig): SessionSecurityConfig {
    const cookieDomain = process.env.SESSION_COOKIE_DOMAIN;
    
    return {
      cookieSecure: process.env.SESSION_COOKIE_SECURE === 'true' || envConfig.isProduction,
      cookieHttpOnly: process.env.SESSION_COOKIE_HTTP_ONLY !== 'false',
      cookieSameSite: (process.env.SESSION_COOKIE_SAME_SITE as any) ?? 'strict',
      ...(cookieDomain !== undefined && { cookieDomain }),
      cookiePath: process.env.SESSION_COOKIE_PATH ?? '/',
      maxAge: parseInt(process.env.SESSION_MAX_AGE ?? '86400000', 10),
      rotateSecret: process.env.SESSION_ROTATE_SECRET !== 'false',
      secretRotationInterval: parseInt(process.env.SESSION_SECRET_ROTATION ?? '604800000', 10)
    };
  }

  private static createAPISecurityConfig(envConfig: EnvironmentConfig): APISecurityConfig {
    return {
      requireApiKey: process.env.API_REQUIRE_KEY === 'true',
      apiKeyHeader: process.env.API_KEY_HEADER ?? 'X-API-Key',
      apiKeyQueryParam: process.env.API_KEY_QUERY ?? 'apikey',
      allowApiKeyInQuery: process.env.API_KEY_ALLOW_QUERY === 'true' && !envConfig.isProduction,
      rateLimitByApiKey: process.env.API_RATE_LIMIT_BY_KEY === 'true',
      requireUserAgent: process.env.API_REQUIRE_USER_AGENT === 'true',
      maxRequestSize: parseInt(process.env.API_MAX_REQUEST_SIZE ?? '10485760', 10),
      allowedContentTypes: this.parseContentTypes(process.env.API_ALLOWED_CONTENT_TYPES) ?? [
        'application/json', 'application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'
      ]
    };
  }

  private static parseContentTypes(typesString?: string): string[] | null {
    if (!typesString) return null;
    return typesString.split(',').map(type => type.trim()).filter(Boolean);
  }

  private static parseTrustedProxies(proxiesString?: string): string[] {
    if (!proxiesString) return [];
    return proxiesString.split(',').map(proxy => proxy.trim()).filter(Boolean);
  }

  public static createForTesting(): SecurityConfig {
    return {
      cors: {
        enabled: true,
        origins: ['http://localhost:3000'],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: [],
        credentials: false,
        maxAge: 86400,
        preflightContinue: false,
        optionsSuccessStatus: 204
      },
      csp: {
        enabled: false,
        reportOnly: true,
        upgradeInsecureRequests: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          childSrc: ["'none'"],
          workerSrc: ["'self'"],
          manifestSrc: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"]
        }
      },
      rateLimiting: {
        enabled: false,
        global: {
          windowMs: 900000,
          maxRequests: 10000,
          message: 'Rate limit exceeded',
          standardHeaders: true,
          legacyHeaders: false
        },
        api: {
          windowMs: 60000,
          maxRequests: 1000,
          message: 'API rate limit exceeded',
          standardHeaders: true,
          legacyHeaders: false
        },
        auth: {
          windowMs: 900000,
          maxRequests: 100,
          message: 'Auth rate limit exceeded',
          standardHeaders: true,
          legacyHeaders: false
        },
        upload: {
          windowMs: 3600000,
          maxRequests: 1000,
          message: 'Upload rate limit exceeded',
          standardHeaders: true,
          legacyHeaders: false
        },
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
        keyGenerator: 'ip',
        store: {
          type: 'memory',
          prefix: 'rl:',
          expiry: 3600,
          resetExpiryOnChange: false
        }
      },
      helmet: {
        enabled: false,
        contentSecurityPolicy: false,
        hsts: {
          enabled: false,
          maxAge: 31536000,
          includeSubDomains: false,
          preload: false
        },
        frameOptions: {
          enabled: false,
          action: 'DENY'
        },
        contentTypeOptions: false,
        referrerPolicy: {
          enabled: false,
          policy: 'strict-origin-when-cross-origin'
        },
        xssFilter: false,
        hidePoweredBy: false
      },
      trustedProxies: [],
      encryption: {
        algorithm: 'aes-256-gcm',
        keyDerivation: {
          algorithm: 'pbkdf2',
          iterations: 10000,
          keyLength: 32,
          hashAlgorithm: 'sha256'
        },
        saltLength: 32,
        ivLength: 16,
        tagLength: 16
      },
      session: {
        cookieSecure: false,
        cookieHttpOnly: true,
        cookieSameSite: 'lax',
        cookiePath: '/',
        maxAge: 3600000,
        rotateSecret: false,
        secretRotationInterval: 604800000
      },
      apiSecurity: {
        requireApiKey: false,
        apiKeyHeader: 'X-API-Key',
        apiKeyQueryParam: 'apikey',
        allowApiKeyInQuery: true,
        rateLimitByApiKey: false,
        requireUserAgent: false,
        maxRequestSize: 10485760,
        allowedContentTypes: ['application/json']
      }
    };
  }

  public static getConfigSummary(config: SecurityConfig): Record<string, any> {
    return {
      cors: {
        enabled: config.cors.enabled,
        originsCount: config.cors.origins.length,
        credentials: config.cors.credentials
      },
      csp: {
        enabled: config.csp.enabled,
        reportOnly: config.csp.reportOnly,
        upgradeInsecure: config.csp.upgradeInsecureRequests
      },
      rateLimiting: {
        enabled: config.rateLimiting.enabled,
        storeType: config.rateLimiting.store.type,
        rules: {
          global: config.rateLimiting.global.maxRequests,
          api: config.rateLimiting.api.maxRequests,
          auth: config.rateLimiting.auth.maxRequests,
          upload: config.rateLimiting.upload.maxRequests
        }
      },
      helmet: {
        enabled: config.helmet.enabled,
        hsts: config.helmet.hsts.enabled,
        frameOptions: config.helmet.frameOptions.enabled
      },
      encryption: {
        algorithm: config.encryption.algorithm,
        iterations: config.encryption.keyDerivation.iterations
      },
      session: {
        secure: config.session.cookieSecure,
        httpOnly: config.session.cookieHttpOnly,
        sameSite: config.session.cookieSameSite
      },
      api: {
        requireApiKey: config.apiSecurity.requireApiKey,
        maxRequestSize: config.apiSecurity.maxRequestSize,
        allowedContentTypesCount: config.apiSecurity.allowedContentTypes.length
      }
    };
  }
}