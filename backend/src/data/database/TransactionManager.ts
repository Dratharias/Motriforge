import { 
  MongoClient, 
  Db, 
  TransactionOptions
} from 'mongodb';
import { LoggerFacade } from '../../core/logging/LoggerFacade';
import { Transaction } from './Transaction';

/**
 * Manages database transactions for MongoDB
 */
export class TransactionManager {
  private readonly client: MongoClient;
  private readonly db: Db;
  private readonly logger: LoggerFacade;
  private defaultTransactionOptions: TransactionOptions = {
    readPreference: 'primary',
    readConcern: { level: 'local' },
    writeConcern: { w: 'majority' }
  };

  constructor(client: MongoClient, db: Db, logger: LoggerFacade) {
    this.client = client;
    this.db = db;
    this.logger = logger;
  }

  /**
   * Start a new transaction
   * @param options Transaction options
   */
  public async startTransaction(options?: TransactionOptions): Promise<Transaction> {
    try {
      const session = this.client.startSession();
      session.startTransaction(options || this.defaultTransactionOptions);
      const sessionId = (session as any)?.id?.id?.toString('hex');
      this.logger.debug('Transaction started', { transactionId: session.id ? String(sessionId) : undefined });
      
      return new Transaction(session, this.db, this.logger);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to start transaction', error);
      throw error;
    }
  }

  /**
   * Execute a function within a transaction
   * @param fn Function to execute within transaction
   * @param options Transaction options
   */
  public async withTransaction<T>(
    fn: (transaction: Transaction) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T> {
    let transaction: Transaction | null = null;
    
    try {
      transaction = await this.startTransaction(options);
      
      const result = await fn(transaction);
      
      await transaction.commit();
      
      return result;
    } catch (err) {
      if (transaction) {
        try {
          await transaction.abort();
        } catch (abortErr) {
          const abortError = abortErr instanceof Error ? abortErr : new Error(String(abortErr));
          this.logger.error('Failed to abort transaction after error', abortError);
        }
      }
      
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Transaction failed', error);
      throw error;
    } finally {
      if (transaction) {
        transaction.endSession();
      }
    }
  }

  /**
   * Set default transaction options
   * @param options Transaction options
   */
  public setDefaultTransactionOptions(options: TransactionOptions): void {
    this.defaultTransactionOptions = options;
  }

  /**
   * Get current default transaction options
   */
  public getDefaultTransactionOptions(): TransactionOptions {
    return this.defaultTransactionOptions;
  }
}