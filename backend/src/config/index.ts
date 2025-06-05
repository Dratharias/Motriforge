import { ConfigManager, ConfigManagerOptions } from './ConfigManager';
import { EnvironmentConfig, ValidationResult } from './environment.config';
import { LoggingConfig } from './logging.config';
import { SecurityConfig } from './security.config';
import { DatabaseConfig } from './database.config';

export * from './environment.config';
export * from './logging.config';
export * from './security.config';
export * from './database.config';
export * from './ConfigManager';
export * from './ConfigValidator';
export * from './ConfigCache';
export * from './ConfigWatcher';

// Global configuration manager instance
let globalConfigManager: ConfigManager | null = null;

/**
 * Initialize the global configuration manager
 */
export async function initializeConfig(options?: ConfigManagerOptions): Promise<void> {
  if (globalConfigManager) {
    throw new Error('Configuration already initialized. Use resetConfig() to reinitialize.');
  }

  globalConfigManager = ConfigManager.getInstance(options);
  await globalConfigManager.initialize();
}

/**
 * Get the environment configuration
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  if (!globalConfigManager) {
    throw new Error('Configuration not initialized. Call initializeConfig() first.');
  }
  return globalConfigManager.getConfig('environment');
}

/**
 * Get the logging configuration
 */
export function getLoggingConfig(): LoggingConfig {
  if (!globalConfigManager) {
    throw new Error('Configuration not initialized. Call initializeConfig() first.');
  }
  return globalConfigManager.getConfig('logging');
}

/**
 * Get the security configuration
 */
export function getSecurityConfig(): SecurityConfig {
  if (!globalConfigManager) {
    throw new Error('Configuration not initialized. Call initializeConfig() first.');
  }
  return globalConfigManager.getConfig('security');
}

/**
 * Get the database configuration
 */
export function getDatabaseConfig(): DatabaseConfig {
  if (!globalConfigManager) {
    throw new Error('Configuration not initialized. Call initializeConfig() first.');
  }
  return globalConfigManager.getConfig('database');
}

/**
 * Get all configurations as a collection
 */
export function getAllConfigs(): {
  readonly environment: EnvironmentConfig;
  readonly logging: LoggingConfig;
  readonly security: SecurityConfig;
  readonly database: DatabaseConfig;
} {
  if (!globalConfigManager) {
    throw new Error('Configuration not initialized. Call initializeConfig() first.');
  }
  
  return {
    environment: globalConfigManager.getConfig('environment'),
    logging: globalConfigManager.getConfig('logging'),
    security: globalConfigManager.getConfig('security'),
    database: globalConfigManager.getConfig('database')
  };
}

/**
 * Validate all current configurations
 */
export function validateConfigurations(): ValidationResult {
  if (!globalConfigManager) {
    throw new Error('Configuration not initialized. Call initializeConfig() first.');
  }
  return globalConfigManager.validateAllConfigs();
}

/**
 * Get configuration summary for monitoring and debugging
 */
export function getConfigSummary(): Record<string, any> {
  if (!globalConfigManager) {
    throw new Error('Configuration not initialized. Call initializeConfig() first.');
  }
  return globalConfigManager.getConfigSummary();
}

/**
 * Check if configuration is initialized
 */
export function isConfigInitialized(): boolean {
  return globalConfigManager !== null;
}

/**
 * Reset and destroy the global configuration manager
 */
export function resetConfig(): void {
  if (globalConfigManager) {
    globalConfigManager.destroy();
    ConfigManager.reset();
    globalConfigManager = null;
  }
}

/**
 * Hot reload a specific configuration type
 */
export async function reloadConfig(type: 'environment' | 'logging' | 'security' | 'database'): Promise<void> {
  if (!globalConfigManager) {
    throw new Error('Configuration not initialized. Call initializeConfig() first.');
  }
  
  await globalConfigManager.reloadConfig(type as any);
}

/**
 * Utility function for testing - creates minimal test configuration
 */
export function createTestConfig(): {
  readonly environment: EnvironmentConfig;
  readonly logging: LoggingConfig;
  readonly security: SecurityConfig;
  readonly database: DatabaseConfig;
} {
  const { EnvironmentConfigFactory } = require('./environment.config');
  const { LoggingConfigFactory } = require('./logging.config');
  const { SecurityConfigFactory } = require('./security.config');
  const { DatabaseConfigFactory } = require('./database.config');
  
  const environment = EnvironmentConfigFactory.createForTesting();
  const logging = LoggingConfigFactory.createForTesting();
  const security = SecurityConfigFactory.createForTesting();
  const database = DatabaseConfigFactory.createForTesting();
  
  return { environment, logging, security, database };
}

/**
 * Development helper to watch for configuration changes
 */
export async function enableConfigWatching(): Promise<void> {
  if (!globalConfigManager) {
    throw new Error('Configuration not initialized. Call initializeConfig() first.');
  }
  
  // Configuration watching is set up during initialization
  // This function is for explicit enabling if disabled initially
  await initializeConfig({ enableWatching: true });
}

/**
 * Get configuration manager for advanced operations
 * Should be used sparingly, prefer specific getter functions
 */
export function getConfigManager(): ConfigManager {
  if (!globalConfigManager) {
    throw new Error('Configuration not initialized. Call initializeConfig() first.');
  }
  return globalConfigManager;
}

// Graceful shutdown handler
process.on('SIGINT', () => {
  resetConfig();
});

process.on('SIGTERM', () => {
  resetConfig();
});

// Handle uncaught exceptions to clean up configuration
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception, cleaning up configuration:', error);
  resetConfig();
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection, cleaning up configuration:', reason);
  resetConfig();
});

// Export type-only interfaces for consumers
export type {
  EnvironmentConfig,
  LoggingConfig,
  SecurityConfig,
  DatabaseConfig,
  ValidationResult,
  ConfigManagerOptions
};

// Configuration constants for common use cases
export const CONFIG_DEFAULTS = {
  CACHE_TIMEOUT: 5 * 60 * 1000, // 5 minutes
  WATCH_DEBOUNCE: 500, // 500ms
  MAX_CACHE_ENTRIES: 100,
  VALIDATION_TIMEOUT: 30000, // 30 seconds
  ENV_WATCH_INTERVAL: 5000 // 5 seconds
} as const;

// Configuration status helpers
export const ConfigStatus = {
  isProduction: (): boolean => {
    try {
      return getEnvironmentConfig().isProduction;
    } catch {
      return process.env.NODE_ENV === 'production';
    }
  },
  
  isDevelopment: (): boolean => {
    try {
      return getEnvironmentConfig().isDevelopment;
    } catch {
      return process.env.NODE_ENV === 'development';
    }
  },
  
  isTesting: (): boolean => {
    try {
      return getEnvironmentConfig().isTesting;
    } catch {
      return process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';
    }
  },
  
  getLogLevel: (): string => {
    try {
      return getLoggingConfig().level;
    } catch {
      return process.env.LOG_LEVEL ?? 'info';
    }
  },

  getDatabaseHost: (): string => {
    try {
      return getDatabaseConfig().connection.host;
    } catch {
      return process.env.DB_HOST ?? 'localhost';
    }
  }
} as const;