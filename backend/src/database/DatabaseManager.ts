import { Pool, PoolClient, QueryResult, QueryResultRow, PoolConfig } from 'pg';
import { MigrationRunner } from './MigrationRunner';
import { IndexManager } from './IndexManager';

/**
 * Database connection configuration interface
 */
export interface ConnectionPoolConfig {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly user: string;
  readonly password: string;
  readonly max?: number;
  readonly idleTimeoutMillis?: number;
  readonly connectionTimeoutMillis?: number;
  readonly ssl?: boolean | object;
}

/**
 * Database query execution options
 */
export interface QueryOptions {
  readonly timeout?: number;
  readonly retries?: number;
  readonly name?: string;
}

/**
 * Transaction query definition
 */
export interface TransactionQuery {
  readonly sql: string;
  readonly params?: any[];
  readonly name?: string;
}

/**
 * Connection pool statistics
 */
export interface PoolStats {
  readonly totalCount: number;
  readonly idleCount: number;
  readonly waitingCount: number;
  readonly isHealthy: boolean;
}

/**
 * Database operation result with metadata
 */
export interface DatabaseResult<T extends QueryResultRow = any> {
  readonly rows: readonly T[];
  readonly rowCount: number;
  readonly duration: number;
  readonly query: string;
}

/**
 * Central database management class handling connections, migrations, and indexing
 */
export class DatabaseManager {
  private readonly connectionPool: Pool;
  private readonly migrationRunner: MigrationRunner;
  private readonly indexManager: IndexManager;
  private isInitialized = false;
  private readonly config: ConnectionPoolConfig;

  constructor(config: ConnectionPoolConfig) {
    this.config = { ...config };
    
    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.max ?? 20,
      idleTimeoutMillis: config.idleTimeoutMillis ?? 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis ?? 2000,
      ssl: config.ssl ?? false,
      // Performance optimizations
      statement_timeout: 30000, // 30 second query timeout
      query_timeout: 25000, // 25 second query timeout
      allowExitOnIdle: true,
    };

    this.connectionPool = new Pool(poolConfig);
    this.migrationRunner = new MigrationRunner(this.connectionPool);
    this.indexManager = new IndexManager(this.connectionPool);

    // Handle pool errors
    this.connectionPool.on('error', (error) => {
      console.error('❌ Database pool error:', error);
    });

    this.connectionPool.on('connect', (client) => {
      console.log('🔗 New database connection established');
    });

