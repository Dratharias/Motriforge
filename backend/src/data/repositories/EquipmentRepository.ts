import { Model, Types } from 'mongoose';
import { LoggerFacade } from '@/core/logging';
import { EventMediator } from '@/core/events/EventMediator';
import { CacheFacade } from '@/core/cache/facade/CacheFacade';
import { IEquipment } from '@/types/models';
import { IEquipmentRepository } from '@/types/repositories';
import { ValidationResult, RepositoryContext } from '@/types/repositories/base';
import { BaseRepository } from './BaseRepository';
import { ValidationHelpers } from './helpers';

/**
 * Repository for equipment operations with enhanced validation and caching
 */
export class EquipmentRepository extends BaseRepository<IEquipment> implements IEquipmentRepository {
  private static readonly CACHE_TTL = 600; // 10 minutes
  private static readonly EQUIPMENT_CACHE_TTL = 3600; // 1 hour for equipment data (changes less frequently)

  constructor(
    equipmentModel: Model<IEquipment>,
    logger: LoggerFacade,
    eventMediator: EventMediator,
    cache?: CacheFacade
  ) {
    super(equipmentModel, logger, eventMediator, cache, 'EquipmentRepository');
  }

  /**
   * Find equipment by name
   */
  public async findByName(name: string): Promise<IEquipment | null> {
    const cacheKey = this.cacheHelpers.generateCustomKey('name', { name });
    
    const cached = await this.cacheHelpers.getCustom<IEquipment>(cacheKey);
    if (cached) {
      return this.mapToEntity(cached);
    }

    try {
      this.logger.debug('Finding equipment by name', { name });
      
      const equipment = await this.crudOps.findOne({
        $or: [
          { name: { $regex: new RegExp(`^${name}$`, 'i') } },
          { aliases: { $in: [new RegExp(`^${name}$`, 'i')] } }
        ]
      });

      if (equipment && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, equipment, EquipmentRepository.EQUIPMENT_CACHE_TTL);
        const equipmentId = this.extractId(equipment);
        if (equipmentId) {
          await this.cacheHelpers.cacheById(equipmentId, equipment, EquipmentRepository.EQUIPMENT_CACHE_TTL);
        }
      }

      return equipment ? this.mapToEntity(equipment) : null;
    } catch (error) {
      this.logger.error('Error finding equipment by name', error as Error, { name });
      throw error;
    }
  }

  /**
   * Find equipment by category
   */
  public async findByCategory(category: string): Promise<IEquipment[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('category', { category });
    
    const cached = await this.cacheHelpers.getCustom<IEquipment[]>(cacheKey);
    if (cached) {
      return cached.map(equipment => this.mapToEntity(equipment));
    }

    try {
      this.logger.debug('Finding equipment by category', { category });
      
      const equipment = await this.crudOps.find({
        $or: [
          { category: { $regex: new RegExp(`^${category}$`, 'i') } },
          { subcategory: { $regex: new RegExp(`^${category}$`, 'i') } }
        ]
      }, {
        sort: [{ field: 'name', direction: 'asc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, equipment, EquipmentRepository.CACHE_TTL);
      }

      return equipment.map(item => this.mapToEntity(item));
    } catch (error) {
      this.logger.error('Error finding equipment by category', error as Error, { category });
      throw error;
    }
  }

  /**
   * Find equipment by organization
   */
  public async findByOrganization(organizationId: Types.ObjectId): Promise<IEquipment[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('organization', { 
      organizationId: organizationId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<IEquipment[]>(cacheKey);
    if (cached) {
      return cached.map(equipment => this.mapToEntity(equipment));
    }

    try {
      this.logger.debug('Finding equipment by organization', { 
        organizationId: organizationId.toString() 
      });
      
      const equipment = await this.crudOps.find({
        organization: organizationId
      }, {
        sort: [{ field: 'name', direction: 'asc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, equipment, EquipmentRepository.CACHE_TTL);
      }

      return equipment.map(item => this.mapToEntity(item));
    } catch (error) {
      this.logger.error('Error finding equipment by organization', error as Error, { 
        organizationId: organizationId.toString() 
      });
      throw error;
    }
  }

  /**
   * Find platform equipment (organization-independent)
   */
  public async findPlatformEquipment(): Promise<IEquipment[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('platform', {});
    
    const cached = await this.cacheHelpers.getCustom<IEquipment[]>(cacheKey);
    if (cached) {
      return cached.map(equipment => this.mapToEntity(equipment));
    }

    try {
      this.logger.debug('Finding platform equipment');
      
      const equipment = await this.crudOps.find({
        isPlatformEquipment: true
      }, {
        sort: [{ field: 'category', direction: 'asc' }, { field: 'name', direction: 'asc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(
          cacheKey, 
          equipment, 
          EquipmentRepository.EQUIPMENT_CACHE_TTL
        );
      }

      return equipment.map(item => this.mapToEntity(item));
    } catch (error) {
      this.logger.error('Error finding platform equipment', error as Error);
      throw error;
    }
  }

  /**
   * Search equipment by name
   */
  public async searchByName(query: string, limit: number = 20): Promise<IEquipment[]> {
    try {
      this.logger.debug('Searching equipment by name', { query, limit });
      
      const equipment = await this.crudOps.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { aliases: { $in: [new RegExp(query, 'i')] } }
        ]
      }, {
        sort: [{ field: 'name', direction: 'asc' }],
        pagination: { limit, offset: 0, page: 1, pageSize: limit }
      });

      return equipment.map(item => this.mapToEntity(item));
    } catch (error) {
      this.logger.error('Error searching equipment by name', error as Error, { query, limit });
      throw error;
    }
  }

  /**
   * Find equipment by tags
   */
  public async findByTags(tags: string[]): Promise<IEquipment[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('tags', { 
      tags: tags.toSorted((a, b) => a.localeCompare(b)) 
    });
    
    const cached = await this.cacheHelpers.getCustom<IEquipment[]>(cacheKey);
    if (cached) {
      return cached.map(equipment => this.mapToEntity(equipment));
    }

    try {
      this.logger.debug('Finding equipment by tags', { tags });
      
      const equipment = await this.crudOps.find({
        tags: { $in: tags }
      }, {
        sort: [{ field: 'name', direction: 'asc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, equipment, EquipmentRepository.CACHE_TTL);
      }

      return equipment.map(item => this.mapToEntity(item));
    } catch (error) {
      this.logger.error('Error finding equipment by tags', error as Error, { tags });
      throw error;
    }
  }

  /**
   * Find related equipment
   */
  public async findRelatedEquipment(equipmentId: Types.ObjectId): Promise<IEquipment[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('related', { 
      equipmentId: equipmentId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<IEquipment[]>(cacheKey);
    if (cached) {
      return cached.map(equipment => this.mapToEntity(equipment));
    }

    try {
      this.logger.debug('Finding related equipment', { 
        equipmentId: equipmentId.toString() 
      });
      
      // Get the original equipment first
      const originalEquipment = await this.findById(equipmentId);
      if (!originalEquipment) {
        return [];
      }

      // Find equipment with matching categories or in the related equipment list
      const relatedEquipment = await this.crudOps.find({
        $and: [
          { _id: { $ne: equipmentId } },
          {
            $or: [
              { category: originalEquipment.category },
              { subcategory: originalEquipment.subcategory },
              { relatedEquipment: { $in: [equipmentId] } },
              { _id: { $in: originalEquipment.relatedEquipment } }
            ]
          }
        ]
      }, {
        sort: [{ field: 'name', direction: 'asc' }],
        pagination: { limit: 10, offset: 0, page: 1, pageSize: 10 }
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, relatedEquipment, EquipmentRepository.CACHE_TTL);
      }

      return relatedEquipment.map(item => this.mapToEntity(item));
    } catch (error) {
      this.logger.error('Error finding related equipment', error as Error, { 
        equipmentId: equipmentId.toString() 
      });
      throw error;
    }
  }

  /**
   * Find equipment by subcategory
   */
  public async findBySubcategory(subcategory: string): Promise<IEquipment[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('subcategory', { subcategory });
    
    const cached = await this.cacheHelpers.getCustom<IEquipment[]>(cacheKey);
    if (cached) {
      return cached.map(equipment => this.mapToEntity(equipment));
    }

    try {
      this.logger.debug('Finding equipment by subcategory', { subcategory });
      
      const equipment = await this.crudOps.find({
        subcategory: { $regex: new RegExp(`^${subcategory}$`, 'i') }
      }, {
        sort: [{ field: 'name', direction: 'asc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, equipment, EquipmentRepository.CACHE_TTL);
      }

      return equipment.map(item => this.mapToEntity(item));
    } catch (error) {
      this.logger.error('Error finding equipment by subcategory', error as Error, { subcategory });
      throw error;
    }
  }

  /**
   * Get equipment categories
   */
  public async getCategories(): Promise<string[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('categories', {});
    
    const cached = await this.cacheHelpers.getCustom<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      this.logger.debug('Getting equipment categories');
      
      const categories = await this.crudOps.distinct('category');

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(
          cacheKey, 
          categories, 
          EquipmentRepository.EQUIPMENT_CACHE_TTL
        );
      }

      return categories;
    } catch (error) {
      this.logger.error('Error getting equipment categories', error as Error);
      throw error;
    }
  }

  /**
   * Override create to handle equipment-specific logic
   */
  public async create(data: Partial<IEquipment>, context?: RepositoryContext): Promise<IEquipment> {
    // Validate unique name within organization or platform
    if (data.name) {
      const query: any = {
        name: { $regex: new RegExp(`^${data.name}$`, 'i') }
      };

      if (data.isPlatformEquipment) {
        query.isPlatformEquipment = true;
      } else if (data.organization) {
        query.organization = data.organization;
      }

      const existingEquipment = await this.crudOps.findOne(query);
      
      if (existingEquipment) {
        throw new Error('Equipment with this name already exists');
      }
    }

    // Set default values
    const equipmentData: Partial<IEquipment> = {
      ...data,
      aliases: data.aliases ?? [],
      tags: data.tags ?? [],
      mediaIds: data.mediaIds ?? [],
      specifications: data.specifications ?? {},
      safetyNotes: data.safetyNotes ?? [],
      commonUses: data.commonUses ?? [],
      relatedEquipment: data.relatedEquipment ?? [],
      isPlatformEquipment: data.isPlatformEquipment ?? false
    };

    const equipment = await super.create(equipmentData, context);

    // Publish equipment creation event
    await this.publishEvent('equipment.created', {
      equipmentId: equipment._id.toString(),
      name: equipment.name,
      category: equipment.category,
      subcategory: equipment.subcategory,
      organizationId: equipment.organization?.toString(),
      isPlatformEquipment: equipment.isPlatformEquipment,
      timestamp: new Date()
    });

    return equipment;
  }

  /**
   * Validate equipment data
   */
  protected validateData(data: Partial<IEquipment>): ValidationResult {
    const errors: string[] = [];

    // Basic field validations
    this.validateBasicFields(data, errors);
    
    // Array field validations
    this.validateArrayFields(data, errors);
    
    // Object field validations
    this.validateObjectFields(data, errors);

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate basic string fields
   */
  private validateBasicFields(data: Partial<IEquipment>, errors: string[]): void {
    // Name validation
    if (data.name !== undefined) {
      const nameValidation = ValidationHelpers.validateFieldLength(
        data.name, 
        'name', 
        2, 
        100
      );
      if (!nameValidation.valid) {
        errors.push(...nameValidation.errors);
      }
    }

    // Description validation
    if (data.description !== undefined && data.description.length > 1000) {
      errors.push('Description must be less than 1000 characters');
    }

    // Category validation
    if (data.category !== undefined) {
      const categoryValidation = ValidationHelpers.validateFieldLength(
        data.category, 
        'category', 
        2, 
        50
      );
      if (!categoryValidation.valid) {
        errors.push(...categoryValidation.errors);
      }
    }

    // Subcategory validation
    if (data.subcategory !== undefined) {
      const subcategoryValidation = ValidationHelpers.validateFieldLength(
        data.subcategory, 
        'subcategory', 
        2, 
        50
      );
      if (!subcategoryValidation.valid) {
        errors.push(...subcategoryValidation.errors);
      }
    }

    // Usage validation
    if (data.usage !== undefined && data.usage.length > 500) {
      errors.push('Usage must be less than 500 characters');
    }
  }

  /**
   * Validate array fields
   */
  private validateArrayFields(data: Partial<IEquipment>, errors: string[]): void {
    const arrayFields = [
      'aliases', 'tags', 'mediaIds', 'safetyNotes', 
      'commonUses', 'relatedEquipment'
    ] as const;

    arrayFields.forEach(field => {
      if (data[field]) {
        if (!Array.isArray(data[field])) {
          errors.push(`${field} must be an array`);
        } else if (field === 'mediaIds' || field === 'relatedEquipment') {
            // Validate ObjectId arrays
            data[field].forEach((id, index) => {
              if (!ValidationHelpers.validateObjectId(id.toString())) {
                errors.push(`Invalid ${field} ID at index ${index}`);
              }
            });
          } else {
            // Validate string arrays
            data[field].forEach((item, index) => {
              if (typeof item !== 'string' || item.length === 0) {
                errors.push(`${field} item at index ${index} must be a non-empty string`);
              }
            });
          }
      }
    });
  }

  /**
   * Validate object fields
   */
  private validateObjectFields(data: Partial<IEquipment>, errors: string[]): void {
    // Specifications validation
    if (data.specifications && typeof data.specifications !== 'object') {
      errors.push('Specifications must be an object');
    }
  }

  /**
   * Map database document to domain entity
   */
  protected mapToEntity(data: any): IEquipment {
    return {
      _id: data._id,
      name: data.name,
      description: data.description ?? '',
      aliases: data.aliases ?? [],
      category: data.category,
      subcategory: data.subcategory,
      mediaIds: data.mediaIds ?? [],
      specifications: data.specifications ?? {},
      usage: data.usage ?? '',
      safetyNotes: data.safetyNotes ?? [],
      commonUses: data.commonUses ?? [],
      relatedEquipment: data.relatedEquipment ?? [],
      tags: data.tags ?? [],
      isPlatformEquipment: data.isPlatformEquipment ?? false,
      organization: data.organization,
      createdBy: data.createdBy,
      isArchived: data.isArchived ?? false,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    } as IEquipment;
  }

  /**
   * Map domain entity to database document
   */
  protected mapFromEntity(entity: IEquipment): any {
    const doc = { ...entity };
    
    // Remove any computed fields
    delete (doc as any).__v;
    
    return doc;
  }
}