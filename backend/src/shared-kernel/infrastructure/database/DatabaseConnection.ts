import { 
  MongoClient, 
  MongoClientOptions, 
  Db, 
  ClientSession, 
  TransactionOptions,
  ReadPreference,
  ReadConcern,
  WriteConcern,
  CreateIndexesOptions,
  IndexDirection
} from 'mongodb';
import { ILogger } from '@/types/shared/base-types';
import { Environment } from '@/types/shared/enums/common';

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  readonly connectionString: string;
  readonly databaseName: string;
  readonly environment: Environment;
  readonly poolSize: number;
  readonly connectTimeoutMs: number;
  readonly serverSelectionTimeoutMs: number;
  readonly heartbeatFrequencyMs: number;
  readonly maxPoolSize: number;
  readonly minPoolSize: number;
  readonly retryWrites: boolean;
  readonly retryReads: boolean;
  readonly readPreference: 'primary' | 'primaryPreferred' | 'secondary' | 'secondaryPreferred' | 'nearest';
  readonly enableTls: boolean;
  readonly enableLogging: boolean;
  readonly logLevel: 'error' | 'warn' | 'info' | 'debug';
}

/**
 * Connection health status
 */
export interface ConnectionHealth {
  readonly isConnected: boolean;
  readonly lastPing: Date;
  readonly latency: number;
  readonly activeConnections: number;
  readonly availableConnections: number;
  readonly totalConnections: number;
}

/**
 * Transaction options interface
 */
export interface DatabaseTransactionOptions {
  readPreference?: 'primary' | 'primaryPreferred' | 'secondary' | 'secondaryPreferred' | 'nearest';
  readConcern?: 'local' | 'available' | 'majority' | 'linearizable' | 'snapshot';
  writeConcern?: {
    w?: number | 'majority';
    j?: boolean;
    wtimeout?: number;
  };
  maxCommitTimeMS?: number;
}

/**
 * Database connection manager
 */
export class DatabaseConnection {
  private client: MongoClient | null = null;
  private database: Db | null = null;
  private readonly config: DatabaseConfig;
  private readonly logger: ILogger;
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;
  private lastHealthCheck: Date = new Date();

  constructor(config: DatabaseConfig, logger: ILogger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Establishes connection to MongoDB
   */
  async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      this.logger.warn('Database already connected');
      return;
    }

