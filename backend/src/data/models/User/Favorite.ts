import { IFavorite } from '@/types/models';
import mongoose, { Schema } from 'mongoose';

const FavoriteSchema: Schema = new Schema<IFavorite>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  exercises: [{
    type: Schema.Types.ObjectId,
    ref: 'Exercise',
    index: true
  }],
  workouts: [{
    type: Schema.Types.ObjectId,
    ref: 'Workout',
    index: true
  }],
  programs: [{
    type: Schema.Types.ObjectId,
    ref: 'Program',
    index: true
  }],
  swaps: [{
    type: Schema.Types.ObjectId,
    ref: 'ExerciseSwap',
    index: true
  }],
  theme: {
    type: String,
    default: 'default'
  }
}, {
  timestamps: true
});

// Indexes for common queries
FavoriteSchema.index({ 'exercises': 1 });
FavoriteSchema.index({ 'workouts': 1 });
FavoriteSchema.index({ 'programs': 1 });

export const FavoriteModel = mongoose.model<IFavorite>('Favorite', FavoriteSchema);