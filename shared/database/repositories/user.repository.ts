import { logger } from "@/shared/utils/logger"
import { User, Prisma } from "@/prisma/generated"
import { BaseRepository, PaginatedResult } from "./base.repository"
import { AgeAnonymizer, AgeRange } from "@/shared/utils/age-anonymizer"

export interface CreateUserData {
  readonly email: string
  readonly firstName: string
  readonly lastName: string
  readonly dateOfBirth?: Date | null;
  readonly notes?: string
  readonly visibilityId: string
  readonly createdBy: string
  readonly password?: string
}

export interface UpdateUserData {
  readonly firstName?: string
  readonly lastName?: string
  readonly dateOfBirth?: Date
  readonly notes?: string
  readonly ageRange?: AgeRange | null
  readonly visibilityId?: string
  readonly password?: string
}

export interface UserFilters {
  readonly email?: string
  readonly firstName?: string
  readonly lastName?: string
  readonly isActive?: boolean
  readonly createdBy?: string
  readonly ageRange?: AgeRange
}

export interface UserListOptions {
  readonly filters?: UserFilters
  readonly page?: number
  readonly limit?: number
  readonly sortBy?: keyof User
  readonly sortOrder?: 'asc' | 'desc'
  readonly includeInactive?: boolean
}

export interface UserActivitySummary {
  readonly totalWorkouts: number
  readonly totalPrograms: number
  readonly activeEnrollments: number
}

/**
 * User Repository - Handles all user data operations
 * Implements specific user business logic and data access patterns
 */
export class UserRepository extends BaseRepository {
  constructor() {
    super('User')
  }

