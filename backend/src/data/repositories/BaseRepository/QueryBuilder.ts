import { Query, PopulateOptions } from 'mongoose';
import { FilterQuery, QueryOptions, Condition, PopulateOptions as CustomPopulateOptions } from '@/types/repositories';

/**
 * Query builder helper for MongoDB operations
 */
export class QueryBuilder {
  /**
   * Build MongoDB query from FilterQuery
   */
  public static buildMongoQuery(query: FilterQuery): Record<string, any> {
    if (!query.conditions && !query.operator) {
      return query;
    }
    
    const mongoQuery: Record<string, any> = {};
    
    if (query.conditions) {
      if (query.operator === 'or') {
        mongoQuery.$or = query.conditions.map(condition => ({
          [condition.field]: this.buildConditionValue(condition)
        }));
      } else {
        // Default to 'and'
        query.conditions.forEach(condition => {
          mongoQuery[condition.field] = this.buildConditionValue(condition);
        });
      }
    }
    
    return mongoQuery;
  }

  /**
   * Build condition value for MongoDB query
   */
  private static buildConditionValue(condition: Condition): any {
    switch (condition.operator) {
      case 'eq':
        return condition.value;
      case 'ne':
        return { $ne: condition.value };
      case 'gt':
        return { $gt: condition.value };
      case 'gte':
        return { $gte: condition.value };
      case 'lt':
        return { $lt: condition.value };
      case 'lte':
        return { $lte: condition.value };
      case 'in':
        return { $in: condition.value };
      case 'nin':
        return { $nin: condition.value };
      case 'exists':
        return { $exists: condition.value };
      case 'regex':
        return { $regex: condition.value, $options: 'i' };
      case 'size':
        return { $size: condition.value };
      case 'all':
        return { $all: condition.value };
      case 'elemMatch':
        return { $elemMatch: condition.value };
      default:
        return condition.value;
    }
  }

  /**
   * Apply query options to MongoDB query
   */
  public static applyQueryOptions<T>(query: Query<T, any>, options: QueryOptions): Query<T, any> {
    // Apply sorting
    if (options.sort && options.sort.length > 0) {
      const sortObj: Record<string, 1 | -1> = {};
      options.sort.forEach(sort => {
        sortObj[sort.field] = sort.direction === 'asc' ? 1 : -1;
      });
      query = query.sort(sortObj);
    }
    
    // Apply field projection
    if (options.projection && options.projection.length > 0) {
      query = query.select(options.projection.join(' '));
    }
    
    // Apply population
    if (options.populate) {
      query = this.applyPopulation(query, options.populate);
    }
    
    // Apply pagination
    if (options.pagination) {
      if (options.pagination.limit) {
        query = query.limit(options.pagination.limit);
      }
      if (options.pagination.offset) {
        query = query.skip(options.pagination.offset);
      }
    }
    
    return query;
  }

  /**
   * Apply population options to query
   */
  private static applyPopulation<T>(
    query: Query<T, any>, 
    populate: string[] | CustomPopulateOptions[]
  ): Query<T, any> {
    if (Array.isArray(populate)) {
      populate.forEach(populateOption => {
        if (typeof populateOption === 'string') {
          // Simple string population
          query = query.populate(populateOption);
        } else {
          // Complex population with options
          const mongoosePopulateOptions: PopulateOptions = {
            path: populateOption.path,
            select: populateOption.select,
            match: populateOption.match,
            options: populateOption.options
          };
          
          // Handle nested population
          if (populateOption.populate) {
            mongoosePopulateOptions.populate = populateOption.populate.map(nestedPop => ({
              path: nestedPop.path,
              select: nestedPop.select,
              match: nestedPop.match,
              options: nestedPop.options
            }));
          }
          
          query = query.populate(mongoosePopulateOptions);
        }
      });
    }
    
    return query;
  }

  /**
   * Build aggregation pipeline with proper typing
   */
  public static buildAggregationPipeline(stages: Record<string, any>[]): any[] {
    return stages.map(stage => {
      // Ensure each stage is properly formatted for MongoDB aggregation
      const stageKeys = Object.keys(stage);
      if (stageKeys.length !== 1) {
        throw new Error('Each aggregation stage must have exactly one operator');
      }
      
      const operator = stageKeys[0];
      const operatorValue = stage[operator];
      
      // Validate common aggregation operators
      const validOperators = [
        '$match', '$group', '$sort', '$limit', '$skip', '$project', 
        '$unwind', '$lookup', '$addFields', '$count', '$facet',
        '$bucket', '$bucketAuto', '$sortByCount', '$replaceRoot',
        '$sample', '$unionWith', '$densify', '$fill'
      ];
      
      if (!validOperators.includes(operator)) {
        console.warn(`Unknown aggregation operator: ${operator}`);
      }
      
      return { [operator]: operatorValue };
    });
  }
}