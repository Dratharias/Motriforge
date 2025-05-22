import { IWorkoutBlock, BlockType } from '@/types/models';
import mongoose, { Schema } from 'mongoose';

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