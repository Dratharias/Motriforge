import { DatabaseSession, TransactionOperation, TransactionStatus } from '@/types/repositories';
import { ClientSession } from 'mongoose';


export class MongooseDatabaseSession implements DatabaseSession {
  private readonly clientSession: ClientSession;
  public id: string;
  public isActive: boolean = true;

  constructor(clientSession: ClientSession) {
    this.clientSession = clientSession;
    this.id = JSON.stringify(clientSession.id) || 'unknown';
  }

  async startTransaction(): Promise<void> {
    this.clientSession.startTransaction();
  }

  async commitTransaction(): Promise<void> {
    await this.clientSession.commitTransaction();
    this.isActive = false;
  }

  async abortTransaction(): Promise<void> {
    await this.clientSession.abortTransaction();
    this.isActive = false;
  }

  // Expose ClientSession if needed
  getRawSession(): ClientSession {
    return this.clientSession;
  }
}

function isMongooseDatabaseSession(
  session: DatabaseSession
): session is MongooseDatabaseSession {
  return (session as MongooseDatabaseSession).getRawSession !== undefined;
}

/**
 * Transaction implementation
 */
export class TransactionImpl {
  public readonly session: DatabaseSession;
  public readonly operations: TransactionOperation[] = [];
  public status: TransactionStatus = TransactionStatus.PENDING;

  constructor(session: DatabaseSession) {
    this.session = session;
  }

  public add(operation: TransactionOperation): void {
    if (this.status !== TransactionStatus.PENDING) {
      throw new Error('Cannot add operations to a transaction that is not pending');
    }
    this.operations.push(operation);
  }

  public async execute(): Promise<any[]> {
    if (this.status !== TransactionStatus.PENDING) {
      throw new Error('Transaction is not in pending state');
    }

    const results = [];

    try {
      await this.session.startTransaction();

      for (const operation of this.operations) {
        const result = await operation.execute(this.session);
        results.push(result);
      }

      await this.session.commitTransaction();
      this.status = TransactionStatus.COMMITTED;

      return results;
    } catch (error) {
      await this.session.abortTransaction();
      this.status = TransactionStatus.ERROR;
      throw error;
    }
  }

  public async rollback(): Promise<void> {
    if (this.status === TransactionStatus.PENDING) {
      await this.session.abortTransaction();
      this.status = TransactionStatus.ROLLED_BACK;
    }
  }

  public getSession(): DatabaseSession {
    return this.session;
  }

  public getStatus(): TransactionStatus {
    return this.status;
  }
}