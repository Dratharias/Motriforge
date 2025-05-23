import { Types } from "mongoose";

/**
 * Search result interface
 */
export interface ISearchResult {
  readonly _id: Types.ObjectId;
  readonly entityType: string;
  readonly entityId: Types.ObjectId;
  readonly title: string;
  readonly description?: string;
  readonly snippet?: string;
  readonly imageUrl?: string;
  readonly url?: string;
  readonly score: number;
  readonly tags: readonly string[];
  readonly metadata: Record<string, any>;
  readonly organizationId?: Types.ObjectId;
  readonly createdBy?: Types.ObjectId;
  readonly isPublic: boolean;
  readonly lastIndexed: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Search index interface
 */
export interface ISearchIndex {
  readonly _id: Types.ObjectId;
  readonly entityType: string;
  readonly entityId: Types.ObjectId;
  readonly title: string;
  readonly content: string;
  readonly keywords: readonly string[];
  readonly tags: readonly string[];
  readonly category: string;
  readonly organizationId?: Types.ObjectId;
  readonly isPublic: boolean;
  readonly searchScore: number;
  readonly lastUpdated: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Search query interface
 */
export interface ISearchQuery {
  readonly query: string;
  readonly entityTypes?: readonly string[];
  readonly tags?: readonly string[];
  readonly category?: string;
  readonly organizationId?: Types.ObjectId;
  readonly isPublic?: boolean;
  readonly limit?: number;
  readonly offset?: number;
  readonly sortBy?: 'relevance' | 'date' | 'title' | 'score';
  readonly sortOrder?: 'asc' | 'desc';
  readonly minScore?: number;
  readonly filters?: Record<string, any>;
}