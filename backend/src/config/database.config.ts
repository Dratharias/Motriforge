import { ConnectionPoolConfig } from "@/database/DatabaseManager";
import { MigrationConfig, IndexConfig, MonitoringConfig, BackupConfig, DatabaseSecurityConfig, DatabaseConfig } from "@/database/types/DatabaseTypes";
import { EnvironmentConfig, ValidationResult } from "./environment.config";
import { DatabaseConfigValidator } from "./validators/database/DatabaseConfigValidator";
import { getEnvironmentConfig } from ".";

export class DatabaseConfigFactory {
  private static readonly validator = new DatabaseConfigValidator();

  public static createFromEnvironment(envConfig?: EnvironmentConfig): DatabaseConfig {
    const environment = envConfig ?? getEnvironmentConfig();
    
    const host = process.env.DB_HOST ?? 'localhost';
    const port = parseInt(process.env.DB_PORT ?? '5432', 10);
    const database = process.env.DB_NAME ?? 'motriforge';
    const user = process.env.DB_USER ?? 'motriforge';
    const password = process.env.DB_PASSWORD ?? '';
    const maxConnections = parseInt(process.env.DB_MAX_CONNECTIONS ?? '20', 10);
    const sslEnabled = process.env.DB_SSL === 'true';

    if (!password && environment.isProduction) {
      throw new Error('Database password is required in production. Set DB_PASSWORD environment variable.');
    }

    const connection: ConnectionPoolConfig = {
      host,
      port,
      database,
      user,
      password,
      max: maxConnections,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT ?? '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT ?? '2000', 10),
      ssl: sslEnabled ? { rejectUnauthorized: false } : false,
    };

    const migrations: MigrationConfig = {
      path: process.env.DB_MIGRATIONS_PATH ?? './src/database/migrations',
      autoRun: environment.isDevelopment || process.env.DB_AUTO_MIGRATE === 'true',
    };

    const indexes: IndexConfig = {
      autoCreate: environment.isDevelopment || process.env.DB_AUTO_INDEXES === 'true',
      analyzeUsage: environment.isDevelopment || process.env.DB_ANALYZE_INDEXES === 'true',
    };

    const monitoring: MonitoringConfig = {
      enabled: environment.enableMetrics,
      slowQueryThreshold: parseInt(process.env.DB_SLOW_QUERY_THRESHOLD ?? '1000', 10),
      logQueries: environment.isDevelopment || process.env.DB_LOG_QUERIES === 'true',
      enableQueryPlan: environment.isDevelopment && process.env.DB_QUERY_PLAN !== 'false',
    };

    const backup: BackupConfig = {
      enabled: environment.isProduction || process.env.DB_BACKUP_ENABLED === 'true',
      schedule: process.env.DB_BACKUP_SCHEDULE ?? '0 2 * * *', // Daily at 2 AM
      retention: parseInt(process.env.DB_BACKUP_RETENTION ?? '7', 10), // 7 days
      location: process.env.DB_BACKUP_LOCATION ?? './backups',
    };

    const security: DatabaseSecurityConfig = {
      encryptionKey: process.env.DB_ENCRYPTION_KEY,
      enableRowLevelSecurity: environment.isProduction || process.env.DB_RLS === 'true',
      auditLogging: environment.isProduction || process.env.DB_AUDIT_LOG === 'true',
      allowedHosts: process.env.DB_ALLOWED_HOSTS?.split(',') ?? [],
    };

    return {
      connection,
      migrations,
      indexes,
      monitoring,
      backup,
      security
    };
  }

  public static createForTesting(): DatabaseConfig {
    const connection: ConnectionPoolConfig = {
      host: process.env.TEST_DB_HOST ?? 'localhost',
      port: parseInt(process.env.TEST_DB_PORT ?? '5432', 10),
      database: process.env.TEST_DB_NAME ?? 'motriforge_test',
      user: process.env.TEST_DB_USER ?? 'motriforge_test',
      password: process.env.TEST_DB_PASSWORD ?? 'test_password',
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 1000,
      ssl: false,
    };

    const migrations: MigrationConfig = {
      path: './src/database/migrations',
      autoRun: true,
    };

    const indexes: IndexConfig = {
      autoCreate: true,
      analyzeUsage: false,
    };

    const monitoring: MonitoringConfig = {
      enabled: false,
      slowQueryThreshold: 10000,
      logQueries: false,
      enableQueryPlan: false,
    };

    const backup: BackupConfig = {
      enabled: false,
      schedule: '',
      retention: 1,
      location: './test-backups',
    };

    const security: DatabaseSecurityConfig = {
      enableRowLevelSecurity: false,
      auditLogging: false,
      allowedHosts: [],
      encryptionKey: undefined
    };

    return {
      connection,
      migrations,
      indexes,
      monitoring,
      backup,
      security
    };
  }

  public static validateConfig(config: DatabaseConfig): ValidationResult {
    return this.validator.validate(config);
  }

  public static createConnectionString(config: ConnectionPoolConfig): string {
    const { host, port, database, user, password, ssl } = config;
    const sslParam = ssl ? 'sslmode=require' : 'sslmode=disable';
    return `postgresql://${user}:${password}@${host}:${port}/${database}?${sslParam}`;
  }

  public static getConfigSummary(config: DatabaseConfig): Record<string, any> {
    return {
      connection: {
        host: config.connection.host,
        port: config.connection.port,
        database: config.connection.database,
        user: config.connection.user,
        maxConnections: config.connection.max,
        ssl: !!config.connection.ssl,
      },
      features: {
        autoMigrations: config.migrations.autoRun,
        autoIndexes: config.indexes.autoCreate,
        monitoring: config.monitoring?.enabled ?? false,
        backup: config.backup?.enabled ?? false,
        security: {
          rls: config.security?.enableRowLevelSecurity ?? false,
          audit: config.security?.auditLogging ?? false,
        }
      },
      performance: {
        slowQueryThreshold: config.monitoring?.slowQueryThreshold ?? 1000,
        idleTimeout: config.connection.idleTimeoutMillis,
        connectionTimeout: config.connection.connectionTimeoutMillis,
      }
    };
  }
}

export type { DatabaseConfig };

