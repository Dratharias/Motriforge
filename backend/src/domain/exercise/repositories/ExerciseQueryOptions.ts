import { IExerciseQueryOptions } from '../interfaces/ExerciseInterfaces';

export enum ExerciseSortField {
  NAME = 'name',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  DIFFICULTY = 'difficulty',
  DURATION = 'estimatedDuration',
  POPULARITY = 'popularity',
  COMPLEXITY = 'complexity',
  TYPE = 'type'
}

export class ExerciseQueryOptions implements IExerciseQueryOptions {
  public readonly limit?: number;
  public readonly offset?: number;
  public readonly sortBy?: string;
  public readonly sortOrder?: 'asc' | 'desc';
  public readonly includeInactive?: boolean;
  public readonly includeDrafts?: boolean;

  constructor(options: Partial<IExerciseQueryOptions> = {}) {
    this.limit = options.limit ?? 50;
    this.offset = options.offset ?? 0;
    this.sortBy = options.sortBy ?? ExerciseSortField.NAME;
    this.sortOrder = options.sortOrder ?? 'asc';
    this.includeInactive = options.includeInactive ?? false;
    this.includeDrafts = options.includeDrafts ?? false;
  }

  static withAllIncludes(options: Partial<IExerciseQueryOptions> = {}): ExerciseQueryOptions {
    return new ExerciseQueryOptions({
      ...options,
      includeInactive: true,
      includeDrafts: true
    });
  }

  static forListing(limit = 20, offset = 0): ExerciseQueryOptions {
    return new ExerciseQueryOptions({
      limit,
      offset,
      sortBy: ExerciseSortField.NAME,
      sortOrder: 'asc'
    });
  }

  static forDetailedView(): ExerciseQueryOptions {
    return new ExerciseQueryOptions({
      limit: 1
    });
  }

  static forSearch(limit = 25, offset = 0): ExerciseQueryOptions {
    return new ExerciseQueryOptions({
      limit,
      offset,
      sortBy: ExerciseSortField.POPULARITY,
      sortOrder: 'desc'
    });
  }

  static forDrafts(creatorId?: string, limit = 20): ExerciseQueryOptions {
    return new ExerciseQueryOptions({
      limit,
      includeDrafts: true,
      includeInactive: false,
      sortBy: ExerciseSortField.UPDATED_AT,
      sortOrder: 'desc'
    });
  }

  static forPublished(limit = 50): ExerciseQueryOptions {
    return new ExerciseQueryOptions({
      limit,
      includeDrafts: false,
      includeInactive: false,
      sortBy: ExerciseSortField.NAME,
      sortOrder: 'asc'
    });
  }

  static byDifficulty(sortOrder: 'asc' | 'desc' = 'asc'): ExerciseQueryOptions {
    return new ExerciseQueryOptions({
      sortBy: ExerciseSortField.DIFFICULTY,
      sortOrder
    });
  }

  static byDuration(sortOrder: 'asc' | 'desc' = 'asc'): ExerciseQueryOptions {
    return new ExerciseQueryOptions({
      sortBy: ExerciseSortField.DURATION,
      sortOrder
    });
  }

  static recent(limit = 10): ExerciseQueryOptions {
    return new ExerciseQueryOptions({
      limit,
      sortBy: ExerciseSortField.CREATED_AT,
      sortOrder: 'desc'
    });
  }

  static popular(limit = 10): ExerciseQueryOptions {
    return new ExerciseQueryOptions({
      limit,
      sortBy: ExerciseSortField.POPULARITY,
      sortOrder: 'desc'
    });
  }
}