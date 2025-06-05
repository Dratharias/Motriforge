import type { DatabaseConfig, ConnectionPoolConfig } from '@/database/types/DatabaseTypes.js';

export class DatabaseConfigFactory {
  static createFromEnvironment(): DatabaseConfig {
    const host = process.env.DB_HOST ?? 'localhost';
    const port = parseInt(process.env.DB_PORT ?? '5432', 10);
    const database = process.env.DB_NAME ?? 'motriforge';
    const user = process.env.DB_USER ?? 'motriforge';
    const password = process.env.DB_PASSWORD ?? '';
    const maxConnections = parseInt(process.env.DB_MAX_CONNECTIONS ?? '20', 10);
    const sslEnabled = process.env.DB_SSL === 'true';

    if (!password) {
      throw new Error('Database password is required. Set DB_PASSWORD environment variable.');
    }

    const connection: ConnectionPoolConfig = {
      host,
      port,
      database,
      user,
      password,
      max: maxConnections,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: sslEnabled ? { rejectUnauthorized: false } : false,
    };

    return {
      connection,
      migrations: {
        path: './src/database/migrations',
        autoRun: process.env.NODE_ENV !== 'production',
      },
      indexes: {
        autoCreate: process.env.NODE_ENV !== 'production',
        analyzeUsage: process.env.NODE_ENV !== 'production',
      },
    };
  }

  static createForTesting(): DatabaseConfig {
    const connection: ConnectionPoolConfig = {
      host: 'localhost',
      port: 5432,
      database: 'motriforge_test',
      user: 'motriforge_test',
      password: 'test_password',
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 1000,
      ssl: false,
    };

    return {
      connection,
      migrations: {
        path: './src/database/migrations',
        autoRun: true,
      },
      indexes: {
        autoCreate: true,
        analyzeUsage: false,
      },
    };
  }

  static validateConfig(config: DatabaseConfig): void {
    if (!config.connection.host) {
      throw new Error('Database host is required');
    }
    if (!config.connection.database) {
      throw new Error('Database name is required');
    }
    if (!config.connection.user) {
      throw new Error('Database user is required');
    }
    if (!config.connection.password) {
      throw new Error('Database password is required');
    }
    if (config.connection.port < 1 || config.connection.port > 65535) {
      throw new Error('Database port must be between 1 and 65535');
    }
  }

  static createConnectionString(config: ConnectionPoolConfig): string {
    const { host, port, database, user, password, ssl } = config;
    const sslParam = ssl ? 'sslmode=require' : 'sslmode=disable';
    return `postgresql://${user}:${password}@${host}:${port}/${database}?${sslParam}`;
  }
}