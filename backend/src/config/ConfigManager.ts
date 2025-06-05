import { Logger } from "@/utils/Logger";
import { ConfigCache } from "./ConfigCache";
import { ConfigValidator } from "./ConfigValidator";
import { ConfigWatcher } from "./ConfigWatcher";
import { EnvironmentConfig, ValidationResult, EnvironmentConfigFactory } from "./environment.config";
import { LoggingConfig, LoggingConfigFactory } from "./logging.config";
import { SecurityConfig, SecurityConfigFactory } from "./security.config";
import { DatabaseConfig, DatabaseConfigFactory } from "./database.config";

export enum ConfigType {
  ENVIRONMENT = 'environment',
  LOGGING = 'logging',
  SECURITY = 'security',
  DATABASE = 'database',
  AUTH = 'auth'
}

export interface ConfigCollection {
  readonly environment: EnvironmentConfig;
  readonly logging: LoggingConfig;
  readonly security: SecurityConfig;
  readonly database: DatabaseConfig;
}

export interface ConfigManagerOptions {
  readonly enableWatching?: boolean;
  readonly enableCaching?: boolean;
  readonly cacheTimeout?: number;
  readonly validateOnLoad?: boolean;
}

export class ConfigManager {
  private static instance: ConfigManager | null = null;
  
  private readonly logger: Logger;
  private readonly validator: ConfigValidator;
  private readonly cache: ConfigCache;
  private readonly watcher: ConfigWatcher;
  private readonly options: Required<ConfigManagerOptions>;
  
  private configs: ConfigCollection | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor(options: ConfigManagerOptions = {}) {
    this.logger = new Logger('ConfigManager');
    this.validator = new ConfigValidator();
    this.cache = new ConfigCache();
    this.watcher = new ConfigWatcher();
    
    this.options = {
      enableWatching: options.enableWatching ?? process.env.NODE_ENV === 'development',
      enableCaching: options.enableCaching ?? true,
      cacheTimeout: options.cacheTimeout ?? 300000, // 5 minutes
      validateOnLoad: options.validateOnLoad ?? true
    };
  }

  public static getInstance(options?: ConfigManagerOptions): ConfigManager {
    ConfigManager.instance ??= new ConfigManager(options);
    return ConfigManager.instance;
  }

