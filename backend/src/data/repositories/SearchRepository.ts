import { Model, Types } from 'mongoose';
import { LoggerFacade } from '@/core/logging';
import { EventMediator } from '@/core/events/EventMediator';
import { CacheFacade } from '@/core/cache/facade/CacheFacade';
import { BaseRepository } from './BaseRepository';
import { ValidationHelpers } from './helpers';
import { 
  ValidationResult, 
  AggregationPipeline,
  ISearchIndex,
  ISearchQuery,
  ISearchResult,
} from '@/types/repositories';

/**
 * Search repository interface
 */
export interface ISearchRepository {
  search(query: ISearchQuery): Promise<ISearchResult[]>;
  searchByText(text: string, entityTypes?: string[], limit?: number): Promise<ISearchResult[]>;
  searchByTags(tags: string[], entityTypes?: string[]): Promise<ISearchResult[]>;
  searchByCategory(category: string, entityTypes?: string[]): Promise<ISearchResult[]>;
  indexEntity(entityType: string, entityId: Types.ObjectId, indexData: Partial<ISearchIndex>): Promise<ISearchIndex>;
  updateIndex(entityType: string, entityId: Types.ObjectId, indexData: Partial<ISearchIndex>): Promise<ISearchIndex | null>;
  removeFromIndex(entityType: string, entityId: Types.ObjectId): Promise<boolean>;
  reindexEntity(entityType: string, entityId: Types.ObjectId): Promise<ISearchIndex | null>;
  getPopularSearches(limit?: number): Promise<string[]>;
  getSuggestions(query: string, limit?: number): Promise<string[]>;
  findSimilarContent(entityType: string, entityId: Types.ObjectId, limit?: number): Promise<ISearchResult[]>;
  getSearchStats(): Promise<{ totalIndexed: number; byEntityType: Record<string, number> }>;
  bulkIndex(indexData: Partial<ISearchIndex>[]): Promise<ISearchIndex[]>;
  rebuildIndex(entityType?: string): Promise<number>;
  cleanupStaleIndexes(): Promise<number>;
}

/**
 * Repository for search operations with full-text search capabilities
 */
export class SearchRepository extends BaseRepository<ISearchIndex> implements ISearchRepository {
  private static readonly CACHE_TTL = 300; // 5 minutes
  private static readonly SEARCH_RESULTS_TTL = 180; // 3 minutes
  private static readonly SUGGESTIONS_TTL = 600; // 10 minutes
  private static readonly POPULAR_SEARCHES_TTL = 1800; // 30 minutes
  private static readonly SIMILAR_CONTENT_TTL = 900; // 15 minutes

  constructor(
    searchModel: Model<ISearchIndex>,
    logger: LoggerFacade,
    eventMediator: EventMediator,
    cache?: CacheFacade
  ) {
    super(searchModel, logger, eventMediator, cache, 'SearchRepository');
  }

