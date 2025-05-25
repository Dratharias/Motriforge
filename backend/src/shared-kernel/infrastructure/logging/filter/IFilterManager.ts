import { ILogFilter } from '../interfaces/ILogger';

export interface IFilterManager {
  addFilter(filter: ILogFilter): void;
  removeFilter(name: string): void;
  getFilter(name: string): ILogFilter | undefined;
  getAllFilters(): readonly ILogFilter[];
  clear(): void;
}

