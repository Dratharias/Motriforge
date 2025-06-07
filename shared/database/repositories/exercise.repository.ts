import { logger } from "@/shared/utils/logger"
import { Exercise, Equipment, Prisma, TargetType } from "@/prisma/generated"
import { BaseRepository, PaginatedResult } from "./base.repository"

export interface CreateExerciseData {
  readonly name: string
  readonly description: string
  readonly instructions: string
  readonly notes?: string | null
  readonly difficultyLevelId: string
  readonly visibilityId: string
  readonly createdBy: string
  readonly categoryIds?: readonly string[]
  readonly tagIds?: readonly string[]
  readonly equipmentIds?: readonly string[]
  readonly muscleTargets?: readonly {
    readonly muscleId: string
    readonly targetType: TargetType
    readonly intensity: number
  }[]
}

export interface UpdateExerciseData {
  readonly name?: string
  readonly description?: string
  readonly instructions?: string
  readonly notes?: string | null
  readonly difficultyLevelId?: string
  readonly visibilityId?: string
}

export interface ExerciseFilters {
  readonly name?: string
  readonly difficultyLevelId?: string
  readonly categoryIds?: readonly string[]
  readonly tagIds?: readonly string[]
  readonly equipmentIds?: readonly string[]
  readonly muscleGroupIds?: readonly string[]
  readonly createdBy?: string
  readonly isActive?: boolean
}

export interface ExerciseListOptions {
  readonly filters?: ExerciseFilters
  readonly page?: number
  readonly limit?: number
  readonly sortBy?: keyof Exercise
  readonly sortOrder?: 'asc' | 'desc'
  readonly includeInactive?: boolean
}

export interface CreateEquipmentData {
  readonly name: string
  readonly description?: string | null
  readonly manufacturer?: string | null
  readonly model?: string | null
  readonly visibilityId: string
  readonly createdBy: string
  readonly categoryIds?: readonly string[]
  readonly tagIds?: readonly string[]
}

export interface UpdateEquipmentData {
  readonly name?: string
  readonly description?: string | null
  readonly manufacturer?: string | null
  readonly model?: string | null
  readonly visibilityId?: string
}

export interface EquipmentFilters {
  readonly name?: string
  readonly manufacturer?: string
  readonly categoryIds?: readonly string[]
  readonly isActive?: boolean
}

export interface EquipmentListOptions {
  readonly filters?: EquipmentFilters
  readonly page?: number
  readonly limit?: number
  readonly sortBy?: keyof Equipment
  readonly sortOrder?: 'asc' | 'desc'
}

/**
 * Exercise Repository - Handles exercises, equipment, and related data operations
 * Manages complex relationships between exercises, equipment, muscles, and categories
 */
export class ExerciseRepository extends BaseRepository {
  constructor() {
    super('Exercise')
  }

  // =====================================
  // EXERCISE OPERATIONS
  // =====================================

