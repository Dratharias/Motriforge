// Equipment related types

import { Types } from 'mongoose';
import { IBaseModel, IOrganizationContext } from './common';

/**
 * Core equipment interface
 */
export interface IEquipment extends IBaseModel, IOrganizationContext {
  readonly name: string;
  readonly description: string;
  readonly aliases: readonly string[];
  readonly category: string;
  readonly subcategory: string;
  readonly mediaIds: readonly Types.ObjectId[];
  readonly specifications: Record<string, any>;
  readonly usage: string;
  readonly safetyNotes: readonly string[];
  readonly commonUses: readonly string[];
  readonly relatedEquipment: readonly Types.ObjectId[];
  readonly tags: readonly string[];
  readonly isPlatformEquipment: boolean;
}