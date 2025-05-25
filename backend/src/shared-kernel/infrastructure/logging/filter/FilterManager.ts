import { ILogFilter } from '../interfaces/ILogger';
import { IFilterManager } from './IFilterManager';

/**
 * Filter Manager - Single responsibility: managing log filters
 */
export class FilterManager implements IFilterManager {
  private readonly filters: Map<string, ILogFilter> = new Map();

  addFilter(filter: ILogFilter): void {
    this.filters.set(filter.name, filter);
  }

  removeFilter(name: string): void {
    this.filters.delete(name);
  }

  getFilter(name: string): ILogFilter | undefined {
    return this.filters.get(name);
  }

  getAllFilters(): readonly ILogFilter[] {
    return Array.from(this.filters.values());
  }

  clear(): void {
    this.filters.clear();
  }
}

