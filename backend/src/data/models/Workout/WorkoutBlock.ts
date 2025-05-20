import mongoose, { Schema, Document, Types } from 'mongoose';

export enum BlockType {
  WARM_UP = 'warm_up',
  COOL_DOWN = 'cool_down',
  STRENGTH = 'strength',
  CARDIO = 'cardio',
  CIRCUIT = 'circuit',
  SUPERSET = 'superset',
  GIANT_SET = 'giant_set',
  EMOM = 'emom', // Every Minute On the Minute
  AMRAP = 'amrap', // As Many Rounds As Possible
  PYRAMID = 'pyramid',
  DROP_SET = 'drop_set',
  TABATA = 'tabata',
  HIIT = 'hiit', // High-Intensity Interval Training
  ACTIVE_RECOVERY = 'active_recovery',
  MOBILITY = 'mobility',
  CUSTOM = 'custom'
}

export interface IWorkoutBlock extends Document {
  workoutId: Types.ObjectId;
  title: string;
  description: string;
  blockType: BlockType;
  position: number; // Order within workout
  restBetweenBlocks: number; // Rest in seconds
  rounds: number;
  timeCap: number; // Time cap in seconds, 0 = no cap
  createdAt: Date;
  updatedAt: Date;
}

const WorkoutBlockSchema: Schema = new Schema<IWorkoutBlock>({
  workoutId: {
    type: Schema.Types.ObjectId,
    ref: 'Workout',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  blockType: {
    type: String,
    enum: Object.values(BlockType),
    required: true,
    index: true
  },
  position: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  restBetweenBlocks: {
    type: Number,
    default: 60,
    min: 0 // Rest in seconds
  },
  rounds: {
    type: Number,
    default: 1,
    min: 1
  },
  timeCap: {
    type: Number,
    default: 0, // 0 means no time cap
    min: 0 // Time cap in seconds
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
WorkoutBlockSchema.index({ workoutId: 1, position: 1 });
WorkoutBlockSchema.index({ workoutId: 1, blockType: 1 });

export const WorkoutBlockModel = mongoose.model<IWorkoutBlock>('WorkoutBlock', WorkoutBlockSchema);