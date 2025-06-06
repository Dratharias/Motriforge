export interface PaginationQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
}

export interface FilterQuery {
  readonly search?: string;
  readonly category?: string;
  readonly tags?: string[];
  readonly difficulty?: string;
  readonly equipment?: string[];
}

export interface TimestampedEntity {
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AuditableEntity extends TimestampedEntity {
  readonly createdBy: string;
  readonly version?: number;
}