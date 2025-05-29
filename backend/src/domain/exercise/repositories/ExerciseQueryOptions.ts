import { 
  ExerciseSortField,
  IExerciseQueryOptions 
} from '../interfaces/ExerciseInterfaces';

/**
 * Default query options for exercise operations
 */
export class ExerciseQueryOptions implements IExerciseQueryOptions {
  public readonly limit?: number;
  public readonly offset?: number;
  public readonly sortBy?: ExerciseSortField;
  public readonly sortOrder?: 'asc' | 'desc';
  public readonly includeInstructions?: boolean;
  public readonly includeProgressions?: boolean;
  public readonly includeContraindications?: boolean;
  public readonly includeMedia?: boolean;
  public readonly includeVariations?: boolean;
  public readonly includePrerequisites?: boolean;

  constructor(options: Partial<IExerciseQueryOptions> = {}) {
    this.limit = options.limit ?? 50;
    this.offset = options.offset ?? 0;
    this.sortBy = options.sortBy ?? ExerciseSortField.NAME;
    this.sortOrder = options.sortOrder ?? 'asc';
    this.includeInstructions = options.includeInstructions ?? false;
    this.includeProgressions = options.includeProgressions ?? false;
    this.includeContraindications = options.includeContraindications ?? false;
    this.includeMedia = options.includeMedia ?? false;
    this.includeVariations = options.includeVariations ?? false;
    this.includePrerequisites = options.includePrerequisites ?? false;
  }

  /**
   * Create query options with all includes enabled
   */
  static withAllIncludes(options: Partial<IExerciseQueryOptions> = {}): ExerciseQueryOptions {
    return new ExerciseQueryOptions({
      ...options,
      includeInstructions: true,
      includeProgressions: true,
      includeContraindications: true,
      includeMedia: true,
      includeVariations: true,
      includePrerequisites: true
    });
  }

  /**
   * Create query options for basic listing
   */
  static forListing(limit = 20, offset = 0): ExerciseQueryOptions {
    return new ExerciseQueryOptions({
      limit,
      offset,
      sortBy: ExerciseSortField.NAME,
      sortOrder: 'asc'
    });
  }

  /**
   * Create query options for detailed view
   */
  static forDetailedView(): ExerciseQueryOptions {
    return ExerciseQueryOptions.withAllIncludes({
      limit: 1
    });
  }

  /**
   * Create query options for search results
   */
  static forSearch(limit = 25, offset = 0): ExerciseQueryOptions {
    return new ExerciseQueryOptions({
      limit,
      offset,
      sortBy: ExerciseSortField.POPULARITY,
      sortOrder: 'desc',
      includeMedia: true
    });
  }
}