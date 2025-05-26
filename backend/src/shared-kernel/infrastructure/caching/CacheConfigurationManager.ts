import { 
  CacheConfiguration, 
  CacheEvictionPolicy, 
  CacheSerializationFormat 
} from '@/types/shared/infrastructure/caching';
import { CacheStrategy } from '@/types/shared/enums/common';
import { ICacheConfigurationManager } from './interfaces/ICache';

/**
 * Cache configuration manager - handles configuration management and validation
 */
export class CacheConfigurationManager implements ICacheConfigurationManager {
  private configuration: CacheConfiguration;

  constructor(initialConfig?: Partial<CacheConfiguration>) {
    this.configuration = this.createDefaultConfiguration();
    if (initialConfig) {
      const validation = this.validateConfiguration(initialConfig);
      if (!validation.isValid) {
        throw new Error(`Invalid initial configuration: ${validation.errors.join(', ')}`);
      }
      this.configuration = { ...this.configuration, ...initialConfig };
    }
  }

  getConfiguration(): CacheConfiguration {
    return { ...this.configuration };
  }

  async updateConfiguration(config: Partial<CacheConfiguration>): Promise<void> {
    const validation = this.validateConfiguration(config);
    
    if (!validation.isValid) {
      throw new Error(`Invalid cache configuration: ${validation.errors.join(', ')}`);
    }

    this.configuration = { ...this.configuration, ...config };
  }

  validateConfiguration(config: Partial<CacheConfiguration>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      // Create a complete config for validation by merging with current config
      const completeConfig = { ...this.configuration, ...config };
      
      // Validate TTL
      if (completeConfig.defaultTtl < 0) {
        errors.push('Default TTL must be non-negative');
      }

      // Validate max keys
      if (completeConfig.maxKeys < 1) {
        errors.push('Max keys must be at least 1');
      }

      // Validate timeouts
      if (completeConfig.connectionTimeout < 1000) {
        errors.push('Connection timeout must be at least 1000ms');
      }

      if (completeConfig.operationTimeout < 100) {
        errors.push('Operation timeout must be at least 100ms');
      }

      // Validate retry settings
      if (completeConfig.retryAttempts < 0) {
        errors.push('Retry attempts must be non-negative');
      }

      if (completeConfig.retryDelay < 100) {
        errors.push('Retry delay must be at least 100ms');
      }

      // Validate key prefix
      if (!completeConfig.keyPrefix || completeConfig.keyPrefix.trim().length === 0) {
        errors.push('Key prefix must be a non-empty string');
      }

      // Validate enums
      if (!Object.values(CacheStrategy).includes(completeConfig.strategy)) {
        errors.push(`Invalid cache strategy: ${completeConfig.strategy}`);
      }

      if (!Object.values(CacheEvictionPolicy).includes(completeConfig.evictionPolicy)) {
        errors.push(`Invalid eviction policy: ${completeConfig.evictionPolicy}`);
      }

      if (!Object.values(CacheSerializationFormat).includes(completeConfig.serialization)) {
        errors.push(`Invalid serialization format: ${completeConfig.serialization}`);
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      console.error('Cache configuration validation failed:', error);
      return {
        isValid: false,
        errors: [`Validation error: ${error}`]
      };
    }
  }

  getEnvironmentConfiguration(environment: string): CacheConfiguration {
    const environmentConfigs = {
      development: this.createDevelopmentConfig(),
      testing: this.createTestingConfig(),
      staging: this.createStagingConfig(),
      production: this.createProductionConfig()
    };

    const envConfig = environmentConfigs[environment as keyof typeof environmentConfigs];
    return envConfig || this.configuration;
  }

