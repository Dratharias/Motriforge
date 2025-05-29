import { MongoClient, Db } from 'mongodb';

export class MongoConnection {
  private static instance: MongoConnection;
  private client?: MongoClient;
  private db?: Db;

  private constructor() {}

  static getInstance(): MongoConnection {
    if (!MongoConnection.instance) {
      MongoConnection.instance = new MongoConnection();
    }
    return MongoConnection.instance;
  }

  async connect(uri: string, databaseName: string): Promise<void> {
    try {
      if (this.client) {
        console.log('MongoDB already connected');
        return;
      }

      console.log('Connecting to MongoDB...');
      this.client = new MongoClient(uri);
      await this.client.connect();
      this.db = this.client.db(databaseName);
      
      console.log(`Connected to MongoDB database: ${databaseName}`);
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        this.client = undefined;
        this.db = undefined;
        console.log('Disconnected from MongoDB');
      }
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  getClient(): MongoClient {
    if (!this.client) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }
    return this.client;
  }

  getDatabase(): Db {
    if (!this.db) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }
    return this.db;
  }

  isConnected(): boolean {
    return !!this.client && !!this.db;
  }
}

