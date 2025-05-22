import { startSession } from 'mongoose';
import { LoggerFacade } from '@/core/logging';
import { Transaction } from '@/types/repositories/base';
import { TransactionImpl, MongooseDatabaseSession } from '../helpers/Transaction';

/**
 * Handles transaction operations for repositories
 */
export class TransactionOperations {
  constructor(
    private readonly logger: LoggerFacade,
    private readonly componentName: string
  ) {}

  /**
   * Start a new transaction
   */
  public async startTransaction(): Promise<Transaction> {
    try {
      this.logger.debug('Starting transaction', { component: this.componentName });
      
      const session = await startSession();
      const dbSession = new MongooseDatabaseSession(session);
      const transaction = new TransactionImpl(dbSession);
      
      this.logger.debug('Transaction started', { 
        sessionId: this.getSessionIdSafely(dbSession),
        component: this.componentName 
      });
      
      return transaction;
    } catch (error) {
      this.logger.error('Error starting transaction', error as Error, {
        component: this.componentName
      });
      throw error;
    }
  }

  /**
   * Execute function within transaction
   */
  public async withTransaction<R>(
    fn: (transaction: Transaction) => Promise<R>
  ): Promise<R> {
    const transaction = await this.startTransaction();
    
    try {
      this.logger.debug('Executing function within transaction', {
        component: this.componentName
      });
      
      const result = await fn(transaction);
      
      await transaction.execute();
      
      this.logger.debug('Transaction completed successfully', {
        component: this.componentName
      });
      
      return result;
    } catch (error) {
      this.logger.error('Error in transaction, rolling back', error as Error, {
        component: this.componentName
      });
      
      try {
        await transaction.rollback();
        this.logger.debug('Transaction rolled back successfully', {
          component: this.componentName
        });
      } catch (rollbackError) {
        this.logger.error('Error during transaction rollback', rollbackError as Error, {
          component: this.componentName
        });
      }
      
      throw error;
    }
  }

  /**
   * Execute multiple operations in transaction
   */
  public async withTransactionOperations<R>(
    operations: Array<(transaction: Transaction) => Promise<any>>
  ): Promise<R[]> {
    return this.withTransaction(async (transaction) => {
      this.logger.debug('Executing multiple operations in transaction', {
        operationCount: operations.length,
        component: this.componentName
      });
      
      const results: R[] = [];
      
      for (const operation of operations) {
        const result = await operation(transaction);
        results.push(result);
      }
      
      return results;
    });
  }

  /**
   * Check if transaction is still active
   */
  public isTransactionActive(transaction: Transaction): boolean {
    try {
      return transaction.getStatus() === 'pending';
    } catch (error) {
      this.logger.warn('Error checking transaction status', {
        error: (error as Error).message,
        component: this.componentName
      });
      return false;
    }
  }

  /**
   * Get transaction status
   */
  public getTransactionStatus(transaction: Transaction): string {
    try {
      return transaction.getStatus();
    } catch (error) {
      this.logger.warn('Error getting transaction status', {
        error: (error as Error).message,
        component: this.componentName
      });
      return 'unknown';
    }
  }

  /**
   * Safely rollback transaction
   */
  public async safeRollback(transaction: Transaction): Promise<void> {
    try {
      if (this.isTransactionActive(transaction)) {
        await transaction.rollback();
        this.logger.debug('Transaction rolled back safely', {
          component: this.componentName
        });
      } else {
        this.logger.debug('Transaction not active, skipping rollback', {
          status: this.getTransactionStatus(transaction),
          component: this.componentName
        });
      }
    } catch (error) {
      this.logger.error('Error during safe rollback', error as Error, {
        component: this.componentName
      });
      // Don't rethrow - this is a cleanup operation
    }
  }

  /**
   * Safely get session ID for logging
   */
  private getSessionIdSafely(dbSession: MongooseDatabaseSession): string {
    try {
      return dbSession.id;
    } catch (error) {
      this.logger.warn('Could not extract session ID for logging', {
        error: (error as Error).message
      });
      return 'unknown';
    }
  }
}