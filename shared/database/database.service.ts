import type { PrismaClient, QueryEvent, LogEvent } from './generated'
import { logger } from '../utils/logger'

/**
 * Database Service - Singleton Prisma Client Manager
 * Handles database connection lifecycle and provides shared client instance
 */
export class DatabaseService {
  private static instance: DatabaseService
  private readonly prisma: PrismaClient
  private isConnected: boolean = false
  private readonly isReal: boolean = false

  private constructor() {
    try {
      // Dynamic import to avoid circular dependency issues
      const { PrismaClient: PrismaClientClass } = require('./generated')
      this.prisma = new PrismaClientClass({
        log: [
          { level: 'query', emit: 'event' },
          { level: 'error', emit: 'event' },
          { level: 'warn', emit: 'event' },
        ],
      }) as PrismaClient

      // Check if this is the real Prisma client or placeholder
      this.isReal = typeof this.prisma.user?.findUnique === 'function'
      
      this.setupEventListeners()
    } catch (error) {
      logger.error('Failed to initialize Prisma client', { error })
      throw new Error('Database service initialization failed')
    }
  }

  /**
   * Get singleton instance of DatabaseService
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  /**
   * Get Prisma client instance
   */
  public getClient(): PrismaClient {
    return this.prisma
  }

  /**
   * Check if using real Prisma client (not placeholder)
   */
  public isRealClient(): boolean {
    return this.isReal
  }

  /**
   * Connect to database
   */
  public async connect(): Promise<void> {
    try {
      if (this.isConnected) {
        return
      }

      if (!this.isReal) {
        logger.warn('Using placeholder Prisma client - database operations will fail')
        return
      }

      await this.prisma.$connect()
      this.isConnected = true
      
      logger.info('Database connected successfully')
    } catch (error) {
      logger.error('Failed to connect to database', { error })
      throw new Error('Database connection failed')
    }
  }

  /**
   * Disconnect from database
   */
  public async disconnect(): Promise<void> {
    try {
      if (!this.isConnected || !this.isReal) {
        return
      }

      await this.prisma.$disconnect()
      this.isConnected = false
      
      logger.info('Database disconnected successfully')
    } catch (error) {
      logger.error('Failed to disconnect from database', { error })
      throw new Error('Database disconnection failed')
    }
  }

  /**
   * Check database health
   */
  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.isReal) {
        return false
      }

      await this.prisma.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      logger.error('Database health check failed', { error })
      return false
    }
  }

  /**
   * Execute database transaction
   */
  public async transaction<T>(
    callback: (prisma: PrismaClient) => Promise<T>
  ): Promise<T> {
    try {
      if (!this.isReal) {
        throw new Error('Cannot execute transaction with placeholder client')
      }

      return await this.prisma.$transaction(callback)
    } catch (error) {
      logger.error('Database transaction failed', { error })
      throw new Error('Transaction execution failed')
    }
  }

  /**
   * Setup event listeners for database monitoring
   */
  private setupEventListeners(): void {
    try {
      // Only setup listeners if we have the real Prisma client
      if (!this.isReal) {
        logger.debug('Skipping event listeners setup for placeholder client')
        return
      }

      this.prisma.$on('query', (event: QueryEvent) => {
        logger.debug('Database query executed', {
          query: event.query,
          duration: event.duration,
          params: event.params,
        })
      })

      this.prisma.$on('error', (event: LogEvent) => {
        logger.error('Database error occurred', {
          message: event.message,
          target: event.target,
        })
      })

      this.prisma.$on('warn', (event: LogEvent) => {
        logger.warn('Database warning', {
          message: event.message,
          target: event.target,
        })
      })

      logger.debug('Database event listeners setup successfully')
    } catch (error) {
      logger.warn('Failed to setup database event listeners', { error })
      // Don't throw error here as it's not critical
    }
  }
}

/**
 * Get database client instance
 * Convenience function for accessing Prisma client
 */
export const getDbClient = (): PrismaClient => {
  return DatabaseService.getInstance().getClient()
}

/**
 * Check if database service is using real client
 */
export const isDatabaseReady = (): boolean => {
  return DatabaseService.getInstance().isRealClient()
}