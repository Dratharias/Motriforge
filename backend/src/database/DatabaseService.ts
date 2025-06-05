import { DatabaseManager } from './DatabaseManager';
import { DatabaseConfigFactory } from './config/database.config';

/**
 * Singleton database service for application-wide database access
 */
export class DatabaseService {
  private static instance: DatabaseService;
  private databaseManager: DatabaseManager | null = null;

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize the database service
   */
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

  /**
   * Get the database manager instance
   */
  getManager(): DatabaseManager {
    if (!this.databaseManager) {
      throw new Error('Database service not initialized. Call initialize() first.');
    }
    return this.databaseManager;
  }

  /**
   * Shutdown the database service
   */
  async shutdown(): Promise<void> {
    if (this.databaseManager) {
      await this.databaseManager.closeConnections();
      this.databaseManager = null;
      console.log('✅ Database service shutdown complete');
    }
  }

  /**
   * Health check for the database service
   */
  async healthCheck(): Promise<{
    readonly status: 'healthy' | 'unhealthy';
    readonly details: {
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
          },
        };
      }

      // Test connection with a simple query
      await this.databaseManager.executeQuery('SELECT 1');
      
      return {
        status: 'healthy',
        details: {
          connected: true,
          poolStats: this.databaseManager.getPoolStats(),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}