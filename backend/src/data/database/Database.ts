import { Collection } from './Collection';
import { TransactionManager } from './TransactionManager';
import { MongoClient, Db as MongoDb, Document } from 'mongodb';
import { LoggerFacade } from '../../core/logging/LoggerFacade';

/**
 * Main database class providing access to MongoDB functionality
 * Implements singleton pattern for single database connection per application
 */
export class Database {
  private static instance: Database;
  private client: MongoClient | null = null;
  private db: MongoDb | null = null;
  private readonly collections: Map<string, Collection<any>> = new Map();
  private transactionManager: TransactionManager | null = null;
  private readonly logger: LoggerFacade;
  private readonly connectionString: string;
  private readonly dbName: string;
  private isConnected: boolean = false;

  private constructor(connectionString: string, dbName: string, logger: LoggerFacade) {
    this.connectionString = connectionString;
    this.dbName = dbName;
    this.logger = logger;
  }

  /**
   * Get singleton instance of Database
   */
  public static getInstance(
    logger: LoggerFacade,
    connectionString: string = process.env.MONGODB_URI ?? 'mongodb://localhost:27017',
    dbName: string = process.env.DB_NAME ?? 'Motriforge',
  ): Database {
    if (!Database.instance) {
      Database.instance = new Database(connectionString, dbName, logger);
    }
    return Database.instance;
  }

  /**
   * Connect to MongoDB database
   */
  public async connect(): Promise<void> {
    if (this.isConnected && this.client && this.db) {
      return;
    }

    try {
      this.logger.info('Connecting to database...', { 
        connectionString: this.connectionString.replace(/mongodb\+srv:\/\/([^:]+):([^@]+)@/, 'mongodb+srv://***:***@') 
      });
      
      this.client = await MongoClient.connect(this.connectionString, {
        maxPoolSize: 10,
        minPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      
      this.db = this.client.db(this.dbName);
      this.isConnected = true;
      
      // Initialize transaction manager
      this.transactionManager = new TransactionManager(this.client, this.db, this.logger);
      
      this.logger.info('Successfully connected to database', { dbName: this.dbName });
    } catch (err) {
      this.isConnected = false;
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to connect to database', error, { 
        connectionString: this.connectionString.replace(/mongodb\+srv:\/\/([^:]+):([^@]+)@/, 'mongodb+srv://***:***@') 
      });
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB database
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected || !this.client) {
      return;
    }

    try {
      await this.client.close();
      this.isConnected = false;
      this.client = null;
      this.db = null;
      this.logger.info('Disconnected from database');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to disconnect from database', error);
      throw error;
    }
  }

  /**
   * Get collection wrapper for the specified collection name
   * @param name Collection name
   */
  public getCollection<T extends Document>(name: string): Collection<T> {
    if (!this.isConnected || !this.db) {
      throw new Error('Database not connected');
    }

    if (!this.collections.has(name)) {
      const mongoCollection = this.db.collection<T>(name);
      const collection = new Collection<T>(mongoCollection, this.logger);
      this.collections.set(name, collection);
    }

    return this.collections.get(name) as Collection<T>;
  }

  /**
   * Get transaction manager for MongoDB transactions
   */
  public getTransactionManager(): TransactionManager {
    if (!this.transactionManager) {
      throw new Error('Transaction manager not initialized. Database may not be connected.');
    }
    return this.transactionManager;
  }

  /**
   * Check if database is connected
   */
  public isInitialized(): boolean {
    return this.isConnected;
  }

  /**
   * Get raw MongoDB database instance
   */
  public getRawDb(): MongoDb {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db;
  }

  /**
   * Get raw MongoDB client instance
   */
  public getRawClient(): MongoClient {
    if (!this.client) {
      throw new Error('Database not connected');
    }
    return this.client;
  }

  /**
   * Ping database to check connection
   */
  public async ping(): Promise<boolean> {
    if (!this.isConnected || !this.db) {
      return false;
    }

    try {
      const result = await this.db.command({ ping: 1 });
      return result.ok === 1;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to ping database', error);
      return false;
    }
  }

  /**
   * Get database statistics
   */
  public async getStats(): Promise<any> {
    if (!this.isConnected || !this.db) {
      throw new Error('Database not connected');
    }

    try {
      return await this.db.stats();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to get database stats', error);
      throw error;
    }
  }
}