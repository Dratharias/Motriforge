import { Database } from '~/database/connection';
import { PgTable } from 'drizzle-orm/pg-core';
import { eq, and, desc, asc, sql } from 'drizzle-orm';

export interface RepositoryOptions {
  includeInactive?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: keyof any; // changed later
  orderDirection?: 'asc' | 'desc';
}

export interface BaseEntity {
  id: string;
  createdAt: Date;
  isActive: boolean;
}

export abstract class BaseRepository<
  T extends BaseEntity,
  TTable extends PgTable<any>
> {
  protected constructor(
    protected db: Database,
    protected table: TTable,
    protected defaultOrderBy: keyof TTable['_']['columns'] = 'createdAt'
  ) {}

  async findById(id: string, options: RepositoryOptions = {}): Promise<T | null> {
    const { includeInactive = false } = options;
    const conditions = [eq(this.table._.columns.id, id)];

    if (!includeInactive) {
      const isActiveColumn = this.table._.columns.isActive;
      if (!isActiveColumn) {
        throw new Error('isActive column does not exist on this table.');
      }
      conditions.push(eq(isActiveColumn, true));
    }

    const result = await this.db
      .select()
      .from(this.table as any)
      .where(and(...conditions))
      .limit(1);

    return result[0] as T || null;
  }

async findMany(options: RepositoryOptions = {}): Promise<T[]> {
  const {
    includeInactive = false,
    limit = 50,
    offset = 0,
    orderBy = this.defaultOrderBy,
    orderDirection = 'desc'
  } = options;

  const conditions = [];
  if (!includeInactive) {
    conditions.push(eq(this.table._.columns.isActive, true));
  }

  const column = this.table._.columns[orderBy];
  if (!column) {
    throw new Error(`Invalid orderBy column: ${String(orderBy)}`);
  }

  const orderFn = orderDirection === 'asc' ? asc : desc;

  const result = await this.db
    .select()
    .from(this.table as any)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(orderFn(column))
    .limit(limit)
    .offset(offset);

  return result as T[];
}


  async count(options: RepositoryOptions = {}): Promise<number> {
    const conditions = [];
    if (!options.includeInactive) {
      conditions.push(eq(this.table._.columns.isActive, true));
    }

    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(this.table as any)
      .where(conditions.length ? and(...conditions) : undefined);

    return result[0]?.count ?? 0;
  }

  async create(data: import('drizzle-orm').InferInsertModel<TTable>): Promise<T> {
    const result = await this.db
      .insert(this.table)
      .values(data)
      .returning();

    return result[0] as T;
  }

  async update(id: string, data: Partial<import('drizzle-orm').InferInsertModel<TTable>>): Promise<T | null> {
    const result = await this.db
      .update(this.table)
      .set(data)
      .where(eq(this.table._.columns.id, id))
      .returning();

    return result[0] as T || null;
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.db
      .update(this.table)
      .set({ isActive: false })
      .where(eq(this.table._.columns.id, id))
      .returning();

    return result.length > 0;
  }

  async hardDelete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(this.table)
      .where(eq(this.table._.columns.id, id))
      .returning();

    return result.length > 0;
  }
}
