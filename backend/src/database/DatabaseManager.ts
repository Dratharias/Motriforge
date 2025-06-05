import { Pool, PoolClient, QueryResult, QueryResultRow, PoolConfig } from 'pg';
import { MigrationRunner } from './MigrationRunner.js';
import { IndexManager } from './IndexManager.js';

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

export interface QueryOptions {
  readonly timeout?: number;
  readonly retries?: number;
  readonly name?: string;
}

export interface TransactionQuery {
  readonly sql: string;
  readonly params?: any[];
  readonly name?: string;
}

export interface PoolStats {
  readonly totalCount: number;
  readonly idleCount: number;
  readonly waitingCount: number;
  readonly isHealthy: boolean;
}

export interface DatabaseResult<T extends QueryResultRow = any> {
  readonly rows: readonly T[];
  readonly rowCount: number;
  readonly duration: number;
  readonly query: string;
}

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
      statement_timeout: 30000,
      query_timeout: 25000,
      allowExitOnIdle: true,
    };

    this.connectionPool = new Pool(poolConfig);
    this.migrationRunner = new MigrationRunner(this.connectionPool);
    this.indexManager = new IndexManager(this.connectionPool);
    this.setupPoolEventHandlers();
  }

  private setupPoolEventHandlers(): void {
    this.connectionPool.on('error', (error) => {
      console.error('❌ Database pool error:', error);
    });

    this.connectionPool.on('connect', () => {
      console.log('🔗 New database connection established');
    });

    this.connectionPool.on('remove', () => {
      console.log('🔌 Database connection removed from pool');
    });
  }

  async initializeDatabase(): Promise<void> {
    if (this.isInitialized) {
      console.log('ℹ️ Database already initialized');
      return;
    }

    try {
      console.log('🔄 Starting database initialization...');
      await this.testConnection();
      console.log('🔄 Running database migrations...');
      await this.migrationRunner.runPendingMigrations();
      console.log('🔄 Creating performance indexes...');
      await this.indexManager.createPerformanceIndexes();
      this.isInitialized = true;
      console.log('✅ Database initialized successfully');
      const stats = this.getPoolStats();
      console.log(`📊 Connection pool: ${stats.totalCount} total, ${stats.idleCount} idle, ${stats.waitingCount} waiting`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Database initialization failed:', errorMessage);
      throw new DatabaseInitializationError(`Database initialization failed: ${errorMessage}`, { cause: error });
    }
  }

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

  async getConnection(): Promise<PoolClient> {
    try {
      return await this.connectionPool.connect();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new ConnectionAcquisitionError(`Failed to acquire database connection: ${errorMessage}`, { cause: error });
    }
  }

  async executeQuery<T extends QueryResultRow = any>(
    sql: string,
    params: any[] = [],
    options: QueryOptions = {}
  ): Promise<DatabaseResult<T>> {
    const startTime = Date.now();
    const client = await this.getConnection();
    
    try {
      await this.setQueryTimeout(client, options.timeout);
      const result: QueryResult<T> = await client.query<T>(sql, params);
      const duration = Date.now() - startTime;
      
      this.logSlowQuery(sql, params, result.rowCount ?? 0, duration);
      
      return {
        rows: result.rows,
        rowCount: result.rowCount ?? 0,
        duration,
        query: sql,
      };
    } catch (error) {
      this.logQueryError(sql, params, Date.now() - startTime, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new QueryExecutionError(`Query execution failed: ${errorMessage}`, {
        cause: error,
        query: sql,
        params,
        duration: Date.now() - startTime,
      });
    } finally {
      await this.resetQueryTimeout(client, options.timeout);
      client.release();
    }
  }

  async executeTransaction<T extends QueryResultRow = any>(
    queries: TransactionQuery[],
    options: QueryOptions = {}
  ): Promise<readonly DatabaseResult<T>[]> {
    this.validateTransactionQueries(queries);
    
    const startTime = Date.now();
    const client = await this.getConnection();
    const results: DatabaseResult<T>[] = [];

    try {
      await this.beginTransaction(client, options.timeout);
      await this.executeTransactionQueries<T>(client, queries, results);
      await this.commitTransaction(client);
      
      this.logTransactionSuccess(queries.length, Date.now() - startTime, results.length);
      return results;
    } catch (error) {
      await this.rollbackTransaction(client);
      this.logTransactionError(queries.length, Date.now() - startTime, results.length, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new TransactionExecutionError(`Transaction execution failed: ${errorMessage}`, {
        cause: error,
        queriesExecuted: results.length,
        totalQueries: queries.length,
        duration: Date.now() - startTime,
      });
    } finally {
      await this.resetQueryTimeout(client, options.timeout);
      client.release();
    }
  }

  private validateTransactionQueries(queries: TransactionQuery[]): void {
    if (queries.length === 0) {
      throw new InvalidTransactionError('Transaction must contain at least one query');
    }
  }

  private async beginTransaction(client: PoolClient, timeout?: number): Promise<void> {
    await client.query('BEGIN');
    console.log('🔄 Starting transaction');
    if (timeout) {
      await client.query(`SET statement_timeout = ${timeout}`);
    }
  }

  private async executeTransactionQueries<T extends QueryResultRow>(
    client: PoolClient,
    queries: TransactionQuery[],
    results: DatabaseResult<T>[]
  ): Promise<void> {
    for (const [index, query] of queries.entries()) {
      const queryResult = await this.executeTransactionQuery<T>(client, query, index + 1, queries.length);
      results.push(queryResult);
    }
  }

  private async executeTransactionQuery<T extends QueryResultRow>(
    client: PoolClient,
    query: TransactionQuery,
    currentIndex: number,
    totalQueries: number
  ): Promise<DatabaseResult<T>> {
    try {
      const queryStartTime = Date.now();
      const result: QueryResult<T> = await client.query<T>(query.sql, query.params);
      const queryDuration = Date.now() - queryStartTime;
      
      console.log(`✅ Transaction query ${currentIndex}/${totalQueries} completed (${queryDuration}ms)`);
      
      return {
        rows: result.rows,
        rowCount: result.rowCount ?? 0,
        duration: queryDuration,
        query: query.sql,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Transaction query ${currentIndex} failed:`, {
        sql: query.sql.substring(0, 100) + (query.sql.length > 100 ? '...' : ''),
        error: errorMessage,
      });
      throw error;
    }
  }

  private async commitTransaction(client: PoolClient): Promise<void> {
    await client.query('COMMIT');
  }

  private async rollbackTransaction(client: PoolClient): Promise<void> {
    try {
      await client.query('ROLLBACK');
      console.log('🔄 Transaction rolled back');
    } catch (rollbackError) {
      console.error('❌ Failed to rollback transaction:', rollbackError);
    }
  }

  private async setQueryTimeout(client: PoolClient, timeout?: number): Promise<void> {
    if (timeout) {
      await client.query(`SET statement_timeout = ${timeout}`);
    }
  }

  private async resetQueryTimeout(client: PoolClient, timeout?: number): Promise<void> {
    if (timeout) {
      try {
        await client.query('SET statement_timeout = DEFAULT');
      } catch {
        // Ignore timeout reset errors
      }
    }
  }

  private logSlowQuery(sql: string, params: any[], rowCount: number, duration: number): void {
    if (duration > 1000) {
      console.warn(`🐌 Slow query detected (${duration}ms):`, {
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        params: params.length,
        rows: rowCount,
      });
    }
  }

  private logQueryError(sql: string, params: any[], duration: number, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Query execution failed:', {
      sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
      params: params.length,
      duration,
      error: errorMessage,
    });
  }

  private logTransactionSuccess(_totalQueries: number, duration: number, resultsCount: number): void {
    console.log(`✅ Transaction completed successfully (${duration}ms, ${resultsCount} queries)`);
  }

  private logTransactionError(totalQueries: number, duration: number, resultsCount: number, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Transaction failed after ${resultsCount}/${totalQueries} queries (${duration}ms):`, errorMessage);
  }

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

  getPoolStats(): PoolStats {
    return {
      totalCount: this.connectionPool.totalCount,
      idleCount: this.connectionPool.idleCount,
      waitingCount: this.connectionPool.waitingCount,
      isHealthy: this.connectionPool.totalCount > 0 && !this.connectionPool.ended,
    };
  }

  getConfig(): Omit<ConnectionPoolConfig, 'password'> {
    const { password, ...safeConfig } = this.config;
    return safeConfig;
  }

  getMigrationRunner(): MigrationRunner {
    return this.migrationRunner;
  }

  getIndexManager(): IndexManager {
    return this.indexManager;
  }

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

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (latency > 1000) {
        status = 'degraded';
      }
      if (!poolStats.isHealthy || poolStats.totalCount === 0) {
        status = 'unhealthy';
      }

      const healthDetails: {
        readonly connection: boolean;
        readonly poolStats: PoolStats;
        readonly latency?: number;
        readonly version?: string;
      } = {
        connection: true,
        poolStats,
        latency,
      };
      
      if (result?.version) {
        const versionInfo = result.version.split(',')[0];
        if (versionInfo) {
          Object.assign(healthDetails, { version: versionInfo });
        }
      }

      return {
        status,
        details: healthDetails,
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

  async closeConnections(): Promise<void> {
    if (!this.connectionPool || this.connectionPool.ended) {
      console.log('ℹ️ Database pool already closed');
      return;
    }

    console.log('🔄 Closing database connections...');
    try {
      const closePromise = this.connectionPool.end();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection close timeout')), 10000);
      });

      await Promise.race([closePromise, timeoutPromise]);
      console.log('✅ Database connections closed gracefully');
    } catch (error) {
      console.error('⚠️ Error during connection close:', error);
      this.connectionPool.removeAllListeners();
      console.log('🔌 Database connections force closed');
    }
    this.isInitialized = false;
  }
}

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