  getCacheTypeConfiguration(cacheType: 'session' | 'user' | 'api' | 'generic'): CacheConfiguration {
    const typeConfigs: Record<string, Partial<CacheConfiguration>> = {
      session: {
        defaultTtl: 1800, // 30 minutes
        maxKeys: 10000,
        evictionPolicy: CacheEvictionPolicy.TTL,
        keyPrefix: 'session',
        enableEncryption: true
      },
      user: {
        defaultTtl: 3600, // 1 hour
        maxKeys: 50000,
        evictionPolicy: CacheEvictionPolicy.LRU,
        keyPrefix: 'user',
        enableCompression: true
      },
      api: {
        defaultTtl: 300, // 5 minutes
        maxKeys: 20000,
        evictionPolicy: CacheEvictionPolicy.LFU,
        keyPrefix: 'api',
        enableCompression: true
      },
      generic: {
        defaultTtl: 1800, // 30 minutes
        maxKeys: 10000,
        evictionPolicy: CacheEvictionPolicy.LRU,
        keyPrefix: 'generic'
      }
    };

    const typeConfig = typeConfigs[cacheType] || {};
    return { ...this.configuration, ...typeConfig };
  }

  resetToDefaults(): void {
    this.configuration = this.createDefaultConfiguration();
  }

  exportConfiguration(): string {
    return JSON.stringify(this.configuration, null, 2);
  }