  /**
   * Perform comprehensive search
   */
  public async search(query: ISearchQuery): Promise<ISearchResult[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('search', {
      query: query.query,
      entityTypes: query.entityTypes?.toSorted(),
      tags: query.tags?.toSorted(),
      category: query.category,
      organizationId: query.organizationId?.toString(),
      isPublic: query.isPublic,
      limit: query.limit,
      offset: query.offset,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      minScore: query.minScore
    });
    
    const cached = await this.cacheHelpers.getCustom<ISearchResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      this.logger.debug('Performing search', { query: query.query });

      // Build aggregation pipeline for full-text search
      const pipeline: AggregationPipeline = [
        {
          $match: this.buildSearchMatchQuery(query)
        },
        {
          $addFields: {
            relevanceScore: {
              $add: [
                // Text score from MongoDB text search
                { $ifNull: [{ $meta: 'textScore' }, 0] },
                // Boost for exact title matches
                {
                  $cond: {
                    if: { $regexMatch: { input: '$title', regex: query.query, options: 'i' } },
                    then: 10,
                    else: 0
                  }
                },
                // Boost for tag matches
                {
                  $cond: {
                    if: { $gt: [{ $size: { $setIntersection: ['$tags', query.tags ?? []] } }, 0] },
                    then: 5,
                    else: 0
                  }
                },
                // Base search score
                '$searchScore'
              ]
            }
          }
        },
        {
          $match: {
            relevanceScore: { $gte: query.minScore ?? 0 }
          }
        }
      ];

      // Add sorting
      if (query.sortBy === 'relevance') {
        pipeline.push({ $sort: { relevanceScore: query.sortOrder === 'asc' ? 1 : -1 } });
      } else if (query.sortBy === 'date') {
        pipeline.push({ $sort: { lastUpdated: query.sortOrder === 'asc' ? 1 : -1 } });
      } else if (query.sortBy === 'title') {
        pipeline.push({ $sort: { title: query.sortOrder === 'asc' ? 1 : -1 } });
      } else {
        pipeline.push({ $sort: { relevanceScore: -1, lastUpdated: -1 } });
      }

      // Add pagination
      if (query.offset) {
        pipeline.push({ $skip: query.offset });
      }
      if (query.limit) {
        pipeline.push({ $limit: query.limit });
      }

      // Transform to search results
      pipeline.push({
        $project: {
          entityType: 1,
          entityId: 1,
          title: 1,
          description: { $substr: ['$content', 0, 200] },
          snippet: { $substr: ['$content', 0, 150] },
          score: '$relevanceScore',
          tags: 1,
          metadata: {
            category: '$category',
            organizationId: '$organizationId',
            isPublic: '$isPublic',
            lastIndexed: '$lastUpdated'
          },
          organizationId: 1,
          isPublic: 1,
          lastIndexed: '$lastUpdated',
          createdAt: 1,
          updatedAt: 1
        }
      });

      const results = await this.crudOps.aggregate<ISearchResult>(pipeline);

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(
          cacheKey, 
          results, 
          SearchRepository.SEARCH_RESULTS_TTL
        );
      }

      // Track search for analytics
      await this.publishEvent('search.performed', {
        query: query.query,
        entityTypes: query.entityTypes,
        resultCount: results.length,
        timestamp: new Date()
      });

