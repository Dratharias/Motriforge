import { DatabaseSession, TransactionOperation, TransactionStatus } from '@/types/repositories';
import { ClientSession } from 'mongoose';


export class MongooseDatabaseSession implements DatabaseSession {
  private readonly clientSession: ClientSession;
  public id: string;
  public isActive: boolean = true;

  constructor(clientSession: ClientSession) {
    this.clientSession = clientSession;
    // Safely handle session ID conversion
    this.id = this.extractSessionId(clientSession);
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

  /**
   * Safely extract session ID from ClientSession
   */
  private extractSessionId(session: ClientSession): string {
    if (!session.id) {
      return this.generateFallbackId();
    }

    if (typeof session.id === 'string') {
      return session.id;
    }

    if (typeof session.id === 'object' && session.id !== null) {
      return this.extractIdFromObject(session.id);
    }

    return this.generateFallbackId();
  }

  /**
   * Extract ID from object-type session IDs
   */
  private extractIdFromObject(sessionId: object): string {
    // Try toHexString method (ObjectId)
    if (this.hasMethod(sessionId, 'toHexString')) {
      return (sessionId as any).toHexString();
    }

    // Try toString method with validation
    if (this.hasMethod(sessionId, 'toString')) {
      const stringified = (sessionId as any).toString();
      if (this.isValidStringified(stringified)) {
        return stringified;
      }
    }

    // Try id property
    if (this.hasProperty(sessionId, 'id')) {
      return String((sessionId as any).id);
    }

    return this.generateFallbackId();
  }

  /**
   * Check if object has a specific method
   */
  private hasMethod(obj: object, methodName: string): boolean {
    return methodName in obj && typeof (obj as any)[methodName] === 'function';
  }

  /**
   * Check if object has a specific property
   */
  private hasProperty(obj: object, propertyName: string): boolean {
    return propertyName in obj;
  }

  /**
   * Validate that stringified value is meaningful
   */
  private isValidStringified(value: string): boolean {
    return value !== '[object Object]' && value.length > 0;
  }

  /**
   * Generate fallback session ID
   */
  private generateFallbackId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `session_${timestamp}_${random}`;
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

  /**
   * Get the underlying Mongoose ClientSession
   * Required by the Transaction interface
   */
  public getClientSession(): ClientSession {
    if (isMongooseDatabaseSession(this.session)) {
      return this.session.getRawSession();
    }
    throw new Error('Session is not a MongooseDatabaseSession');
  }

  public getStatus(): TransactionStatus {
    return this.status;
  }
}