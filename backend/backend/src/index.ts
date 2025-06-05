import { serve } from '@hono/node-server';
import { createApp } from './app';

/**
 * Start the MōtriForge backend server
 */
async function startServer(): Promise<void> {
  try {
    const app = await createApp();
    const port = parseInt(process.env.PORT ?? '3001', 10);
    
    serve({
      fetch: app.fetch,
      port,
    });
    
    console.log(`🚀 MōtriForge API server running on http://localhost:${port}`);
    console.log(`📊 Health check available at http://localhost:${port}/health`);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 Dev info available at http://localhost:${port}/dev/db-info`);
    }
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer(); from 'pg';
import { MigrationRunner } from './MigrationRunner';
import { IndexManager } from './IndexManager';
import { ConnectionPoolConfig } from './types/DatabaseTypes';

/**
 * Central database management class handling connections, migrations, and indexing
 */
export class DatabaseManager {
  private readonly connectionPool: Pool;
  private readonly migrationRunner: MigrationRunner;
  private readonly indexManager: IndexManager;
  private isInitialized = false;

  constructor(config: ConnectionPoolConfig) {
    this.connectionPool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.max ?? 20,
      idleTimeoutMillis: config.idleTimeoutMillis ?? 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis ?? 2000,
      ssl: config.ssl ?? { rejectUnauthorized: false },
    });

    this.migrationRunner = new MigrationRunner(this.connectionPool);
    this.indexManager = new IndexManager(this.connectionPool);
  }

  /**
   * Initialize database with migrations and indexes
   */
  async initializeDatabase(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Test connection
      await this.testConnection();
      
      // Run migrations
      await this.migrationRunner.runPendingMigrations();
      
      // Create performance indexes
      await this.indexManager.createPerformanceIndexes();
      
      this.isInitialized = true;
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test database connection
   */
  private async testConnection(): Promise<void> {
    const client = await this.connectionPool.connect();
    try {
      await client.query('SELECT NOW()');
      console.log('✅ Database connection established');
    } finally {
      client.release();
    }
  }

  /**
   * Get a database connection from the pool
   */
  async getConnection(): Promise<PoolClient> {
    return this.connectionPool.connect();
  }

  /**
   * Execute a query with optional parameters
   */
  async executeQuery<T = any>(sql: string, params: readonly any[] = []): Promise<QueryResult<T>> {
    const client = await this.getConnection();
    try {
      return await client.query<T>(sql, params);
    } finally {
      client.release();
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  async executeTransaction<T>(
    queries: Array<{ sql: string; params?: readonly any[] }>
  ): Promise<QueryResult<T>[]> {
    const client = await this.getConnection();
    try {
      await client.query('BEGIN');
      
      const results: QueryResult<T>[] = [];
      for (const { sql, params = [] } of queries) {
        const result = await client.query<T>(sql, params);
        results.push(result);
      }
      
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get connection pool statistics
   */
  getPoolStats() {
    return {
      totalCount: this.connectionPool.totalCount,
      idleCount: this.connectionPool.idleCount,
      waitingCount: this.connectionPool.waitingCount,
    };
  }

  /**
   * Close all database connections
   */
  async closeConnections(): Promise<void> {
    if (this.connectionPool) {
      await this.connectionPool.end();
      console.log('✅ Database connections closed');
    }
  }
}

