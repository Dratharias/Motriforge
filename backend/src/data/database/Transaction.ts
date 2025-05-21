import { 
  ClientSession, 
  Db, 
  Filter,
  UpdateFilter,
  FindOptions,
  UpdateOptions,
  DeleteOptions,
  Document,
  WithId,
  OptionalUnlessRequiredId
} from 'mongodb';
import { LoggerFacade } from '../../core/logging/LoggerFacade';
import { TransactionOperation } from './TransactionOperation';
import { Collection } from './Collection';

/**
 * Represents a MongoDB transaction with operations tracking
 */
export class Transaction {
  private readonly session: ClientSession;
  private readonly db: Db;
  private readonly logger: LoggerFacade;
  private readonly operations: TransactionOperation[] = [];
  private committed: boolean = false;
  private aborted: boolean = false;

  constructor(session: ClientSession, db: Db, logger: LoggerFacade) {
    this.session = session;
    this.db = db;
    this.logger = logger;
  }

  /**
   * Commit the transaction
   */
  public async commit(): Promise<void> {
    if (this.committed || this.aborted) {
      throw new Error('Transaction already committed or aborted');
    }
    
    try {
      await this.session.commitTransaction();
      this.committed = true;
      this.logger.debug('Transaction committed', { operationsCount: this.operations.length });
    } catch (error) {
      this.logger.error('Failed to commit transaction', { error });
      throw error;
    }
  }

  /**
   * Abort the transaction
   */
  public async abort(): Promise<void> {
    if (this.committed || this.aborted) {
      throw new Error('Transaction already committed or aborted');
    }
    
    try {
      await this.session.abortTransaction();
      this.aborted = true;
      this.logger.debug('Transaction aborted', { operationsCount: this.operations.length });
    } catch (error) {
      this.logger.error('Failed to abort transaction', { error });
      throw error;
    }
  }

  /**
   * End the session
   */
  public endSession(): void {
    this.session.endSession();
  }

  /**
   * Get the session
   */
  public getSession(): ClientSession {
    return this.session;
  }

  /**
   * Get a collection with transaction session
   * @param name Collection name
   */
  public getCollection<T extends Document>(name: string): Collection<T> {
    const mongoCollection = this.db.collection<T>(name);
    return new Collection<T>(mongoCollection, this.logger);
  }

  /**
   * Find one document in a transaction
   * @param collectionName Collection name
   * @param filter Query filter
   * @param options Find options
   */
  public async findOne<T extends Document>(
    collectionName: string,
    filter: Filter<T>,
    options?: FindOptions
  ): Promise<WithId<T> | null> {
    const collection = this.db.collection<T>(collectionName);
    
    const operation = new TransactionOperation('findOne', collectionName, { filter, options });
    this.operations.push(operation);
    
    try {
      return await collection.findOne(filter, { ...options, session: this.session });
    } catch (error) {
      this.logger.error('Transaction findOne operation failed', { 
        error, 
        collectionName, 
        filter 
      });
      throw error;
    }
  }

  /**
   * Insert one document in a transaction
   * @param collectionName Collection name
   * @param document Document to insert
   */
  public async insertOne<T extends Document>(
    collectionName: string,
    document: OptionalUnlessRequiredId<T>
  ): Promise<T> {
    const collection = this.db.collection<T>(collectionName);
    
    const operation = new TransactionOperation('insertOne', collectionName, { document });
    this.operations.push(operation);
    
    try {
      const result = await collection.insertOne(document, { session: this.session });
      return { ...document, _id: result.insertedId } as T;
    } catch (error) {
      this.logger.error('Transaction insertOne operation failed', { 
        error, 
        collectionName 
      });
      throw error;
    }
  }

