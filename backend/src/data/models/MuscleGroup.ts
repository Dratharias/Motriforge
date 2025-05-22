import { IMuscleGroup, MuscleGroupCategory } from '@/types/models';
import mongoose, { Schema } from 'mongoose';

const MuscleGroupSchema: Schema = new Schema<IMuscleGroup>({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  muscles: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'Muscle', 
    required: true,
    index: true 
  }],
  description: { 
    type: String, 
    required: true 
  },
  category: { 
    type: String, 
    enum: MuscleGroupCategory,
    required: true,
    index: true 
  },
  primaryFunction: { 
    type: String, 
    required: true 
  },
  icon: { 
    type: String, 
    required: true 
  },
  color: { 
    type: String, 
    required: true 
  },
  recommendedExercises: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'Exercise'
  }],
  antagonistGroup: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'MuscleGroup'
  }],
  synergistGroups: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'MuscleGroup'
  }]
}, {
  timestamps: true
});

// Text and compound indexes for efficient querying
MuscleGroupSchema.index({ category: 1 });
MuscleGroupSchema.index({ muscles: 1 });
MuscleGroupSchema.index({ name: 'text', description: 'text' });

export const MuscleGroupModel = mongoose.model<IMuscleGroup>('MuscleGroup', MuscleGroupSchema);