      return results;
    } catch (error) {
      this.logger.error('Error performing search', error as Error, { query });
      throw error;
    }
  }

  /**
   * Simple text search
   */
  public async searchByText(
    text: string, 
    entityTypes?: string[], 
    limit: number = 20
  ): Promise<ISearchResult[]> {
    return this.search({
      query: text,
      entityTypes,
      limit,
      sortBy: 'relevance',
      sortOrder: 'desc'
    });
  }

  /**
   * Search by tags
   */
  public async searchByTags(tags: string[], entityTypes?: string[]): Promise<ISearchResult[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('tags', {
      tags: tags.toSorted((a, b) => a.localeCompare(b)),
      entityTypes: entityTypes?.toSorted()
    });
    
    const cached = await this.cacheHelpers.getCustom<ISearchResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      this.logger.debug('Searching by tags', { tags, entityTypes });

      const matchQuery: any = {
        tags: { $in: tags }
      };

      if (entityTypes && entityTypes.length > 0) {
        matchQuery.entityType = { $in: entityTypes };
      }

      const pipeline: AggregationPipeline = [
        { $match: matchQuery },
        {
          $addFields: {
            tagMatchScore: {
              $size: { $setIntersection: ['$tags', tags] }
            }
          }
        },
        { $sort: { tagMatchScore: -1, lastUpdated: -1 } },
        {
          $project: {
            entityType: 1,
            entityId: 1,
            title: 1,
            description: { $substr: ['$content', 0, 200] },
            snippet: { $substr: ['$content', 0, 150] },
            score: '$tagMatchScore',
            tags: 1,
            metadata: {
              category: '$category',
              organizationId: '$organizationId',
              isPublic: '$isPublic',
              lastIndexed: '$lastUpdated'
            },
            organizationId: 1,
            isPublic: 1,
            lastIndexed: '$lastUpdated',
            createdAt: 1,
            updatedAt: 1
          }
        }
      ];

      const results = await this.crudOps.aggregate<ISearchResult>(pipeline);

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, results, SearchRepository.CACHE_TTL);
      }

      return results;
    } catch (error) {
      this.logger.error('Error searching by tags', error as Error, { tags, entityTypes });
      throw error;
    }
  }

  /**
   * Search by category
   */
  public async searchByCategory(category: string, entityTypes?: string[]): Promise<ISearchResult[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('category', {
      category,
      entityTypes: entityTypes?.toSorted()
    });
    
    const cached = await this.cacheHelpers.getCustom<ISearchResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      this.logger.debug('Searching by category', { category, entityTypes });

      const matchQuery: any = { category };

      if (entityTypes && entityTypes.length > 0) {
        matchQuery.entityType = { $in: entityTypes };
      }

      const results = await this.crudOps.find(matchQuery, {
        sort: [{ field: 'lastUpdated', direction: 'desc' }]
      });

      const searchResults: ISearchResult[] = results.map(item => ({
        _id: item._id,
        entityType: item.entityType,
        entityId: item.entityId,
        title: item.title,
        description: item.content.substring(0, 200),
        snippet: item.content.substring(0, 150),
        score: item.searchScore,
        tags: item.tags,
        metadata: {
          category: item.category,
          organizationId: item.organizationId,
          isPublic: item.isPublic,
          lastIndexed: item.lastUpdated
        },
        organizationId: item.organizationId,
        isPublic: item.isPublic,
        lastIndexed: item.lastUpdated,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }));

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, searchResults, SearchRepository.CACHE_TTL);
      }

      return searchResults;
    } catch (error) {
      this.logger.error('Error searching by category', error as Error, { category, entityTypes });
      throw error;
    }
  }

  /**
   * Index an entity for search
   */
  public async indexEntity(
    entityType: string,
    entityId: Types.ObjectId,
    indexData: Partial<ISearchIndex>
  ): Promise<ISearchIndex> {
    try {
      this.logger.debug('Indexing entity', { entityType, entityId: entityId.toString() });

      // Check if entity is already indexed
      const existing = await this.crudOps.findOne({
        entityType,
        entityId
      });

      if (existing) {
        // Update existing index
        const updated = await this.updateIndex(entityType, entityId, indexData);
        return updated!;
      }

      // Create new index entry
      const indexEntry: Partial<ISearchIndex> = {
        ...indexData,
        entityType,
        entityId,
        searchScore: this.calculateSearchScore(indexData),
        lastUpdated: new Date()
      };

      const result = await super.create(indexEntry);

      // Invalidate search caches
      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateByPattern('search:*');
        await this.cacheHelpers.invalidateByPattern('suggestions:*');
      }

      await this.publishEvent('search.entity_indexed', {
        entityType,
        entityId: entityId.toString(),
        title: indexData.title,
        timestamp: new Date()
      });

      return result;
    } catch (error) {
      this.logger.error('Error indexing entity', error as Error, { 
        entityType, 
        entityId: entityId.toString() 
      });
      throw error;
    }
  }

  /**
   * Update search index for entity
   */
  public async updateIndex(
    entityType: string,
    entityId: Types.ObjectId,
    indexData: Partial<ISearchIndex>
  ): Promise<ISearchIndex | null> {
    try {
      this.logger.debug('Updating search index', { entityType, entityId: entityId.toString() });

      const updateData = {
        ...indexData,
        searchScore: this.calculateSearchScore(indexData),
        lastUpdated: new Date()
      };

      const result = await this.crudOps.findOneAndUpdate(
        { entityType, entityId },
        updateData,
        { returnNew: true }
      );

      if (result && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateByPattern('search:*');
        await this.cacheHelpers.invalidateByPattern('suggestions:*');
      }

      if (result) {
        await this.publishEvent('search.index_updated', {
          entityType,
          entityId: entityId.toString(),
          timestamp: new Date()
        });
      }

      return result ? this.mapToEntity(result) : null;
    } catch (error) {
      this.logger.error('Error updating search index', error as Error, { 
        entityType, 
        entityId: entityId.toString() 
      });
      throw error;
    }
  }

  /**
   * Remove entity from search index
   */
  public async removeFromIndex(entityType: string, entityId: Types.ObjectId): Promise<boolean> {
    try {
      this.logger.debug('Removing from search index', { entityType, entityId: entityId.toString() });

      const result = await this.crudOps.findOneAndDelete({
        entityType,
        entityId
      });

      if (result && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateByPattern('search:*');
        await this.cacheHelpers.invalidateByPattern('suggestions:*');
      }

      if (result) {
        await this.publishEvent('search.entity_removed', {
          entityType,
          entityId: entityId.toString(),
          timestamp: new Date()
        });
      }

      return !!result;
    } catch (error) {
      this.logger.error('Error removing from search index', error as Error, { 
        entityType, 
        entityId: entityId.toString() 
      });
      throw error;
    }
  }

  /**
   * Reindex entity (placeholder - would integrate with specific entity repositories)
   */
  public async reindexEntity(
    entityType: string, 
    entityId: Types.ObjectId
  ): Promise<ISearchIndex | null> {
    try {
      this.logger.debug('Reindexing entity', { entityType, entityId: entityId.toString() });

      // This would typically fetch the latest data from the entity's repository
      // and rebuild the search index. For now, we'll just update the timestamp.
      
      const result = await this.crudOps.findOneAndUpdate(
        { entityType, entityId },
        { lastUpdated: new Date() },
        { returnNew: true }
      );

      if (result) {
        await this.publishEvent('search.entity_reindexed', {
          entityType,
          entityId: entityId.toString(),
          timestamp: new Date()
        });
      }

      return result ? this.mapToEntity(result) : null;
    } catch (error) {
      this.logger.error('Error reindexing entity', error as Error, { 
        entityType, 
        entityId: entityId.toString() 
      });
      throw error;
    }
  }

  /**
   * Get popular searches
   */
  public async getPopularSearches(limit: number = 10): Promise<string[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('popular', { limit });
    
    const cached = await this.cacheHelpers.getCustom<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      this.logger.debug('Getting popular searches', { limit });

      // This would typically come from search analytics/logs
      // For now, we'll return most common keywords from indexed content
      const pipeline: AggregationPipeline = [
        { $unwind: '$keywords' },
        { 
          $group: { 
            _id: '$keywords', 
            count: { $sum: 1 } 
          } 
        },
        { $sort: { count: -1 } },
        { $limit: limit },
        { 
          $project: { 
            _id: 0, 
            keyword: '$_id' 
          } 
        }
      ];

      const results = await this.crudOps.aggregate<{ keyword: string }>(pipeline);
      const keywords = results.map(r => r.keyword);

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(
          cacheKey, 
          keywords, 
          SearchRepository.POPULAR_SEARCHES_TTL
        );
      }

      return keywords;
    } catch (error) {
      this.logger.error('Error getting popular searches', error as Error, { limit });
      throw error;
    }
  }

  /**
   * Get search suggestions
   */
  public async getSuggestions(query: string, limit: number = 5): Promise<string[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('suggestions', { query, limit });
    
    const cached = await this.cacheHelpers.getCustom<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      this.logger.debug('Getting search suggestions', { query, limit });

      // Find titles and keywords that start with the query
      const pipeline: AggregationPipeline = [
        {
          $match: {
            $or: [
              { title: { $regex: `^${query}`, $options: 'i' } },
              { keywords: { $regex: `^${query}`, $options: 'i' } }
            ]
          }
        },
        {
          $project: {
            suggestions: {
              $concatArrays: [
                [{ $toLower: '$title' }],
                {
                  $map: {
                    input: {
                      $filter: {
                        input: '$keywords',
                        cond: { $regexMatch: { input: '$$this', regex: `^${query}`, options: 'i' } }
                      }
                    },
                    as: 'keyword',
                    in: { $toLower: '$$keyword' }
                  }
                }
              ]
            }
          }
        },
        { $unwind: '$suggestions' },
        { $group: { _id: '$suggestions' } },
        { $limit: limit },
        { $project: { _id: 0, suggestion: '$_id' } }
      ];

      const results = await this.crudOps.aggregate<{ suggestion: string }>(pipeline);
      const suggestions = results.map(r => r.suggestion);

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(
          cacheKey, 
          suggestions, 
          SearchRepository.SUGGESTIONS_TTL
        );
      }

      return suggestions;
    } catch (error) {
      this.logger.error('Error getting search suggestions', error as Error, { query, limit });
      throw error;
    }
  }

  /**
   * Find similar content
   */
  public async findSimilarContent(
    entityType: string,
    entityId: Types.ObjectId,
    limit: number = 5
  ): Promise<ISearchResult[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('similar', {
      entityType,
      entityId: entityId.toString(),
      limit
    });
    
    const cached = await this.cacheHelpers.getCustom<ISearchResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      this.logger.debug('Finding similar content', { 
        entityType, 
        entityId: entityId.toString(), 
        limit 
      });

      // Get the target entity
      const targetEntity = await this.crudOps.findOne({
        entityType,
        entityId
      });

      if (!targetEntity) {
        return [];
      }

      // Find similar entities based on tags and keywords
      const pipeline: AggregationPipeline = [
        {
          $match: {
            entityType,
            entityId: { $ne: entityId },
            $or: [
              { tags: { $in: targetEntity.tags } },
              { keywords: { $in: targetEntity.keywords } },
              { category: targetEntity.category }
            ]
          }
        },
        {
          $addFields: {
            similarityScore: {
              $add: [
                { $size: { $setIntersection: ['$tags', targetEntity.tags] } },
                { $size: { $setIntersection: ['$keywords', targetEntity.keywords] } },
                { $cond: { if: { $eq: ['$category', targetEntity.category] }, then: 2, else: 0 } }
              ]
            }
          }
        },
        { $match: { similarityScore: { $gt: 0 } } },
        { $sort: { similarityScore: -1, lastUpdated: -1 } },
        { $limit: limit },
        {
          $project: {
            entityType: 1,
            entityId: 1,
            title: 1,
            description: { $substr: ['$content', 0, 200] },
            snippet: { $substr: ['$content', 0, 150] },
            score: '$similarityScore',
            tags: 1,
            metadata: {
              category: '$category',
              organizationId: '$organizationId',
              isPublic: '$isPublic',
              lastIndexed: '$lastUpdated'
            },
            organizationId: 1,
            isPublic: 1,
            lastIndexed: '$lastUpdated',
            createdAt: 1,
            updatedAt: 1
          }
        }
      ];

      const results = await this.crudOps.aggregate<ISearchResult>(pipeline);

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(
          cacheKey, 
          results, 
          SearchRepository.SIMILAR_CONTENT_TTL
        );
      }

      return results;
    } catch (error) {
      this.logger.error('Error finding similar content', error as Error, { 
        entityType, 
        entityId: entityId.toString(), 
        limit 
      });
      throw error;
    }
  }

  /**
   * Get search statistics
   */
  public async getSearchStats(): Promise<{ totalIndexed: number; byEntityType: Record<string, number> }> {
    const cacheKey = this.cacheHelpers.generateCustomKey('stats', {});
    
    const cached = await this.cacheHelpers.getCustom<{ totalIndexed: number; byEntityType: Record<string, number> }>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      this.logger.debug('Getting search statistics');

      const [totalResult, byTypeResult] = await Promise.all([
        this.crudOps.count({}),
        this.crudOps.aggregate<{ _id: string; count: number }>([
          { $group: { _id: '$entityType', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ])
      ]);

      const stats = {
        totalIndexed: totalResult,
        byEntityType: byTypeResult.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>)
      };

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, stats, SearchRepository.CACHE_TTL);
      }

      return stats;
    } catch (error) {
      this.logger.error('Error getting search statistics', error as Error);
      throw error;
    }
  }

  /**
   * Bulk index multiple entities
   */
  public async bulkIndex(indexData: Partial<ISearchIndex>[]): Promise<ISearchIndex[]> {
    try {
      this.logger.debug('Bulk indexing entities', { count: indexData.length });

      const processedData = indexData.map(data => ({
        ...data,
        searchScore: this.calculateSearchScore(data),
        lastUpdated: new Date()
      }));

      const results = await this.createMany(processedData);

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateByPattern('search:*');
        await this.cacheHelpers.invalidateByPattern('suggestions:*');
      }

      await this.publishEvent('search.bulk_indexed', {
        count: results.length,
        timestamp: new Date()
      });

      return results;
    } catch (error) {
      this.logger.error('Error bulk indexing', error as Error);
      throw error;
    }
  }

  /**
   * Rebuild search index
   */
  public async rebuildIndex(entityType?: string): Promise<number> {
    try {
      this.logger.debug('Rebuilding search index', { entityType });

      const query = entityType ? { entityType } : {};
      
      // This is a placeholder - in a real implementation, you would:
      // 1. Fetch all entities of the specified type(s) from their respective repositories
      // 2. Process and re-index them
      // 3. Remove stale entries
      
      const result = await this.crudOps.updateMany(query, {
        lastUpdated: new Date()
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateByPattern('*');
      }

      await this.publishEvent('search.index_rebuilt', {
        entityType,
        updatedCount: result.modifiedCount,
        timestamp: new Date()
      });

      return result.modifiedCount;
    } catch (error) {
      this.logger.error('Error rebuilding search index', error as Error, { entityType });
      throw error;
    }
  }

  /**
   * Clean up stale search indexes
   */
  public async cleanupStaleIndexes(): Promise<number> {
    try {
      this.logger.debug('Cleaning up stale search indexes');

      // Remove indexes older than 30 days without updates
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.crudOps.deleteMany({
        lastUpdated: { $lt: thirtyDaysAgo }
      });

      if (result.deletedCount > 0 && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateByPattern('*');
      }

      await this.publishEvent('search.stale_cleanup', {
        deletedCount: result.deletedCount,
        timestamp: new Date()
      });

      return result.deletedCount;
    } catch (error) {
      this.logger.error('Error cleaning up stale indexes', error as Error);
      throw error;
    }
  }

  /**
   * Build search match query
   */
  private buildSearchMatchQuery(query: ISearchQuery): any {
    const matchQuery: any = {};

    // Text search
    if (query.query) {
      matchQuery.$text = { $search: query.query };
    }

    // Entity types filter
    if (query.entityTypes && query.entityTypes.length > 0) {
      matchQuery.entityType = { $in: query.entityTypes };
    }

    // Tags filter
    if (query.tags && query.tags.length > 0) {
      matchQuery.tags = { $in: query.tags };
    }

    // Category filter
    if (query.category) {
      matchQuery.category = query.category;
    }

    // Organization filter
    if (query.organizationId) {
      matchQuery.organizationId = query.organizationId;
    }

    // Public filter
    if (query.isPublic !== undefined) {
      matchQuery.isPublic = query.isPublic;
    }

    // Additional filters
    if (query.filters) {
      Object.assign(matchQuery, query.filters);
    }

    return matchQuery;
  }

  /**
   * Calculate search score based on various factors
   */
  private calculateSearchScore(indexData: Partial<ISearchIndex>): number {
    let score = 1; // Base score

    // Boost for title length (shorter titles often more focused)
    if (indexData.title) {
      score += Math.max(0, 50 - indexData.title.length) / 10;
    }

    // Boost for content length (more content often more comprehensive)
    if (indexData.content) {
      score += Math.min(10, indexData.content.length / 100);
    }

    // Boost for number of keywords
    if (indexData.keywords) {
      score += indexData.keywords.length * 0.5;
    }

    // Boost for number of tags
    if (indexData.tags) {
      score += indexData.tags.length * 0.3;
    }

    // Boost for public content
    if (indexData.isPublic) {
      score += 2;
    }

    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Validate search index data
   */
  protected validateData(data: Partial<ISearchIndex>): ValidationResult {
    const errors: string[] = [];

    // Entity type validation
    if (data.entityType !== undefined && !data.entityType) {
      errors.push('Entity type is required');
    }

    // Entity ID validation
    if (data.entityId !== undefined && !data.entityId) {
      errors.push('Entity ID is required');
    }

    // Title validation
    if (data.title !== undefined) {
      const titleValidation = ValidationHelpers.validateFieldLength(
        data.title, 
        'title', 
        1, 
        200
      );
      if (!titleValidation.valid) {
        errors.push(...titleValidation.errors);
      }
    }

    // Content validation
    if (data.content !== undefined && data.content.length > 10000) {
      errors.push('Content must be less than 10,000 characters');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Map database document to domain entity
   */
  protected mapToEntity(data: any): ISearchIndex {
    return {
      _id: data._id,
      entityType: data.entityType,
      entityId: data.entityId,
      title: data.title,
      content: data.content,
      keywords: data.keywords ?? [],
      tags: data.tags ?? [],
      category: data.category,
      organizationId: data.organizationId,
      isPublic: data.isPublic ?? false,
      searchScore: data.searchScore ?? 1,
      lastUpdated: data.lastUpdated,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    } as ISearchIndex;
  }

  /**
   * Map domain entity to database document
   */
  protected mapFromEntity(entity: ISearchIndex): any {
    const doc = { ...entity };
    
    // Remove any computed fields
    delete (doc as any).__v;
    
    return doc;
  }
}