  /**
   * Update one document in a transaction
   * @param collectionName Collection name
   * @param filter Query filter
   * @param update Update operations
   * @param options Update options
   */
  public async updateOne<T extends Document>(
    collectionName: string,
    filter: Filter<T>,
    update: UpdateFilter<T>,
    options?: UpdateOptions
  ): Promise<boolean> {
    const collection = this.db.collection<T>(collectionName);
    
    const operation = new TransactionOperation('updateOne', collectionName, { filter, update, options });
    this.operations.push(operation);
    
    try {
      const result = await collection.updateOne(filter, update, { ...options, session: this.session });
      return result.modifiedCount > 0;
    } catch (error) {
      this.logger.error('Transaction updateOne operation failed', { 
        error, 
        collectionName, 
        filter 
      });
      throw error;
    }
  }

  /**
   * Delete one document in a transaction
   * @param collectionName Collection name
   * @param filter Query filter
   * @param options Delete options
   */
  public async deleteOne<T extends Document>(
    collectionName: string,
    filter: Filter<T>,
    options?: DeleteOptions
  ): Promise<boolean> {
    const collection = this.db.collection<T>(collectionName);
    
    const operation = new TransactionOperation('deleteOne', collectionName, { filter, options });
    this.operations.push(operation);
    
    try {
      const result = await collection.deleteOne(filter, { ...options, session: this.session });
      return result.deletedCount === 1;
    } catch (error) {
      this.logger.error('Transaction deleteOne operation failed', { 
        error, 
        collectionName, 
        filter 
      });
      throw error;
    }
  }

  /**
   * Find multiple documents in a transaction
   * @param collectionName Collection name
   * @param filter Query filter
   * @param options Find options
   */
  public async findMany<T extends Document>(
    collectionName: string,
    filter: Filter<T>,
    options?: FindOptions
  ): Promise<WithId<T>[]> {
    const collection = this.db.collection<T>(collectionName);
    
    const operation = new TransactionOperation('findMany', collectionName, { filter, options });
    this.operations.push(operation);
    
    try {
      return await collection.find(filter, { ...options, session: this.session }).toArray();
    } catch (error) {
      this.logger.error('Transaction findMany operation failed', { 
        error, 
        collectionName, 
        filter 
      });
      throw error;
    }
  }

  /**
   * Update multiple documents in a transaction
   * @param collectionName Collection name
   * @param filter Query filter
   * @param update Update operations
   * @param options Update options
   */
  public async updateMany<T extends Document>(
    collectionName: string,
    filter: Filter<T>,
    update: UpdateFilter<T>,
    options?: UpdateOptions
  ): Promise<number> {
    const collection = this.db.collection<T>(collectionName);
    
    const operation = new TransactionOperation('updateMany', collectionName, { filter, update, options });
    this.operations.push(operation);
    
    try {
      const result = await collection.updateMany(filter, update, { ...options, session: this.session });
      return result.modifiedCount;
    } catch (error) {
      this.logger.error('Transaction updateMany operation failed', { 
        error, 
        collectionName, 
        filter 
      });
      throw error;
    }
  }

  /**
   * Delete multiple documents in a transaction
   * @param collectionName Collection name
   * @param filter Query filter
   * @param options Delete options
   */
  public async deleteMany<T extends Document>(
    collectionName: string,
    filter: Filter<T>,
    options?: DeleteOptions
  ): Promise<number> {
    const collection = this.db.collection<T>(collectionName);
    
    const operation = new TransactionOperation('deleteMany', collectionName, { filter, options });
    this.operations.push(operation);
    
    try {
      const result = await collection.deleteMany(filter, { ...options, session: this.session });
      return result.deletedCount || 0;
    } catch (error) {
      this.logger.error('Transaction deleteMany operation failed', { 
        error, 
        collectionName, 
        filter 
      });
      throw error;
    }
  }

  /**
   * Get all operations performed in this transaction
   */
  public getOperations(): TransactionOperation[] {
    return [...this.operations];
  }

  /**
   * Check if transaction is committed
   */
  public isCommitted(): boolean {
    return this.committed;
  }

  /**
   * Check if transaction is aborted
   */
  public isAborted(): boolean {
    return this.aborted;
  }
}