    try {
      this.connectionAttempts++;
      this.logger.info('Connecting to database', {
        attempt: this.connectionAttempts,
        database: this.config.databaseName,
        environment: this.config.environment
      });

      const options = this.buildMongoClientOptions();
      this.client = new MongoClient(this.config.connectionString, options);

      await this.client.connect();
      this.database = this.client.db(this.config.databaseName);

      // Verify connection with a ping
      await this.database.admin().ping();

      this.isConnected = true;
      this.lastHealthCheck = new Date();

      this.logger.info('Database connected successfully', {
        database: this.config.databaseName,
        attempt: this.connectionAttempts
      });

      // Set up connection event listeners
      this.setupEventListeners();

    } catch (error) {
      this.isConnected = false;
      this.logger.error('Failed to connect to database', error as Error, {
        attempt: this.connectionAttempts,
        database: this.config.databaseName
      });
      throw error;
    }
  }

  /**
   * Disconnects from MongoDB
   */
  async disconnect(): Promise<void> {
    if (!this.client) {
      this.logger.warn('No database connection to close');
      return;
    }

    try {
      await this.client.close();
      this.client = null;
      this.database = null;
      this.isConnected = false;

      this.logger.info('Database disconnected successfully');
    } catch (error) {
      this.logger.error('Error during database disconnection', error as Error);
      throw error;
    }
  }

  /**
   * Gets the database instance
   */
  getDatabase(): Db {
    if (!this.database) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.database;
  }

  /**
   * Gets the MongoDB client
   */
  getClient(): MongoClient {
    if (!this.client) {
      throw new Error('Database client not available. Call connect() first.');
    }
    return this.client;
  }

  /**
   * Starts a new session for transactions
   */
  async startSession(): Promise<ClientSession> {
    if (!this.client) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.client.startSession();
  }

  /**
   * Executes a function within a transaction
   */
  async withTransaction<T>(
    operation: (session: ClientSession) => Promise<T>,
    options?: DatabaseTransactionOptions
  ): Promise<T> {
    const session = await this.startSession();
    
    try {
      const transactionOptions: TransactionOptions = {};
      
      if (options) {
        if (options.readPreference) {
          transactionOptions.readPreference = ReadPreference.fromString(options.readPreference);
        }
        
        if (options.readConcern) {
          transactionOptions.readConcern = new ReadConcern(options.readConcern);
        }
        
        if (options.writeConcern) {
          transactionOptions.writeConcern = new WriteConcern(
            options.writeConcern.w,
            options.writeConcern.wtimeout,
            options.writeConcern.j
          );
        }

        if (options.maxCommitTimeMS) {
          transactionOptions.maxCommitTimeMS = options.maxCommitTimeMS;
        }
      }

      return await session.withTransaction(async () => {
        return await operation(session);
      }, transactionOptions);
    } finally {
      await session.endSession();
    }
  }

  /**
   * Performs a health check on the database connection
   */
  async healthCheck(): Promise<ConnectionHealth> {
    if (!this.database || !this.client) {
      return {
        isConnected: false,
        lastPing: this.lastHealthCheck,
        latency: -1,
        activeConnections: 0,
        availableConnections: 0,
        totalConnections: 0
      };
    }

    try {
      const start = Date.now();
      await this.database.admin().ping();
      const latency = Date.now() - start;
      this.lastHealthCheck = new Date();

      // Get connection pool stats (simplified)
      const serverStatus = await this.database.admin().serverStatus();
      const connections = serverStatus.connections ?? {};

      return {
        isConnected: true,
        lastPing: this.lastHealthCheck,
        latency,
        activeConnections: connections.current ?? 0,
        availableConnections: connections.available ?? 0,
        totalConnections: connections.totalCreated ?? 0
      };
    } catch (error) {
      this.logger.error('Database health check failed', error as Error);
      this.isConnected = false;

      return {
        isConnected: false,
        lastPing: this.lastHealthCheck,
        latency: -1,
        activeConnections: 0,
        availableConnections: 0,
        totalConnections: 0
      };
    }
  }

  /**
   * Checks if the database is connected
   */
  isHealthy(): boolean {
    return this.isConnected && this.client !== null && this.database !== null;
  }

  /**
   * Gets database statistics
   */
  async getStats(): Promise<Record<string, any>> {
    if (!this.database) {
      throw new Error('Database not connected');
    }

    try {
      const stats = await this.database.stats();
      return {
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize,
        objects: stats.objects,
        avgObjSize: stats.avgObjSize
      };
    } catch (error) {
      this.logger.error('Failed to get database stats', error as Error);
      throw error;
    }
  }

  /**
   * Creates database indexes for optimal performance
   */
  async createIndexes(): Promise<void> {
    if (!this.database) {
      throw new Error('Database not connected');
    }

    try {
      this.logger.info('Creating database indexes');

      // Common indexes that most collections will benefit from
      const commonIndexes: Array<{ [key: string]: IndexDirection }> = [
        { createdAt: 1 },
        { updatedAt: 1 },
        { isDeleted: 1 },
        { createdAt: 1, isDeleted: 1 },
        { updatedAt: 1, isDeleted: 1 }
      ];

      // Index creation options
      const indexOptions: CreateIndexesOptions = { 
        background: true,
        sparse: true
      };

      // Get all collections
      const collections = await this.database.listCollections().toArray();

      for (const collection of collections) {
        const coll = this.database.collection(collection.name);
        
        // Create common indexes
        for (const index of commonIndexes) {
          try {
            await coll.createIndex(index, indexOptions);
            this.logger.debug(`Created index on ${collection.name}`, { index });
          } catch (error) {
            // Index might already exist, log and continue
            this.logger.warn(`Failed to create index on ${collection.name}`, {
              index,
              error: (error as Error).message
            });
          }
        }
      }

      this.logger.info('Database indexes created successfully');
    } catch (error) {
      this.logger.error('Failed to create database indexes', error as Error);
      throw error;
    }
  }

  /**
   * Builds MongoDB client options from configuration
   */
  private buildMongoClientOptions(): MongoClientOptions {
    const options: MongoClientOptions = {
      maxPoolSize: this.config.maxPoolSize,
      minPoolSize: this.config.minPoolSize,
      connectTimeoutMS: this.config.connectTimeoutMs,
      serverSelectionTimeoutMS: this.config.serverSelectionTimeoutMs,
      heartbeatFrequencyMS: this.config.heartbeatFrequencyMs,
      retryWrites: this.config.retryWrites,
      retryReads: this.config.retryReads,
      readPreference: this.config.readPreference
    };

    // Add TLS configuration if enabled
    if (this.config.enableTls) {
      options.tls = true;
    }

    // Note: loggerLevel has been removed from MongoDB Node.js driver v4+
    // Logging should be handled at the application level
    if (this.config.enableLogging) {
      this.logger.info('Database logging is enabled and will be handled by application logger');
    }

    return options;
  }

  /**
   * Sets up event listeners for the MongoDB client
   */
  private setupEventListeners(): void {
    if (!this.client) {
      return;
    }

    this.client.on('serverOpening', () => {
      this.logger.debug('MongoDB server connection opening');
    });

    this.client.on('serverClosed', () => {
      this.logger.warn('MongoDB server connection closed');
      this.isConnected = false;
    });

    this.client.on('error', (error) => {
      this.logger.error('MongoDB connection error', error);
      this.isConnected = false;
    });

    this.client.on('timeout', () => {
      this.logger.warn('MongoDB connection timeout');
    });

    this.client.on('close', () => {
      this.logger.info('MongoDB connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnect', () => {
      this.logger.info('MongoDB reconnected');
      this.isConnected = true;
    });
  }

  /**
   * Graceful shutdown handling
   */
  async gracefulShutdown(): Promise<void> {
    this.logger.info('Initiating graceful database shutdown');
    
    try {
      if (this.client) {
        // Wait for ongoing operations to complete (with timeout)
        await Promise.race([
          this.disconnect(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Shutdown timeout')), 10000)
          )
        ]);
      }
      
      this.logger.info('Database shutdown completed');
    } catch (error) {
      this.logger.error('Error during graceful shutdown', error as Error);
      throw error;
    }
  }
}