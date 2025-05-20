import { DocumentVisibility } from '@/data/enums/Documents';
import { Types } from 'mongoose';

/**
 * Represents a document that can be indexed and searched in the search system.
 * This is a value object that contains the essential data needed for search operations.
 * 
 * Used in both frontend and backend.
 */
export interface SearchableDocument {
  /**
   * Unique identifier of the document
   */
  id: string;
  
  /**
   * The type of entity this document represents (e.g., exercise, workout, program)
   */
  type: string;
  
  /**
   * The main title or name of the document
   */
  title: string;
  
  /**
   * The main content or description text of the document
   */
  content: string;
  
  /**
   * Keywords associated with the document to improve search relevance
   */
  keywords: string[];
  
  /**
   * Additional metadata about the document, can include any relevant information
   */
  metadata: Record<string, any>;
  
  /**
   * Tags associated with the document for categorization
   */
  tags: string[];
  
  /**
   * The visibility setting of the document (public, private, organization)
   */
  visibility: DocumentVisibility;
  
  /**
   * The ID of the user who owns this document
   */
  owner: Types.ObjectId;
  
  /**
   * The ID of the organization this document belongs to, if applicable
   */
  organization?: Types.ObjectId;
  
  /**
   * The date when the document was created
   */
  createdAt: Date;
  
  /**
   * The date when the document was last updated
   */
  updatedAt: Date;
}
