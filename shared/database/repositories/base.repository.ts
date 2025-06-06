import type { PrismaClient } from '../generated'
import { DatabaseService, isDatabaseReady } from '../database.service'
import { logger } from '../../utils/logger'

export interface PaginationOptions {
  readonly page?: number
  readonly limit?: number
  readonly skip?: number
  readonly take?: number
}

export interface SortOptions {
  readonly sortBy?: string
  readonly sortOrder?: 'asc' | 'desc'
  readonly orderBy?: Record<string, any>
}

export interface BaseQueryOptions extends PaginationOptions, SortOptions {
  readonly where?: Record<string, any>
  readonly include?: Record<string, any>
}

export interface PaginatedResult<T> {
  readonly data: readonly T[]
  readonly total: number
  readonly page: number
  readonly limit: number
  readonly totalPages: number
  readonly hasNextPage: boolean
  readonly hasPreviousPage: boolean
}

/**
 * Base Repository providing common database operations
 * Template method pattern for consistent data access
 */
export abstract class BaseRepository {
  protected readonly db: PrismaClient
  protected readonly entityName: string

  constructor(entityName: string) {
    this.db = DatabaseService.getInstance().getClient()
    this.entityName = entityName
  }

  /**
   * Check if database is ready for operations
   */
  protected ensureDatabaseReady(): void {
    if (!isDatabaseReady()) {
      throw new Error('Database client not ready. Please run: npm run db:generate')
    }
  }

  /**
   * Find entity by ID
   */
  protected async findById<T>(
    id: string,
    model: any,
    include?: Record<string, any>
  ): Promise<T | null> {
    try {
      this.ensureDatabaseReady()
      
      const result = await model.findUnique({
        where: { id },
        ...(include && { include }),
      })
      
      logger.debug(`${this.entityName} found by ID`, { id, found: !!result })
      return result as T | null
    } catch (error) {
      logger.error(`Failed to find ${this.entityName} by ID`, { id, error })
      throw new Error(`Failed to find ${this.entityName}`)
    }
  }

  /**
   * Find multiple entities with filters
   */
  protected async findMany<T>(
    model: any,
    options: BaseQueryOptions = {}
  ): Promise<readonly T[]> {
    try {
      this.ensureDatabaseReady()
      
      const { where, include, orderBy, skip, take } = options
      
      const result = await model.findMany({
        ...(where && { where }),
        ...(include && { include }),
        ...(orderBy && { orderBy }),
        ...(skip !== undefined && { skip }),
        ...(take !== undefined && { take }),
      })
      
      logger.debug(`${this.entityName} list retrieved`, { 
        count: result.length,
        filters: where 
      })
      return result as readonly T[]
    } catch (error) {
      logger.error(`Failed to find ${this.entityName} list`, { options, error })
      throw new Error(`Failed to retrieve ${this.entityName} list`)
    }
  }

  /**
   * Find multiple entities with pagination
   */
  protected async findManyWithPagination<T>(
    model: any,
    options: BaseQueryOptions = {}
  ): Promise<PaginatedResult<T>> {
    try {
      this.ensureDatabaseReady()
      
      const {
        page = 1,
        limit = 20,
        where,
        include,
        orderBy
      } = options

      const skip = (page - 1) * limit
      const take = limit

      // Execute queries in parallel
      const [data, total] = await Promise.all([
        model.findMany({
          ...(where && { where }),
          ...(include && { include }),
          ...(orderBy && { orderBy }),
          skip,
          take,
        }),
        model.count({ ...(where && { where }) }),
      ])

      const totalPages = Math.ceil(total / limit)
      const hasNextPage = page < totalPages
      const hasPreviousPage = page > 1

      logger.debug(`${this.entityName} paginated list retrieved`, {
        count: data.length,
        total,
        page,
        limit,
        totalPages,
        filters: where,
      })

      return {
        data: data as readonly T[],
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      }
    } catch (error) {
      logger.error(`Failed to find ${this.entityName} paginated list`, { options, error })
      throw new Error(`Failed to retrieve ${this.entityName} list`)
    }
  }

  /**
   * Create new entity
   */
  protected async create<T>(
    model: any,
    data: Record<string, any>
  ): Promise<T> {
    try {
      this.ensureDatabaseReady()
      
      const result = await model.create({
        data: {
          ...data,
          createdBy: data.createdBy ?? data.userId, // Default to userId if no createdBy
        },
      })
      
      logger.info(`${this.entityName} created`, { id: result.id })
      return result as T
    } catch (error) {
      logger.error(`Failed to create ${this.entityName}`, { data, error })
      throw new Error(`Failed to create ${this.entityName}`)
    }
  }

