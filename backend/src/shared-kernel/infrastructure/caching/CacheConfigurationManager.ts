
import { CacheConfiguration, CacheEvictionPolicy, CacheSerializationFormat } from '@/types/shared/infrastructure/caching';
import { CacheStrategy } from '@/types/shared/enums/common';
import { ICacheConfigurationManager } from './interfaces/ICache';

/**
 * Cache configuration manager - single responsibility for cache configuration
 */
export class CacheConfigurationManager implements ICacheConfigurationManager {
  private configuration: CacheConfiguration;

  constructor(initialConfig?: Partial<CacheConfiguration>) {
    this.configuration = this.createDefaultConfiguration();
    if (initialConfig) {
      this.configuration = { ...this.configuration, ...initialConfig };
    }
  }

  getConfiguration(): CacheConfiguration {
    return { ...this.configuration };
  }

  async updateConfiguration(config: Partial<CacheConfiguration>): Promise<void> {
    const newConfig = { ...this.configuration, ...config };
    
    if (!this.validateConfiguration(newConfig)) {
      throw new Error('Invalid cache configuration provided');
    }

    this.configuration = newConfig;
  }

  validateConfiguration(config: CacheConfiguration): boolean {
    try {
      // Validate TTL
      if (config.defaultTtl < 0) {
        throw new Error('Default TTL must be non-negative');
      }

      // Validate max keys
      if (config.maxKeys < 1) {
        throw new Error('Max keys must be at least 1');
      }

      // Validate timeouts
      if (config.connectionTimeout < 1000) {
        throw new Error('Connection timeout must be at least 1000ms');
      }

      if (config.operationTimeout < 100) {
        throw new Error('Operation timeout must be at least 100ms');
      }

      // Validate retry settings
      if (config.retryAttempts < 0) {
        throw new Error('Retry attempts must be non-negative');
      }

      if (config.retryDelay < 100) {
        throw new Error('Retry delay must be at least 100ms');
      }

      // Validate enums
      if (!Object.values(CacheStrategy).includes(config.strategy)) {
        throw new Error(`Invalid cache strategy: ${config.strategy}`);
      }

      if (!Object.values(CacheEvictionPolicy).includes(config.evictionPolicy)) {
        throw new Error(`Invalid eviction policy: ${config.evictionPolicy}`);
      }

      if (!Object.values(CacheSerializationFormat).includes(config.serialization)) {
        throw new Error(`Invalid serialization format: ${config.serialization}`);
      }

      return true;
    } catch (error) {
      console.error('Cache configuration validation failed:', error);
      return false;
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