  /**
   * Find user by ID with optional relations
   */
  public async findUserById(
    id: string,
    includeRelations: boolean = false
  ): Promise<User | null> {
    const include = includeRelations ? {
      visibility: true,
      createdByUser: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      programEnrollments: {
        where: { isActive: true },
        include: {
          program: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
        take: 10, // Limit recent enrollments
      },
    } : undefined

    return this.findById(id, this.db.user, include)
  }

  /**
   * Find user by email
   */
  public async findUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.findFirst(this.db.user, {
        where: { 
          email: email.toLowerCase().trim(),
          isActive: true 
        },
        include: {
          visibility: true,
        },
      }) as User

      logger.debug('User found by email', { email, found: !!user })
      return user
    } catch (error) {
      logger.error('Failed to find user by email', { email, error })
      throw new Error('Failed to find user by email')
    }
  }

    /**
   * Bulk update age ranges for existing users (migration helper)
   */
    public async updateAgeRangesForExistingUsers(): Promise<number> {
      try {
        const usersWithoutAgeRange = await this.findMany(this.db.user, {
          where: {
            ageRange: null,
            dateOfBirth: { not: null },
            isActive: true
          }
        }) as User[]
  
        let updatedCount = 0
  
        for (const user of usersWithoutAgeRange) {
          if (user.dateOfBirth) {
            const ageRange = AgeAnonymizer.getAgeRange(user.dateOfBirth)
            
            await this.update(this.db.user, user.id, { ageRange })
            updatedCount++
          }
        }
  
        logger.info('Bulk updated age ranges for existing users', { 
          totalProcessed: usersWithoutAgeRange.length,
          updatedCount 
        })
  
        return updatedCount
      } catch (error) {
        logger.error('Failed to bulk update age ranges', { error })
        throw new Error('Failed to bulk update age ranges')
      }
    }

      /**
   * Check if user is minor based on age range
   */
  public async isUserMinor(userId: string): Promise<boolean> {
    try {
      const user = await this.findUserById(userId)
      if (!user?.ageRange) {
        return false
      }

      return AgeAnonymizer.isMinor(user.ageRange)
    } catch (error) {
      logger.error('Failed to check if user is minor', { userId, error })
      return false
    }
  }

    /**
   * Get age distribution analytics (anonymized)
   */
    public async getAgeDistribution(): Promise<Record<AgeRange, number>> {
      try {
        const distribution: Record<AgeRange, number> = {} as Record<AgeRange, number>
  
        // Initialize all age ranges with 0
        Object.values(AgeRange).forEach(range => {
          distribution[range] = 0
        })
  
        // Count users in each age range
        const results = await this.db.user.groupBy({
          by: ['ageRange'],
          where: { 
            isActive: true,
            ageRange: { not: null }
          },
          _count: true,
        })
  
        results.forEach(result => {
          if (result.ageRange && AgeAnonymizer.isValidAgeRange(result.ageRange)) {
            distribution[result.ageRange as AgeRange] = result._count
          }
        })
  
        logger.debug('Age distribution retrieved', { distribution })
        return distribution
      } catch (error) {
        logger.error('Failed to get age distribution', { error })
        throw new Error('Failed to get age distribution')
      }
    }

    /**
   * Get users by age range for analytics (privacy-preserving)
   */
  public async getUsersByAgeRange(ageRange: AgeRange): Promise<readonly User[]> {
    try {
      const users = await this.findMany(this.db.user, {
        where: { 
          ageRange,
          isActive: true 
        },
        include: {
          visibility: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
        },
      }) as User[]

      logger.debug('Users retrieved by age range', {
        ageRange: AgeAnonymizer.getDisplayName(ageRange),
        count: users.length
      })

      return users
    } catch (error) {
      logger.error('Failed to get users by age range', { ageRange, error })
      throw new Error('Failed to get users by age range')
    }
  }

  /**
   * Get users list with filters and pagination
   */
  public async findUsers(options: UserListOptions = {}): Promise<PaginatedResult<User>> {
    const {
      filters = {},
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeInactive = false,
    } = options

    try {
      // Build where clause
      const where: Prisma.UserWhereInput = {
        ...(filters.email && {
          email: {
            contains: filters.email,
            mode: 'insensitive',
          },
        }),
        ...(filters.firstName && {
          firstName: {
            contains: filters.firstName,
            mode: 'insensitive',
          },
        }),
        ...(filters.lastName && {
          lastName: {
            contains: filters.lastName,
            mode: 'insensitive',
          },
        }),
        ...(filters.ageRange && { ageRange: filters.ageRange }),
        ...(filters.createdBy && { createdBy: filters.createdBy }),
        ...(!includeInactive && { isActive: true }),
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
      }

      const include = {
        visibility: {
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      }

      const orderBy = { [sortBy]: sortOrder }

      return await this.findManyWithPagination(this.db.user, {
        where,
        include,
        orderBy,
        page,
        limit,
      })
    } catch (error) {
      logger.error('Failed to retrieve users list', { options, error })
      throw new Error('Failed to retrieve users list')
    }
  }

  /**
   * Create new user
   */
  public async createUser(data: CreateUserData): Promise<User> {
    try {
      // Validate email uniqueness
      const existingUser = await this.findUserByEmail(data.email)
      if (existingUser) {
        throw new Error('User with this email already exists')
      }

      // Calculate age range if date of birth provided
      const ageRange = data.dateOfBirth ? AgeAnonymizer.getAgeRange(data.dateOfBirth) : null

      const user: User = await this.create(this.db.user, {
        ...data,
        email: data.email.toLowerCase().trim(),
        ageRange, // Store anonymized age range
      })

      logger.info('User created successfully', { 
        userId: user.id, 
        email: user.email,
        ageRange: ageRange ? AgeAnonymizer.getDisplayName(ageRange) : 'not provided'
      })
      return user
    } catch (error) {
      logger.error('Failed to create user', { data: { ...data, email: data.email }, error })
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }


  /**
   * Update user by ID
   */
  public async updateUser(id: string, data: UpdateUserData): Promise<User> {
    try {
      const existingUser = await this.exists(this.db.user, id)
      if (!existingUser) {
        throw new Error('User not found')
      }

      // Recalculate age range if date of birth is being updated
      let updateData = { ...data }
      if (data.dateOfBirth !== undefined) {
        updateData.ageRange = data.dateOfBirth ? AgeAnonymizer.getAgeRange(data.dateOfBirth) : null
      }

      const user: User = await this.update(this.db.user, id, updateData)

      logger.info('User updated successfully', { 
        userId: id,
        ageRangeUpdated: data.dateOfBirth !== undefined
      })
      return user
    } catch (error) {
      logger.error('Failed to update user', { id, data, error })
      throw new Error(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Soft delete user
   */
  public async deleteUser(id: string): Promise<void> {
    try {
      const existingUser = await this.exists(this.db.user, id)
      if (!existingUser) {
        throw new Error('User not found')
      }

      await this.softDelete(this.db.user, id)
      logger.info('User deleted successfully', { userId: id })
    } catch (error) {
      logger.error('Failed to delete user', { id, error })
      throw new Error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update user's last login timestamp
   */
  public async updateUserLastLogin(id: string): Promise<void> {
    try {
      await this.db.user.update({
        where: { id },
        data: { lastLogin: new Date() },
      })

      logger.debug('User last login updated', { userId: id })
    } catch (error) {
      logger.error('Failed to update user last login', { id, error })
      // Don't throw error for last login update failures
    }
  }

  /**
   * Check if user has permission for a resource
   * TODO: Implement proper permission checking with roles/permissions
   */
  public async hasUserPermission(
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    try {
      // TODO: Implement proper permission checking logic
      // For now, return true for basic operations
      logger.debug('Permission check requested', { userId, resource, action })
      return true
    } catch (error) {
      logger.error('Failed to check user permission', { userId, resource, action, error })
      return false
    }
  }

  /**
   * Get user's activity summary
   */
  public async getUserActivitySummary(userId: string): Promise<UserActivitySummary> {
    try {
      const [workoutSessions, programEnrollments, activeEnrollments] = await Promise.all([
        this.count(this.db.userWorkoutSession, { userId, isActive: true }),
        this.count(this.db.userProgramEnrollment, { userId, isActive: true }),
        this.count(this.db.userProgramEnrollment, { 
          userId, 
          isActive: true, 
          status: 'ACTIVE' 
        }),
      ])

      return {
        totalWorkouts: workoutSessions,
        totalPrograms: programEnrollments,
        activeEnrollments,
      }
    } catch (error) {
      logger.error('Failed to get user activity summary', { userId, error })
      throw new Error('Failed to get user activity summary')
    }
  }

  /**
   * Search users by name or email
   */
  public async searchUsers(
    searchTerm: string,
    limit: number = 20
  ): Promise<readonly User[]> {
    try {
      const searchWhere: Prisma.UserWhereInput = {
        OR: [
          {
            email: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            firstName: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            lastName: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
        ],
        isActive: true,
      }

      const include = {
        visibility: {
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
      }

      const users = await this.findMany(this.db.user, {
        where: searchWhere,
        include,
        take: limit,
        orderBy: [
          { firstName: 'asc' },
          { lastName: 'asc' },
        ],
      }) as User[]

      logger.debug('User search completed', {
        searchTerm,
        resultsCount: users.length,
      })

      return users
    } catch (error) {
      logger.error('Failed to search users', { searchTerm, error })
      throw new Error('Failed to search users')
    }
  }

  /**
   * Check if email is available for registration
   */
  public async isEmailAvailable(email: string, excludeUserId?: string): Promise<boolean> {
    try {
      const where: Prisma.UserWhereInput = {
        email: email.toLowerCase().trim(),
        isActive: true,
        ...(excludeUserId && { NOT: { id: excludeUserId } }),
      }

      const count = await this.count(this.db.user, where)
      return count === 0
    } catch (error) {
      logger.error('Failed to check email availability', { email, excludeUserId, error })
      throw new Error('Failed to check email availability')
    }
  }
}