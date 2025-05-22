import { 
  Filter, 
  FindOptions, 
  Document,
  SortDirection,
  WithId
} from 'mongodb';
import { Collection } from './Collection';

/**
 * Builder for constructing MongoDB queries with a fluent API
 */
export class QueryBuilder<T extends Document> {
  private readonly collection: Collection<T>;
  private filters: Filter<T> = {};
  private options: FindOptions = {};
  private sortOptions: Record<string, SortDirection> = {};
  private skipValue: number = 0;
  private limitValue: number = 0;
  private projectFields: Document | null = null;

  constructor(collection: Collection<T>) {
    this.collection = collection;
  }

  /**
   * Add filter criteria to the query
   * @param filter Filter to apply
   */
  public where(filter: Filter<T>): this {
    this.filters = { ...this.filters, ...filter };
    return this;
  }

  /**
   * Specify fields to include/exclude in the results
   * @param fields Array of field names to include or object with 0/1 values
   */
  public select(fields: string[] | Record<string, 0 | 1>): this {
    if (Array.isArray(fields)) {
      const projection: Record<string, 1> = {};
      fields.forEach(field => {
        projection[field] = 1;
      });
      this.projectFields = projection as Document;
    } else {
      this.projectFields = fields as unknown as Document;
    }
    return this;
  }

  /**
   * Sort results by specified fields
   * @param field Field name or sort document
   * @param direction Sort direction (1 for ascending, -1 for descending)
   */
  public sort(field: string | Record<string, SortDirection>, direction: SortDirection = 1): this {
    if (typeof field === 'string') {
      this.sortOptions = { ...this.sortOptions, [field]: direction };
    } else {
      this.sortOptions = { ...this.sortOptions, ...field };
    }
    return this;
  }

  /**
   * Skip a number of documents in the results
   * @param count Number of documents to skip
   */
  public skip(count: number): this {
    this.skipValue = count;
    return this;
  }

  /**
   * Limit the number of documents in the results
   * @param count Maximum number of documents to return
   */
  public limit(count: number): this {
    this.limitValue = count;
    return this;
  }

  /**
   * Implement pagination
   * @param pageNumber Page number (1-based)
   * @param pageSize Number of documents per page
   */
  public page(pageNumber: number, pageSize: number): this {
    if (pageNumber < 1) {
      pageNumber = 1;
    }
    if (pageSize < 1) {
      pageSize = 10;
    }
    this.skipValue = (pageNumber - 1) * pageSize;
    this.limitValue = pageSize;
    return this;
  }

  /**
   * Execute query and return a single document
   */
  public async findOne(): Promise<WithId<T> | null> {
    this.buildOptions();
    return this.collection.findOne(this.filters, this.options);
  }

  /**
   * Execute query and return all matching documents
   */
  public async find(): Promise<WithId<T>[]> {
    this.buildOptions();
    return this.collection.find(this.filters, this.options);
  }

  /**
   * Count documents matching the query
   */
  public async count(): Promise<number> {
    return this.collection.countDocuments(this.filters);
  }

  /**
   * Paginate query results
   * @param pageNumber Page number (1-based)
   * @param pageSize Number of documents per page
   */
  public async paginate(pageNumber: number = 1, pageSize: number = 10): Promise<{ 
    data: WithId<T>[]; 
    total: number; 
    page: number; 
    pageSize: number; 
    pages: number 
  }> {
    if (pageNumber < 1) {
      pageNumber = 1;
    }
    if (pageSize < 1) {
      pageSize = 10;
    }
    
    this.page(pageNumber, pageSize);
    
    const [data, total] = await Promise.all([
      this.find(),
      this.count()
    ]);
    
    const pages = Math.ceil(total / pageSize);
    
    return {
      data,
      total,
      page: pageNumber,
      pageSize,
      pages
    };
  }

  /**
   * Build options object from current state
   */
  private buildOptions(): void {
    this.options = {};
    
    if (Object.keys(this.sortOptions).length > 0) {
      this.options.sort = this.sortOptions;
    }
    
    if (this.skipValue > 0) {
      this.options.skip = this.skipValue;
    }
    
    if (this.limitValue > 0) {
      this.options.limit = this.limitValue;
    }
    
    if (this.projectFields) {
      this.options.projection = this.projectFields;
    }
  }

  /**
   * Get current filters
   */
  public getFilters(): Filter<T> {
    return this.filters;
  }

  /**
   * Get current options
   */
  public getOptions(): FindOptions {
    this.buildOptions();
    return this.options;
  }
}