  /**
   * Find exercise by ID with full relations
   */
  public async findExerciseById(
    id: string,
    includeRelations: boolean = true
  ): Promise<Exercise | null> {
    const include = includeRelations ? {
      difficultyLevel: true,
      visibility: true,
      createdByUser: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      categories: {
        where: { isActive: true },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              type: true,
              path: true,
            },
          },
        },
      },
      tags: {
        where: { isActive: true },
        include: {
          tag: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      },
      equipment: {
        where: { isActive: true },
        include: {
          equipment: {
            select: {
              id: true,
              name: true,
              manufacturer: true,
              model: true,
            },
          },
        },
      },
      muscleTargets: {
        where: { isActive: true },
        include: {
          muscle: {
            include: {
              muscleGroup: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      media: {
        where: { isActive: true },
        include: {
          media: {
            select: {
              id: true,
              filename: true,
              url: true,
              mimeType: true,
            },
          },
        },
        orderBy: { orderIndex: 'asc' },
      },
    } : undefined

    return this.findById(id, this.db.exercise, include)
  }

  /**
   * Get exercises list with advanced filtering
   */
  public async findExercises(options: ExerciseListOptions = {}): Promise<PaginatedResult<Exercise>> {
    const {
      filters = {},
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeInactive = false,
    } = options

    try {
      // Build complex where clause
      const where: Prisma.ExerciseWhereInput = {
        ...(filters.name && {
          name: {
            contains: filters.name,
            mode: 'insensitive',
          },
        }),
        ...(filters.difficultyLevelId && { difficultyLevelId: filters.difficultyLevelId }),
        ...(filters.categoryIds?.length && {
          categories: {
            some: {
              categoryId: { in: filters.categoryIds as string[] },
              isActive: true,
            },
          },
        }),
        ...(filters.tagIds?.length && {
          tags: {
            some: {
              tagId: { in: filters.tagIds as string[] },
              isActive: true,
            },
          },
        }),
        ...(filters.equipmentIds?.length && {
          equipment: {
            some: {
              equipmentId: { in: filters.equipmentIds as string[] },
              isActive: true,
            },
          },
        }),
        ...(filters.muscleGroupIds?.length && {
          muscleTargets: {
            some: {
              muscle: {
                muscleGroupId: { in: filters.muscleGroupIds as string[] },
              },
              isActive: true,
            },
          },
        }),
        ...(filters.createdBy && { createdBy: filters.createdBy }),
        ...(!includeInactive && { isActive: true }),
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
      }

      const include = {
        difficultyLevel: {
          select: {
            id: true,
            name: true,
            value: true,
            colorCode: true,
          },
        },
        categories: {
          where: { isActive: true },
          include: {
            category: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
          take: 5, // Limit categories for list view
        },
        tags: {
          where: { isActive: true },
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
          take: 10, // Limit tags for list view
        },
        equipment: {
          where: { isActive: true },
          include: {
            equipment: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        muscleTargets: {
          where: { isActive: true },
          include: {
            muscle: {
              include: {
                muscleGroup: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      }

      const orderBy = { [sortBy]: sortOrder }

      return await this.findManyWithPagination(this.db.exercise, {
        where,
        include,
        orderBy,
        page,
        limit,
      })
    } catch (error) {
      logger.error('Failed to retrieve exercises list', { options, error })
      throw new Error('Failed to retrieve exercises list')
    }
  }

  /**
   * Create new exercise with relationships
   */
  public async createExercise(data: CreateExerciseData): Promise<Exercise> {
    try {
      // Check for duplicate name
      const existingExercise = await this.findFirst(this.db.exercise, {
        where: { 
          name: data.name,
          isActive: true 
        },
      })

      if (existingExercise) {
        throw new Error('Exercise with this name already exists')
      }

      // Create exercise with relationships in transaction
      const exercise = await this.withTransaction(async (db) => {
        // Create exercise
        const newExercise = await db.exercise.create({
          data: {
            name: data.name,
            description: data.description,
            instructions: data.instructions,
            notes: data.notes ?? null,
            difficultyLevelId: data.difficultyLevelId,
            visibilityId: data.visibilityId,
            createdBy: data.createdBy,
          },
        })

        // Add categories
        if (data.categoryIds?.length) {
          await db.exerciseCategory.createMany({
            data: data.categoryIds.map((categoryId, index) => ({
              exerciseId: newExercise.id,
              categoryId,
              isPrimary: index === 0, // First category is primary
              createdBy: data.createdBy,
            })),
          })
        }

        // Add tags
        if (data.tagIds?.length) {
          await db.exerciseTag.createMany({
            data: data.tagIds.map((tagId) => ({
              exerciseId: newExercise.id,
              tagId,
              createdBy: data.createdBy,
            })),
          })
        }

        // Add equipment
        if (data.equipmentIds?.length) {
          await db.exerciseEquipment.createMany({
            data: data.equipmentIds.map((equipmentId) => ({
              exerciseId: newExercise.id,
              equipmentId,
              isRequired: true, // TODO: Make configurable
              createdBy: data.createdBy,
            })),
          })
        }

        // Add muscle targets
        if (data.muscleTargets?.length) {
          await db.exerciseMuscleTarget.createMany({
            data: data.muscleTargets.map((target) => ({
              exerciseId: newExercise.id,
              muscleId: target.muscleId,
              targetType: target.targetType,
              intensity: target.intensity,
              createdBy: data.createdBy,
            })),
          })
        }

        return newExercise
      })

      logger.info('Exercise created successfully', { exerciseId: exercise.id, name: exercise.name })
      return exercise
    } catch (error) {
      logger.error('Failed to create exercise', { data, error })
      throw new Error(`Failed to create exercise: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update exercise
   */
  public async updateExercise(id: string, data: UpdateExerciseData): Promise<Exercise> {
    try {
      const existingExercise = await this.exists(this.db.exercise, id)
      if (!existingExercise) {
        throw new Error('Exercise not found')
      }

      // Check for duplicate name if name is being updated
      if (data.name) {
        const duplicateExercise = await this.findFirst(this.db.exercise, {
          where: { 
            name: data.name,
            isActive: true,
            NOT: { id }
          },
        })

        if (duplicateExercise) {
          throw new Error('Exercise with this name already exists')
        }
      }

      const exercise: Exercise = await this.update(this.db.exercise, id, data)

      logger.info('Exercise updated successfully', { exerciseId: id })
      return exercise
    } catch (error) {
      logger.error('Failed to update exercise', { id, data, error })
      throw new Error(`Failed to update exercise: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete exercise (soft delete)
   */
  public async deleteExercise(id: string): Promise<void> {
    try {
      const existingExercise = await this.exists(this.db.exercise, id)
      if (!existingExercise) {
        throw new Error('Exercise not found')
      }

      await this.softDelete(this.db.exercise, id)
      logger.info('Exercise deleted successfully', { exerciseId: id })
    } catch (error) {
      logger.error('Failed to delete exercise', { id, error })
      throw new Error(`Failed to delete exercise: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // =====================================
  // EQUIPMENT OPERATIONS
  // =====================================

  /**
   * Find equipment by ID
   */
  public async findEquipmentById(
    id: string,
    includeRelations: boolean = true
  ): Promise<Equipment | null> {
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
      categories: {
        where: { isActive: true },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      },
      tags: {
        where: { isActive: true },
        include: {
          tag: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      },
      exercises: {
        where: { isActive: true },
        include: {
          exercise: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
        take: 20, // Limit related exercises
      },
    } : undefined

    return this.findById(id, this.db.equipment, include)
  }

  /**
   * Get equipment list
   */
  public async findEquipment(options: EquipmentListOptions = {}): Promise<PaginatedResult<Equipment>> {
    const {
      filters = {},
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options

    try {
      const where: Prisma.EquipmentWhereInput = {
        ...(filters.name && {
          name: {
            contains: filters.name,
            mode: 'insensitive',
          },
        }),
        ...(filters.manufacturer && {
          manufacturer: {
            contains: filters.manufacturer,
            mode: 'insensitive',
          },
        }),
        ...(filters.categoryIds?.length && {
          categories: {
            some: {
              categoryId: { in: filters.categoryIds as string[] },
              isActive: true,
            },
          },
        }),
        ...(filters.isActive !== undefined ? { isActive: filters.isActive } : { isActive: true }),
      }

      const include = {
        categories: {
          where: { isActive: true },
          include: {
            category: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
        tags: {
          where: { isActive: true },
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      }

      const orderBy = { [sortBy]: sortOrder }

      return await this.findManyWithPagination(this.db.equipment, {
        where,
        include,
        orderBy,
        page,
        limit,
      })
    } catch (error) {
      logger.error('Failed to retrieve equipment list', { options, error })
      throw new Error('Failed to retrieve equipment list')
    }
  }

  /**
   * Create new equipment
   */
  public async createEquipment(data: CreateEquipmentData): Promise<Equipment> {
    try {
      // Check for duplicate name
      const existingEquipment = await this.findFirst(this.db.equipment, {
        where: { 
          name: data.name,
          isActive: true 
        },
      })

      if (existingEquipment) {
        throw new Error('Equipment with this name already exists')
      }

      // Create equipment with relationships in transaction
      const equipment = await this.withTransaction(async (db) => {
        const newEquipment = await db.equipment.create({
          data: {
            name: data.name,
            description: data.description ?? null,
            manufacturer: data.manufacturer ?? null,
            model: data.model ?? null,
            visibilityId: data.visibilityId,
            createdBy: data.createdBy,
          },
        })

        // Add categories
        if (data.categoryIds?.length) {
          await db.equipmentCategory.createMany({
            data: data.categoryIds.map((categoryId, index) => ({
              equipmentId: newEquipment.id,
              categoryId,
              isPrimary: index === 0,
              createdBy: data.createdBy,
            })),
          })
        }

        // Add tags
        if (data.tagIds?.length) {
          await db.equipmentTag.createMany({
            data: data.tagIds.map((tagId) => ({
              equipmentId: newEquipment.id,
              tagId,
              createdBy: data.createdBy,
            })),
          })
        }

        return newEquipment
      })

      logger.info('Equipment created successfully', { equipmentId: equipment.id, name: equipment.name })
      return equipment
    } catch (error) {
      logger.error('Failed to create equipment', { data, error })
      throw new Error(`Failed to create equipment: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update equipment
   */
  public async updateEquipment(id: string, data: UpdateEquipmentData): Promise<Equipment> {
    try {
      const existingEquipment = await this.exists(this.db.equipment, id)
      if (!existingEquipment) {
        throw new Error('Equipment not found')
      }

      // Check for duplicate name if name is being updated
      if (data.name) {
        const duplicateEquipment = await this.findFirst(this.db.equipment, {
          where: { 
            name: data.name,
            isActive: true,
            NOT: { id }
          },
        })

        if (duplicateEquipment) {
          throw new Error('Equipment with this name already exists')
        }
      }

      const equipment: Equipment = await this.update(this.db.equipment, id, data)

      logger.info('Equipment updated successfully', { equipmentId: id })
      return equipment
    } catch (error) {
      logger.error('Failed to update equipment', { id, data, error })
      throw new Error(`Failed to update equipment: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete equipment (soft delete)
   */
  public async deleteEquipment(id: string): Promise<void> {
    try {
      const existingEquipment = await this.exists(this.db.equipment, id)
      if (!existingEquipment) {
        throw new Error('Equipment not found')
      }

      await this.softDelete(this.db.equipment, id)
      logger.info('Equipment deleted successfully', { equipmentId: id })
    } catch (error) {
      logger.error('Failed to delete equipment', { id, error })
      throw new Error(`Failed to delete equipment: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // =====================================
  // UTILITY OPERATIONS
  // =====================================

  /**
   * Search exercises with text search across multiple fields
   */
  public async searchExercises(
    searchTerm: string,
    filters?: ExerciseFilters,
    limit: number = 20
  ): Promise<readonly Exercise[]> {
    try {
      const searchWhere: Prisma.ExerciseWhereInput = {
        OR: [
          {
            name: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            instructions: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
        ],
        isActive: true,
        // Apply additional filters if provided
        ...(filters && this.buildExerciseFilters(filters)),
      }

      const include = {
        difficultyLevel: {
          select: {
            id: true,
            name: true,
            value: true,
          },
        },
        categories: {
          where: { isActive: true },
          include: {
            category: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
        muscleTargets: {
          where: { isActive: true },
          include: {
            muscle: {
              include: {
                muscleGroup: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      }

      const exercises = await this.findMany(this.db.exercise, {
        where: searchWhere,
        include,
        take: limit,
        orderBy: [
          { name: 'asc' }, // Prioritize exact name matches
        ],
      }) as Exercise[]

      logger.debug('Exercise search completed', {
        searchTerm,
        resultsCount: exercises.length,
        filters,
      })

      return exercises
    } catch (error) {
      logger.error('Failed to search exercises', { searchTerm, filters, error })
      throw new Error('Failed to search exercises')
    }
  }

  /**
   * Helper method to build exercise filters for complex queries
   */
  private buildExerciseFilters(filters: ExerciseFilters): Prisma.ExerciseWhereInput {
    return {
      ...(filters.difficultyLevelId && { difficultyLevelId: filters.difficultyLevelId }),
      ...(filters.categoryIds?.length && {
        categories: {
          some: {
            categoryId: { in: filters.categoryIds as string[] },
            isActive: true,
          },
        },
      }),
      ...(filters.tagIds?.length && {
        tags: {
          some: {
            tagId: { in: filters.tagIds as string[] },
            isActive: true,
          },
        },
      }),
      ...(filters.equipmentIds?.length && {
        equipment: {
          some: {
            equipmentId: { in: filters.equipmentIds as string[] },
            isActive: true,
          },
        },
      }),
      ...(filters.muscleGroupIds?.length && {
        muscleTargets: {
          some: {
            muscle: {
              muscleGroupId: { in: filters.muscleGroupIds as string[] },
            },
            isActive: true,
          },
        },
      }),
      ...(filters.createdBy && { createdBy: filters.createdBy }),
      ...(filters.isActive !== undefined && { isActive: filters.isActive }),
    }
  }
}