import { Types } from 'mongoose';
import { ExerciseInstruction } from '../entities/ExerciseInstruction';
import { MediaType } from '../../../types/fitness/enums/media';
import { NewEntity } from '../../../types/core/interfaces';

/**
 * Repository interface for ExerciseInstruction operations
 */
export interface IExerciseInstructionRepository {
  /**
   * Find instruction by ID
   */
  findById(id: Types.ObjectId): Promise<ExerciseInstruction | null>;

  /**
   * Find all instructions for an exercise, ordered by step number
   */
  findByExerciseId(exerciseId: Types.ObjectId): Promise<readonly ExerciseInstruction[]>;

  /**
   * Find instructions by step number range
   */
  findByStepRange(exerciseId: Types.ObjectId, startStep: number, endStep: number): Promise<readonly ExerciseInstruction[]>;

  /**
   * Find instructions with media content
   */
  findWithMedia(exerciseId?: Types.ObjectId, mediaType?: MediaType): Promise<readonly ExerciseInstruction[]>;

  /**
   * Find optional instructions
   */
  findOptionalInstructions(exerciseId: Types.ObjectId): Promise<readonly ExerciseInstruction[]>;

  /**
   * Find instructions with tips
   */
  findWithTips(exerciseId?: Types.ObjectId): Promise<readonly ExerciseInstruction[]>;

  /**
   * Find instructions with common mistakes
   */
  findWithCommonMistakes(exerciseId?: Types.ObjectId): Promise<readonly ExerciseInstruction[]>;

  /**
   * Create new instruction
   */
  create(instruction: Omit<ExerciseInstruction, NewEntity>): Promise<ExerciseInstruction>;

  /**
   * Update existing instruction
   */
  update(id: Types.ObjectId, updates: Partial<ExerciseInstruction>): Promise<ExerciseInstruction | null>;

  /**
   * Delete instruction
   */
  delete(id: Types.ObjectId): Promise<boolean>;

  /**
   * Reorder instructions for an exercise
   */
  reorder(exerciseId: Types.ObjectId, instructionIds: readonly Types.ObjectId[]): Promise<boolean>;

  /**
   * Get next step number for an exercise
   */
  getNextStepNumber(exerciseId: Types.ObjectId): Promise<number>;

  /**
   * Bulk operations for instructions
   */
  bulkCreate(instructions: ReadonlyArray<Omit<ExerciseInstruction, NewEntity>>): Promise<readonly ExerciseInstruction[]>;
  bulkUpdate(updates: ReadonlyArray<{ id: Types.ObjectId; updates: Partial<ExerciseInstruction> }>): Promise<readonly ExerciseInstruction[]>;
  bulkDelete(ids: readonly Types.ObjectId[]): Promise<boolean>;

  /**
   * Copy instructions from one exercise to another
   */
  copyInstructions(fromExerciseId: Types.ObjectId, toExerciseId: Types.ObjectId, createdBy: Types.ObjectId): Promise<readonly ExerciseInstruction[]>;

  /**
   * Find instructions by duration range
   */
  findByDuration(minDuration?: number, maxDuration?: number): Promise<readonly ExerciseInstruction[]>;

  /**
   * Get instruction statistics
   */
  getInstructionStatistics(exerciseId?: Types.ObjectId): Promise<{
    totalInstructions: number;
    instructionsWithMedia: number;
    instructionsWithTips: number;
    instructionsWithMistakes: number;
    averageSteps: number;
    averageDuration: number;
  }>;

  /**
   * Validate instruction order
   */
  validateInstructionOrder(exerciseId: Types.ObjectId): Promise<boolean>;

  /**
   * Find gaps in step numbers
   */
  findStepGaps(exerciseId: Types.ObjectId): Promise<readonly number[]>;
}

