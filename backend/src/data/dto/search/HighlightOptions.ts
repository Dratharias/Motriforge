/**
 * Represents options for highlighting search matches in search results.
 * This is a value object that defines how search matches should be highlighted.
 * 
 * Used in both frontend and backend.
 */
export interface HighlightOptions {
  /**
   * The fields to apply highlighting to
   */
  fields: string[];
  
  /**
   * The tag to insert before a highlighted term
   */
  preTag: string;
  
  /**
   * The tag to insert after a highlighted term
   */
  postTag: string;
  
  /**
   * The maximum size of a highlighted fragment
   */
  fragmentSize: number;
  
  /**
   * The maximum number of fragments to return
   */
  numberOfFragments: number;
}

/**
 * Implementation of the HighlightOptions interface
 */
export class HighlightOptionsImpl implements HighlightOptions {
  fields: string[];
  preTag: string;
  postTag: string;
  fragmentSize: number;
  numberOfFragments: number;
  
  /**
   * @param fields The fields to apply highlighting to
   * @param preTag The tag to insert before a highlighted term
   * @param postTag The tag to insert after a highlighted term
   * @param fragmentSize The maximum size of a highlighted fragment
   * @param numberOfFragments The maximum number of fragments to return
   */
  constructor(
    fields: string[] = ['title', 'content'], 
    preTag: string = '<em>',
    postTag: string = '</em>',
    fragmentSize: number = 150,
    numberOfFragments: number = 3
  ) {
    this.fields = fields;
    this.preTag = preTag;
    this.postTag = postTag;
    this.fragmentSize = fragmentSize;
    this.numberOfFragments = numberOfFragments;
  }
  
  /**
   * Creates default highlight options
   */
  static default(): HighlightOptions {
    return new HighlightOptionsImpl();
  }
  
  /**
   * Creates highlight options with HTML strong tags
   */
  static htmlBold(): HighlightOptions {
    return new HighlightOptionsImpl(
      ['title', 'content'],
      '<strong>',
      '</strong>',
      150,
      3
    );
  }
}
