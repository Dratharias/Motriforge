// Muscle and muscle group related types

import { Types } from 'mongoose';
import { IBaseModel } from './common';
import { MuscleGroupCategory, MuscleLevel, MuscleLevelValue, MuscleType, MuscleTypeValue, MuscleZone, MuscleZoneValue } from './enums';

/**
 * Core muscle interface
 */
export interface IMuscle extends IBaseModel {
  readonly id: string;
  readonly zone: MuscleZone;
  readonly name: string;
  readonly type: MuscleType;
  readonly level: MuscleLevel;
  readonly conventional_name: string;
  readonly latin_term: string;
  readonly description?: string;
  readonly attachments?: readonly string[];
  readonly functions?: readonly string[];
  readonly innervation?: string;
  readonly bloodSupply?: string;
  readonly relatedMuscles?: readonly string[];
  readonly imagePath?: string;
  readonly threeDModelPath?: string;
}

/**
 * Muscle group interface
 */
export interface IMuscleGroup extends IBaseModel {
  readonly name: string;
  readonly muscles: readonly Types.ObjectId[];
  readonly description: string;
  readonly category: MuscleGroupCategory;
  readonly primaryFunction: string;
  readonly icon: string;
  readonly color: string;
  readonly recommendedExercises: readonly Types.ObjectId[];
  readonly antagonistGroup?: readonly Types.ObjectId[];
  readonly synergistGroups?: readonly Types.ObjectId[];
}

/**
 * Muscle type info interface
 */
export interface IMuscleTypeInfo extends IBaseModel {
  readonly type: MuscleTypeValue;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly color: string;
  readonly properties: readonly string[];
  readonly commonExercises: readonly Types.ObjectId[];
  readonly recoveryTime: string;
}

/**
 * Muscle zone info interface
 */
export interface IMuscleZoneInfo extends IBaseModel {
  readonly zone: MuscleZoneValue;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly color: string;
  readonly muscleCount: number;
  readonly relatedZones: readonly Types.ObjectId[];
  readonly commonInjuries: readonly string[];
  readonly recommendedExercises: readonly Types.ObjectId[];
  readonly majorMuscles: readonly Types.ObjectId[];
}

/**
 * Muscle level info interface
 */
export interface IMuscleLevelInfo extends IBaseModel {
  readonly level: MuscleLevelValue;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly color: string;
  readonly knowledgeRequirements: string;
  readonly recommendedAudience: readonly string[];
  readonly detailLevel: string;
  readonly anatomicalPrecision: string;
}