    this.connectionPool.on('remove', () => {
      console.log('🔌 Database connection removed from pool');
    });
  }

  /**
   * Initialize database with migrations and indexes
   */
  async initializeDatabase(): Promise<void> {
    if (this.isInitialized) {
      console.log('ℹ️ Database already initialized');
      return;
    }

    try {
      console.log('🔄 Starting database initialization...');
      
      // Test connection first
      await this.testConnection();
      
      // Run migrations
      console.log('🔄 Running database migrations...');
      await this.migrationRunner.runPendingMigrations();
      
      // Create performance indexes
      console.log('🔄 Creating performance indexes...');
      await this.indexManager.createPerformanceIndexes();
      
      this.isInitialized = true;
      console.log('✅ Database initialized successfully');
      
      // Log final statistics
      const stats = this.getPoolStats();
      console.log(`📊 Connection pool: ${stats.totalCount} total, ${stats.idleCount} idle, ${stats.waitingCount} waiting`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Database initialization failed:', errorMessage);
      throw new DatabaseInitializationError(`Database initialization failed: ${errorMessage}`, { cause: error });
    }
  }

  /**
   * Test database connection
   */
  private async testConnection(): Promise<void> {
    const startTime = Date.now();
    const client = await this.connectionPool.connect();
    
    try {
      const result = await client.query('SELECT NOW() as current_time, version() as version');
      const duration = Date.now() - startTime;
      
      console.log(`✅ Database connection established in ${duration}ms`);
      console.log(`📅 Server time: ${result.rows[0]?.current_time}`);
      console.log(`🐘 PostgreSQL version: ${result.rows[0]?.version?.split(',')[0]}`);
      
    } finally {
      client.release();
    }
  }

  /**
   * Get a database connection from the pool
   */
  async getConnection(): Promise<PoolClient> {
    try {
      return await this.connectionPool.connect();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new ConnectionAcquisitionError(`Failed to acquire database connection: ${errorMessage}`, { cause: error });
    }
  }

  /**
   * Execute a query with optional parameters and options
   */
  async executeQuery<T extends QueryResultRow = any>(
    sql: string, 
    params: any[] = [], 
    options: QueryOptions = {}
  ): Promise<DatabaseResult<T>> {
    const startTime = Date.now();
    const client = await this.getConnection();
    
    try {
      // Set query timeout if specified
      if (options.timeout) {
        await client.query(`SET statement_timeout = ${options.timeout}`);
      }

      const result: QueryResult<T> = await client.query<T>(sql, params);
      const duration = Date.now() - startTime;

      // Log slow queries (>1 second)
      if (duration > 1000) {
        console.warn(`🐌 Slow query detected (${duration}ms):`, {
          sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
          params: params.length,
          rows: result.rowCount,
        });
      }

      return {
        rows: result.rows,
        rowCount: result.rowCount ?? 0,
        duration,
        query: sql,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error('❌ Query execution failed:', {
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        params: params.length,
        duration,
        error: errorMessage,
      });

      throw new QueryExecutionError(`Query execution failed: ${errorMessage}`, { 
        cause: error,
        query: sql,
        params,
        duration,
      });

    } finally {
      // Reset timeout
      if (options.timeout) {
        try {
          await client.query('SET statement_timeout = DEFAULT');
        } catch {
          // Ignore timeout reset errors
        }
      }
      client.release();
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  async executeTransaction<T extends QueryResultRow = any>(
    queries: TransactionQuery[],
    options: QueryOptions = {}
  ): Promise<readonly DatabaseResult<T>[]> {
    if (queries.length === 0) {
      throw new InvalidTransactionError('Transaction must contain at least one query');
    }

    const startTime = Date.now();
    const client = await this.getConnection();
    const results: DatabaseResult<T>[] = [];
    
    try {
      // Begin transaction
      await client.query('BEGIN');
      console.log(`🔄 Starting transaction with ${queries.length} queries`);

      // Set transaction timeout if specified
      if (options.timeout) {
        await client.query(`SET statement_timeout = ${options.timeout}`);
      }

      // Execute each query in sequence
      for (const [index, query] of queries.entries()) {
        try {
          const queryStartTime = Date.now();
          const result: QueryResult<T> = await client.query<T>(query.sql, query.params);
          const queryDuration = Date.now() - queryStartTime;

          results.push({
            rows: result.rows,
            rowCount: result.rowCount ?? 0,
            duration: queryDuration,
            query: query.sql,
          });

          console.log(`✅ Transaction query ${index + 1}/${queries.length} completed (${queryDuration}ms)`);

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`❌ Transaction query ${index + 1} failed:`, {
            sql: query.sql.substring(0, 100) + (query.sql.length > 100 ? '...' : ''),
            error: errorMessage,
          });
          throw error;
        }
      }

      // Commit transaction
      await client.query('COMMIT');
      const totalDuration = Date.now() - startTime;
      
      console.log(`✅ Transaction completed successfully (${totalDuration}ms, ${results.length} queries)`);
      return results;

    } catch (error) {
      // Rollback transaction
      try {
        await client.query('ROLLBACK');
        console.log('🔄 Transaction rolled back');
      } catch (rollbackError) {
        console.error('❌ Failed to rollback transaction:', rollbackError);
      }

      const totalDuration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      throw new TransactionExecutionError(`Transaction execution failed: ${errorMessage}`, {
        cause: error,
        queriesExecuted: results.length,
        totalQueries: queries.length,
        duration: totalDuration,
      });

    } finally {
      // Reset timeout
      if (options.timeout) {
        try {
          await client.query('SET statement_timeout = DEFAULT');
        } catch {
          // Ignore timeout reset errors
        }
      }
      client.release();
    }
  }

  /**
   * Execute a query that expects a single row result
   */
  async executeQuerySingle<T extends QueryResultRow = any>(
    sql: string,
    params: any[] = [],
    options: QueryOptions = {}
  ): Promise<T | null> {
    const result = await this.executeQuery<T>(sql, params, options);
    
    if (result.rowCount === 0) {
      return null;
    }
    
    if (result.rowCount > 1) {
      throw new InvalidQueryResultError(`Expected single row, got ${result.rowCount} rows`);
    }
    
    return result.rows[0] ?? null;
  }

  /**
   * Check if a table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    const result = await this.executeQuerySingle<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )`,
      [tableName]
    );
    
    return result?.exists ?? false;
  }

  /**
   * Get connection pool statistics
   */
  getPoolStats(): PoolStats {
    return {
      totalCount: this.connectionPool.totalCount,
      idleCount: this.connectionPool.idleCount,
      waitingCount: this.connectionPool.waitingCount,
      isHealthy: this.connectionPool.totalCount > 0 && !this.connectionPool.ended,
    };
  }

  /**
   * Get database configuration (without sensitive data)
   */
  getConfig(): Omit<ConnectionPoolConfig, 'password'> {
    const { password, ...safeConfig } = this.config;
    return safeConfig;
  }

  /**
   * Get migration runner instance
   */
  getMigrationRunner(): MigrationRunner {
    return this.migrationRunner;
  }

  /**
   * Get index manager instance
   */
  getIndexManager(): IndexManager {
    return this.indexManager;
  }

  /**
   * Perform database health check
   */
  async healthCheck(): Promise<{
    readonly status: 'healthy' | 'degraded' | 'unhealthy';
    readonly details: {
      readonly connection: boolean;
      readonly poolStats: PoolStats;
      readonly latency?: number;
      readonly version?: string;
      readonly error?: string;
    };
  }> {
    try {
      const startTime = Date.now();
      const result = await this.executeQuerySingle<{ version: string }>(
        'SELECT version() as version'
      );
      const latency = Date.now() - startTime;
      const poolStats = this.getPoolStats();

      // Determine health status
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (latency > 1000) {
        status = 'degraded';
      }
      
      if (!poolStats.isHealthy || poolStats.totalCount === 0) {
        status = 'unhealthy';
      }

      return {
        status,
        details: {
          connection: true,
          poolStats,
          latency,
          version: result?.version?.split(',')[0],
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        status: 'unhealthy',
        details: {
          connection: false,
          poolStats: this.getPoolStats(),
          error: errorMessage,
        },
      };
    }
  }

  /**
   * Close all database connections gracefully
   */
  async closeConnections(): Promise<void> {
    if (!this.connectionPool || this.connectionPool.ended) {
      console.log('ℹ️ Database pool already closed');
      return;
    }

    console.log('🔄 Closing database connections...');
    
    try {
      // Wait for active queries to complete (max 10 seconds)
      const closePromise = this.connectionPool.end();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection close timeout')), 10000);
      });

      await Promise.race([closePromise, timeoutPromise]);
      console.log('✅ Database connections closed gracefully');

    } catch (error) {
      console.error('⚠️ Error during connection close:', error);
      // Force close connections
      this.connectionPool.removeAllListeners();
      console.log('🔌 Database connections force closed');
    }

    this.isInitialized = false;
  }
}

/**
 * Custom error classes for better error handling
 */
export class DatabaseError extends Error {
  constructor(message: string, public readonly context?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class DatabaseInitializationError extends DatabaseError {
  constructor(message: string, context?: any) {
    super(message, context);
    this.name = 'DatabaseInitializationError';
  }
}

export class ConnectionAcquisitionError extends DatabaseError {
  constructor(message: string, context?: any) {
    super(message, context);
    this.name = 'ConnectionAcquisitionError';
  }
}

export class QueryExecutionError extends DatabaseError {
  constructor(message: string, context?: any) {
    super(message, context);
    this.name = 'QueryExecutionError';
  }
}

export class TransactionExecutionError extends DatabaseError {
  constructor(message: string, context?: any) {
    super(message, context);
    this.name = 'TransactionExecutionError';
  }
}

export class InvalidTransactionError extends DatabaseError {
  constructor(message: string, context?: any) {
    super(message, context);
    this.name = 'InvalidTransactionError';
  }
}

export class InvalidQueryResultError extends DatabaseError {
  constructor(message: string, context?: any) {
    super(message, context);
    this.name = 'InvalidQueryResultError';
  }
}