  /**
   * Update entity by ID
   */
  protected async update<T>(
    model: any,
    id: string,
    data: Record<string, any>
  ): Promise<T> {
    try {
      this.ensureDatabaseReady()
      
      const result = await model.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      })
      
      logger.info(`${this.entityName} updated`, { id })
      return result as T
    } catch (error) {
      logger.error(`Failed to update ${this.entityName}`, { id, data, error })
      throw new Error(`Failed to update ${this.entityName}`)
    }
  }

  /**
   * Soft delete entity by ID (set isActive to false)
   */
  protected async softDelete(
    model: any,
    id: string
  ): Promise<void> {
    try {
      this.ensureDatabaseReady()
      
      await model.update({
        where: { id },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      })
      
      logger.info(`${this.entityName} soft deleted`, { id })
    } catch (error) {
      logger.error(`Failed to soft delete ${this.entityName}`, { id, error })
      throw new Error(`Failed to delete ${this.entityName}`)
    }
  }

  /**
   * Hard delete entity by ID
   */
  protected async hardDelete(
    model: any,
    id: string
  ): Promise<void> {
    try {
      this.ensureDatabaseReady()
      
      await model.delete({
        where: { id },
      })
      
      logger.info(`${this.entityName} hard deleted`, { id })
    } catch (error) {
      logger.error(`Failed to hard delete ${this.entityName}`, { id, error })
      throw new Error(`Failed to permanently delete ${this.entityName}`)
    }
  }

  /**
   * Count entities with filters
   */
  protected async count(
    model: any,
    where?: Record<string, any>
  ): Promise<number> {
    try {
      this.ensureDatabaseReady()
      
      const count = await model.count({ ...(where && { where }) })
      
      logger.debug(`${this.entityName} count retrieved`, { count, filters: where })
      return count
    } catch (error) {
      logger.error(`Failed to count ${this.entityName}`, { where, error })
      throw new Error(`Failed to count ${this.entityName}`)
    }
  }

  /**
   * Check if entity exists by ID
   */
  protected async exists(
    model: any,
    id: string
  ): Promise<boolean> {
    try {
      this.ensureDatabaseReady()
      
      const count = await model.count({
        where: { id, isActive: true },
      })
      return count > 0
    } catch (error) {
      logger.error(`Failed to check ${this.entityName} existence`, { id, error })
      throw new Error(`Failed to check ${this.entityName} existence`)
    }
  }

  /**
   * Execute operation within transaction
   */
  protected async withTransaction<T>(
    callback: (db: PrismaClient) => Promise<T>
  ): Promise<T> {
    try {
      this.ensureDatabaseReady()
      
      return await this.db.$transaction(callback)
    } catch (error) {
      logger.error(`Transaction failed for ${this.entityName}`, { error })
      throw new Error(`Transaction failed`)
    }
  }

  /**
   * Find first entity matching criteria
   */
  protected async findFirst<T>(
    model: any,
    options: BaseQueryOptions = {}
  ): Promise<T | null> {
    try {
      this.ensureDatabaseReady()
      
      const { where, include, orderBy } = options
      
      const result = await model.findFirst({
        ...(where && { where }),
        ...(include && { include }),
        ...(orderBy && { orderBy }),
      })
      
      logger.debug(`${this.entityName} found first`, { found: !!result })
      return result as T | null
    } catch (error) {
      logger.error(`Failed to find first ${this.entityName}`, { options, error })
      throw new Error(`Failed to find ${this.entityName}`)
    }
  }

  /**
   * Upsert entity (create or update)
   */
  protected async upsert<T>(
    model: any,
    where: Record<string, any>,
    create: Record<string, any>,
    update: Record<string, any>
  ): Promise<T> {
    try {
      this.ensureDatabaseReady()
      
      const result = await model.upsert({
        where,
        create: {
          ...create,
          createdBy: create.createdBy ?? create.userId,
        },
        update: {
          ...update,
          updatedAt: new Date(),
        },
      })
      
      logger.info(`${this.entityName} upserted`, { id: result.id })
      return result as T
    } catch (error) {
      logger.error(`Failed to upsert ${this.entityName}`, { where, create, update, error })
      throw new Error(`Failed to upsert ${this.entityName}`)
    }
  }
}