import mongoose, { Schema, Document, Types } from 'mongoose';

export enum MuscleGroupCategory {
  UPPER_BODY = 'Upper Body',
  LOWER_BODY = 'Lower Body',
  ARMS = 'Arms',
  CORE = 'Core',
  BACK = 'Back',
  LEGS = 'Legs',
  FULL_BODY = 'Full Body',
  OTHER = 'Other'
}

export interface IMuscleGroup extends Document {
  name: string;
  muscles: Types.ObjectId[];
  description: string;
  category: MuscleGroupCategory;
  primaryFunction: string;
  icon: string;
  color: string;
  recommendedExercises: Types.ObjectId[];
  antagonistGroup?: Types.ObjectId[];
  synergistGroups?: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

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
    enum: Object.values(MuscleGroupCategory),
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
