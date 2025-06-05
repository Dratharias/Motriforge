import { QueryResultRow } from 'pg';
import { DatabaseManager, DatabaseResult } from './DatabaseManager';
import { DatabaseConfigFactory } from '@/config/database.config';

export interface QueryResult<T = any> {
  readonly rows: readonly T[];
  readonly rowCount: number;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private databaseManager: DatabaseManager | null = null;

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async initialize(): Promise<void> {
    if (this.databaseManager) {
      console.log('ℹ️ Database service already initialized');
      return;
    }

    try {
      const config = DatabaseConfigFactory.createFromEnvironment();
      this.databaseManager = new DatabaseManager(config.connection);
      await this.databaseManager.initializeDatabase();
      console.log('✅ Database service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database service:', error);
      throw error;
    }
  }

  getManager(): DatabaseManager {
    if (!this.databaseManager) {
      throw new Error('Database service not initialized. Call initialize() first.');
    }
    return this.databaseManager;
  }

  async query<T extends QueryResultRow = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    const manager = this.getManager();
    const result = await manager.executeQuery<T>(sql, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount,
    };
  }

  async querySingle<T extends QueryResultRow = any>(sql: string, params: any[] = []): Promise<T | null> {
    const manager = this.getManager();
    return await manager.executeQuerySingle<T>(sql, params);
  }

  async transaction<T extends QueryResultRow = any>(queries: Array<{ sql: string; params?: any[] }>): Promise<readonly DatabaseResult<T>[]> {
    const manager = this.getManager();
    const transactionQueries = queries.map(q => ({
      sql: q.sql,
      params: q.params ?? [],
    }));
    return await manager.executeTransaction<T>(transactionQueries);
  }

  async shutdown(): Promise<void> {
    if (this.databaseManager) {
      await this.databaseManager.closeConnections();
      this.databaseManager = null;
      console.log('✅ Database service shutdown complete');
    }
  }

  async healthCheck(): Promise<{
    readonly status: 'healthy' | 'unhealthy';
    readonly details: {
      readonly responseTime: number;
      readonly connected: boolean;
      readonly poolStats?: {
        readonly totalCount: number;
        readonly idleCount: number;
        readonly waitingCount: number;
      };
      readonly error?: string;
    };
  }> {
    try {
      if (!this.databaseManager) {
        return {
          status: 'unhealthy',
          details: {
            connected: false,
            error: 'Database service not initialized',
            responseTime: 0
          },
        };
      }

      await this.databaseManager.executeQuery('SELECT 1');
      return {
        status: 'healthy',
        details: {
          connected: true,
          poolStats: this.databaseManager.getPoolStats(),
          responseTime: 0
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          responseTime: 0
        },
      };
    }
  }
}