  public static reset(): void {
    if (ConfigManager.instance) {
      ConfigManager.instance.destroy();
      ConfigManager.instance = null;
    }
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      this.logger.info('Initializing configuration manager...');
      
      // Load all configurations
      const environmentConfig = this.loadEnvironmentConfig();
      const loggingConfig = this.loadLoggingConfig(environmentConfig);
      const securityConfig = this.loadSecurityConfig(environmentConfig);
      const databaseConfig = this.loadDatabaseConfig(environmentConfig);

      this.configs = {
        environment: environmentConfig,
        logging: loggingConfig,
        security: securityConfig,
        database: databaseConfig
      };

      // Validate all configurations if enabled
      if (this.options.validateOnLoad) {
        const validationResult = this.validator.validateAll(this.configs);
        
        if (!validationResult.isValid) {
          throw new Error(`Configuration validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
        }

        if (validationResult.warnings.length > 0) {
          this.logger.warn('Configuration warnings detected', {
            warnings: validationResult.warnings.map(w => ({ field: w.field, message: w.message }))
          });
        }
      }

      // Cache configurations if enabled
      if (this.options.enableCaching) {
        this.cacheConfigurations();
      }

      // Setup file watching if enabled
      if (this.options.enableWatching) {
        this.setupConfigWatching();
      }

      this.isInitialized = true;
      this.logger.info('Configuration manager initialized successfully', {
        environment: environmentConfig.nodeEnv,
        enableWatching: this.options.enableWatching,
        enableCaching: this.options.enableCaching
      });

    } catch (error) {
      this.logger.error('Failed to initialize configuration manager', error);
      throw error;
    }
  }

  public getConfig<T extends keyof ConfigCollection>(type: T): ConfigCollection[T] {
    if (!this.isInitialized || !this.configs) {
      throw new Error('Configuration manager not initialized. Call initialize() first.');
    }

    // Try cache first if enabled
    if (this.options.enableCaching) {
      const cached = this.cache.retrieve<ConfigCollection[T]>(type);
      if (cached && !this.cache.isExpired(type, this.options.cacheTimeout)) {
        return cached;
      }
    }

    const config = this.configs[type];
    
    // Update cache if enabled
    if (this.options.enableCaching) {
      this.cache.store(type, config);
    }

    return config;
  }

  public async reloadConfig(type: ConfigType): Promise<void> {
    if (!this.isInitialized || !this.configs) {
      throw new Error('Configuration manager not initialized');
    }

    try {
      this.logger.info(`Reloading configuration: ${type}`);

      let newConfig: any;
      
      switch (type) {
        case ConfigType.ENVIRONMENT:
          newConfig = this.loadEnvironmentConfig();
          break;
        case ConfigType.LOGGING:
          newConfig = this.loadLoggingConfig(this.configs.environment);
          break;
        case ConfigType.SECURITY:
          newConfig = this.loadSecurityConfig(this.configs.environment);
          break;
        case ConfigType.DATABASE:
          newConfig = this.loadDatabaseConfig(this.configs.environment);
          break;
        default:
          throw new Error(`Unsupported config type: ${type}`);
      }

      // Validate new configuration
      const validationResult = this.validateSingleConfig(type, newConfig);
      if (!validationResult.isValid) {
        throw new Error(`Configuration validation failed for ${type}: ${validationResult.errors.map(e => e.message).join(', ')}`);
      }

      // Update configuration
      this.configs = {
        ...this.configs,
        [type]: newConfig
      };

      // Invalidate cache
      if (this.options.enableCaching) {
        this.cache.invalidate(type);
      }

      this.logger.info(`Configuration reloaded successfully: ${type}`);

    } catch (error) {
      this.logger.error(`Failed to reload configuration: ${type}`, error);
      throw error;
    }
  }

  public validateAllConfigs(): ValidationResult {
    if (!this.configs) {
      throw new Error('Configuration manager not initialized');
    }

    return this.validator.validateAll(this.configs);
  }

  public getConfigSummary(): Record<string, any> {
    if (!this.configs) {
      throw new Error('Configuration manager not initialized');
    }

    return {
      environment: EnvironmentConfigFactory.getConfigSummary(this.configs.environment),
      logging: LoggingConfigFactory.getConfigSummary(this.configs.logging),
      security: SecurityConfigFactory.getConfigSummary(this.configs.security),
      database: DatabaseConfigFactory.getConfigSummary(this.configs.database),
      manager: {
        initialized: this.isInitialized,
        enableWatching: this.options.enableWatching,
        enableCaching: this.options.enableCaching,
        cacheTimeout: this.options.cacheTimeout,
        cacheStats: this.cache.getStats()
      }
    };
  }

  public destroy(): void {
    try {
      this.logger.info('Destroying configuration manager...');
      
      this.watcher.stopAll();
      this.cache.clear();
      this.isInitialized = false;
      this.configs = null;
      this.initializationPromise = null;
      
      this.logger.info('Configuration manager destroyed');
    } catch (error) {
      this.logger.error('Error during configuration manager destruction', error);
    }
  }

  private loadEnvironmentConfig(): EnvironmentConfig {
    try {
      return EnvironmentConfigFactory.createFromEnvironment();
    } catch (error) {
      this.logger.error('Failed to load environment configuration', error);
      throw error;
    }
  }

  private loadLoggingConfig(envConfig: EnvironmentConfig): LoggingConfig {
    try {
      return LoggingConfigFactory.createFromEnvironment(envConfig);
    } catch (error) {
      this.logger.error('Failed to load logging configuration', error);
      throw error;
    }
  }

  private loadSecurityConfig(envConfig: EnvironmentConfig): SecurityConfig {
    try {
      return SecurityConfigFactory.createFromEnvironment(envConfig);
    } catch (error) {
      this.logger.error('Failed to load security configuration', error);
      throw error;
    }
  }

  private loadDatabaseConfig(envConfig: EnvironmentConfig): DatabaseConfig {
    try {
      return DatabaseConfigFactory.createFromEnvironment(envConfig);
    } catch (error) {
      this.logger.error('Failed to load database configuration', error);
      throw error;
    }
  }

  private validateSingleConfig(type: ConfigType, config: any): ValidationResult {
    if (!this.configs) {
      throw new Error('Configuration manager not initialized');
    }

    switch (type) {
      case ConfigType.ENVIRONMENT:
        return this.validator.validateEnvironment(config);
      case ConfigType.LOGGING:
        return this.validator.validateLogging(config, this.configs.environment);
      case ConfigType.SECURITY:
        return this.validator.validateSecurity(config, this.configs.environment);
      case ConfigType.DATABASE:
        return this.validator.validateDatabase(config, this.configs.environment);
      default:
        throw new Error(`Unsupported config type for validation: ${type}`);
    }
  }

  private cacheConfigurations(): void {
    if (!this.configs) return;

    try {
      this.cache.store(ConfigType.ENVIRONMENT, this.configs.environment);
      this.cache.store(ConfigType.LOGGING, this.configs.logging);
      this.cache.store(ConfigType.SECURITY, this.configs.security);
      this.cache.store(ConfigType.DATABASE, this.configs.database);
      
      this.logger.debug('Configurations cached successfully');
    } catch (error) {
      this.logger.warn('Failed to cache configurations', error);
    }
  }

  private setupConfigWatching(): void {
    try {
      // Watch environment variables changes
      this.watcher.watchEnvironment(() => {
        this.handleConfigChange(ConfigType.ENVIRONMENT);
      });

      this.logger.debug('Configuration watching setup completed');
    } catch (error) {
      this.logger.warn('Failed to setup configuration watching', error);
    }
  }

  private async handleConfigChange(type: ConfigType): Promise<void> {
    try {
      this.logger.info(`Configuration change detected: ${type}`);
      await this.reloadConfig(type);
    } catch (error) {
      this.logger.error(`Failed to handle configuration change: ${type}`, error);
    }
  }
}