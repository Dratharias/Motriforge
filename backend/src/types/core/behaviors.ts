import { Types } from 'mongoose';
import { IUser } from './interfaces.js';
import { Action } from './enums.js';

/**
 * Severity levels for validation issues
 */
export enum ValidationSeverity {
  CRITICAL = 'CRITICAL',
  ERROR = 'ERROR', 
  WARNING = 'WARNING',
  INFO = 'INFO'
}

/**
 * Individual validation error
 */
export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly code: string;
  readonly severity: ValidationSeverity;
  readonly context?: unknown;
}

/**
 * Validation warning for non-blocking issues
 */
export interface ValidationWarning {
  readonly field: string;
  readonly message: string;
  readonly suggestion?: string;
}

/**
 * Result of validation operations
 */
export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationWarning[];
  readonly isDraftValid: boolean;
  readonly requiredForPublication: readonly string[];
  
  canSaveDraft(): boolean;
  canPublish(): boolean;
}

/**
 * Interface for entities that can be validated
 */
export interface IValidatable {
  validate(): ValidationResult;
  validateDraft(): ValidationResult;
  isValid(): boolean;
  isDraftValid(): boolean;
  getValidationErrors(): readonly ValidationError[];
  getDraftValidationErrors(): readonly ValidationError[];
}

/**
 * Interface for entities that can be cloned
 */
export interface ICloneable<T> {
  clone(): T;
  cloneWithModifications(modifications: Partial<T>): T;
}

/**
 * Preview information for draft entities
 */
export interface IDraftPreview {
  readonly completionPercentage: number;
  readonly missingRequiredFields: readonly string[];
  readonly optionalFieldsCompleted: readonly string[];
  readonly estimatedTimeToComplete: number;
  readonly lastModified: Date;
}

/**
 * Interface for entities that support draft mode
 */
export interface IDraftable {
  readonly isDraft: boolean;
  
  validateForPublication(): ValidationResult;
  canBePublished(): boolean;
  publish(): void;
  saveDraft(): void;
  getDraftPreview(): IDraftPreview;
  getPublicationRequirements(): readonly string[];
}

/**
 * Interface for entities that can be shared with other users
 */
export interface IShareable {
  canBeSharedWith(user: IUser): boolean;
  share(targetUser: IUser, permissions: readonly Action[]): Promise<void>;
}

/**
 * Interface for entities that can be archived instead of deleted
 */
export interface IArchivable {
  archive(): void;
  restore(): void;
  canBeDeleted(): boolean;
  getAssociationCount(): number;
}

/**
 * Interface for entities that maintain version history
 */
export interface IVersionable<T> {
  readonly version: number;
  readonly previousVersions: readonly Types.ObjectId[];
  
  createVersion(): T;
  getPreviousVersion(version: number): Promise<T | null>;
}