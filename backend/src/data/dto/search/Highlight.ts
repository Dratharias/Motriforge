/**
 * Represents a field with highlighted fragments in search results.
 * This is a value object containing the highlighted text snippets.
 * 
 * Used in both frontend and backend.
 */
export interface Highlight {
  /**
   * The name of the highlighted field
   */
  field: string;
  
  /**
   * The text fragments containing highlights
   */
  fragments: string[];
}

/**
 * Implementation of the Highlight interface
 */
export class HighlightImpl implements Highlight {
  field: string;
  fragments: string[];
  
  /**
   * @param field The name of the highlighted field
   * @param fragments The text fragments containing highlights
   */
  constructor(field: string, fragments: string[] = []) {
    this.field = field;
    this.fragments = fragments;
  }
  
  /**
   * Creates a highlight from a field and a single fragment
   */
  static fromFragment(field: string, fragment: string): Highlight {
    return new HighlightImpl(field, [fragment]);
  }
  
  /**
   * Creates a highlight from a field and multiple fragments
   */
  static fromFragments(field: string, fragments: string[]): Highlight {
    return new HighlightImpl(field, fragments);
  }
  
  /**
   * Gets the combined text of all fragments
   */
  getCombinedText(separator: string = '...'): string {
    return this.fragments.join(separator);
  }
}
