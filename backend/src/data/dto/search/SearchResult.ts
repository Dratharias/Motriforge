import { Highlight } from './Highlight';

/**
 * Represents a single result in a search response.
 * This is a value object that contains information about a search match.
 * 
 * Used in both frontend and backend.
 */
export interface SearchResult {
  /**
   * The ID of the matching document
   */
  id: string;
  
  /**
   * The type of the matching document
   */
  type: string;
  
  /**
   * The title of the matching document
   */
  title: string;
  
  /**
   * A text snippet summarizing the matching content
   */
  snippet: string;
  
  /**
   * Highlighted fragments showing the matches
   */
  highlights: Highlight[];
  
  /**
   * The relevance score of the match
   */
  score: number;
  
  /**
   * Additional metadata about the matching document
   */
  metadata: Record<string, any>;
  
  /**
   * The date when the document was created
   */
  createdAt: Date;
  
  /**
   * The date when the document was last updated
   */
  updatedAt: Date;
}

/**
 * Options for creating a SearchResult
 */
export interface SearchResultOptions {
  id: string;
  type: string;
  title: string;
  snippet: string;
  highlights?: Highlight[];
  score?: number;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Implementation of the SearchResult interface
 */
export class SearchResultImpl implements SearchResult {
  id: string;
  type: string;
  title: string;
  snippet: string;
  highlights: Highlight[];
  score: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  
  /**
   * @param options The search result options
   */
  constructor(options: SearchResultOptions) {
    this.id = options.id;
    this.type = options.type;
    this.title = options.title;
    this.snippet = options.snippet;
    this.highlights = options.highlights ?? [];
    this.score = options.score ?? 0;
    this.metadata = options.metadata ?? {};
    this.createdAt = options.createdAt ?? new Date();
    this.updatedAt = options.updatedAt ?? new Date();
  }
  
  /**
   * Gets all highlights for a specific field
   */
  getHighlightsForField(field: string): Highlight | undefined {
    return this.highlights.find(h => h.field === field);
  }
  
  /**
   * Checks if this result has highlights
   */
  hasHighlights(): boolean {
    return this.highlights.length > 0;
  }
  
  /**
   * Gets a metadata value
   */
  getMetadata<T>(key: string, defaultValue?: T): T | undefined {
    const value = this.metadata[key] as T;
    return value ?? defaultValue;
  }
  
  /**
   * Creates a search result from a document object
   */
  static fromDocument(document: any, score: number = 0): SearchResult {
    return new SearchResultImpl({
      id: document.id,
      type: document.type,
      title: document.title,
      snippet: document.content ? document.content.substring(0, 200) + '...' : '',
      highlights: [],
      score,
      metadata: document.metadata ?? {},
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    });
  }
}