  async importConfiguration(configJson: string): Promise<void> {
    try {
      const importedConfig = JSON.parse(configJson) as CacheConfiguration;
      
      // Validate the imported configuration
      const validation = this.validateConfiguration(importedConfig);
      if (!validation.isValid) {
        throw new Error(`Invalid imported configuration: ${validation.errors.join(', ')}`);
      }
      
      this.configuration = importedConfig;
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error}`);
    }
  }

  private createDefaultConfiguration(): CacheConfiguration {
    return {
      defaultTtl: 3600, // 1 hour
      maxKeys: 10000,
      keyPrefix: 'fitness-app',
      enableCompression: false,
      enableEncryption: false,
      enableMetrics: true,
      strategy: CacheStrategy.WRITE_THROUGH,
      evictionPolicy: CacheEvictionPolicy.LRU,
      serialization: CacheSerializationFormat.JSON,
      retryAttempts: 3,
      retryDelay: 1000,
      connectionTimeout: 5000,
      operationTimeout: 2000
    };
  }

  private createDevelopmentConfig(): CacheConfiguration {
    return {
      ...this.configuration,
      defaultTtl: 300, // 5 minutes for faster development
      maxKeys: 1000,
      keyPrefix: 'dev-fitness-app',
      enableCompression: false,
      enableEncryption: false,
      enableMetrics: true,
      connectionString: 'redis://localhost:6379'
    };
  }

  private createTestingConfig(): CacheConfiguration {
    return {
      ...this.configuration,
      defaultTtl: 60, // 1 minute for testing
      maxKeys: 100,
      keyPrefix: 'test-fitness-app',
      enableCompression: false,
      enableEncryption: false,
      enableMetrics: false,
      strategy: CacheStrategy.WRITE_THROUGH
    };
  }

  private createStagingConfig(): CacheConfiguration {
    return {
      ...this.configuration,
      defaultTtl: 1800, // 30 minutes
      maxKeys: 5000,
      keyPrefix: 'staging-fitness-app',
      enableCompression: true,
      enableEncryption: false,
      enableMetrics: true,
      connectionString: process.env.REDIS_STAGING_URL ?? 'redis://staging-redis:6379'
    };
  }

  private createProductionConfig(): CacheConfiguration {
    return {
      ...this.configuration,
      defaultTtl: 3600, // 1 hour
      maxKeys: 50000,
      keyPrefix: 'prod-fitness-app',
      enableCompression: true,
      enableEncryption: true,
      enableMetrics: true,
      retryAttempts: 5,
      retryDelay: 2000,
      connectionTimeout: 10000,
      operationTimeout: 5000,
      connectionString: process.env.REDIS_PRODUCTION_URL ?? 'redis://production-redis:6379'
    };
  }
}

/**
 * Cache configuration validator - separate responsibility for validation logic
 */
export class CacheConfigurationValidator {
  validate(config: Partial<CacheConfiguration>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.defaultTtl !== undefined && (config.defaultTtl < 0 || !Number.isFinite(config.defaultTtl))) {
      errors.push('defaultTtl must be a non-negative finite number');
    }

    if (config.maxKeys !== undefined && (config.maxKeys < 1 || !Number.isInteger(config.maxKeys))) {
      errors.push('maxKeys must be a positive integer');
    }

    if (config.keyPrefix !== undefined && (!config.keyPrefix || config.keyPrefix.trim().length === 0)) {
      errors.push('keyPrefix must be a non-empty string');
    }

    if (config.connectionTimeout !== undefined && (config.connectionTimeout < 1000 || !Number.isFinite(config.connectionTimeout))) {
      errors.push('connectionTimeout must be at least 1000ms');
    }

    if (config.operationTimeout !== undefined && (config.operationTimeout < 100 || !Number.isFinite(config.operationTimeout))) {
      errors.push('operationTimeout must be at least 100ms');
    }

    if (config.retryAttempts !== undefined && (config.retryAttempts < 0 || !Number.isInteger(config.retryAttempts))) {
      errors.push('retryAttempts must be a non-negative integer');
    }

    if (config.retryDelay !== undefined && (config.retryDelay < 100 || !Number.isFinite(config.retryDelay))) {
      errors.push('retryDelay must be at least 100ms');
    }

    if (config.strategy !== undefined && !Object.values(CacheStrategy).includes(config.strategy)) {
      errors.push(`Invalid cache strategy: ${config.strategy}`);
    }

    if (config.evictionPolicy !== undefined && !Object.values(CacheEvictionPolicy).includes(config.evictionPolicy)) {
      errors.push(`Invalid eviction policy: ${config.evictionPolicy}`);
    }

    if (config.serialization !== undefined && !Object.values(CacheSerializationFormat).includes(config.serialization)) {
      errors.push(`Invalid serialization format: ${config.serialization}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Cache configuration builder for fluent configuration creation
 */
export class CacheConfigurationBuilder {
  private config: Partial<CacheConfiguration> = {};

  static create(): CacheConfigurationBuilder {
    return new CacheConfigurationBuilder();
  }

  withDefaultTtl(ttl: number): CacheConfigurationBuilder {
    this.config.defaultTtl = ttl;
    return this;
  }

  withMaxKeys(maxKeys: number): CacheConfigurationBuilder {
    this.config.maxKeys = maxKeys;
    return this;
  }

  withKeyPrefix(prefix: string): CacheConfigurationBuilder {
    this.config.keyPrefix = prefix;
    return this;
  }

  withEvictionPolicy(policy: CacheEvictionPolicy): CacheConfigurationBuilder {
    this.config.evictionPolicy = policy;
    return this;
  }

  withSerialization(format: CacheSerializationFormat): CacheConfigurationBuilder {
    this.config.serialization = format;
    return this;
  }

  withStrategy(strategy: CacheStrategy): CacheConfigurationBuilder {
    this.config.strategy = strategy;
    return this;
  }

  enableMetrics(enabled: boolean = true): CacheConfigurationBuilder {
    this.config.enableMetrics = enabled;
    return this;
  }

  enableCompression(enabled: boolean = true): CacheConfigurationBuilder {
    this.config.enableCompression = enabled;
    return this;
  }

  enableEncryption(enabled: boolean = true): CacheConfigurationBuilder {
    this.config.enableEncryption = enabled;
    return this;
  }

  withRetryPolicy(attempts: number, delay: number): CacheConfigurationBuilder {
    this.config.retryAttempts = attempts;
    this.config.retryDelay = delay;
    return this;
  }

  withTimeouts(connectionTimeout: number, operationTimeout: number): CacheConfigurationBuilder {
    this.config.connectionTimeout = connectionTimeout;
    this.config.operationTimeout = operationTimeout;
    return this;
  }

  withConnectionString(connectionString: string): CacheConfigurationBuilder {
    this.config.connectionString = connectionString;
    return this;
  }

  build(): Partial<CacheConfiguration> {
    return { ...this.config };
  }

  buildComplete(): CacheConfiguration {
    const manager = new CacheConfigurationManager();
    const defaultConfig = manager.getConfiguration();
    return { ...defaultConfig, ...this.config };
  }
}