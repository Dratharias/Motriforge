import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IExercise extends Document {
  name: string;
  description: string;
  instructions: string;
  muscleGroups: string[];
  primaryMuscleGroup: string;
  equipment: Types.ObjectId[];
  exerciseType: Types.ObjectId;
  difficulty: Types.ObjectId;
  mediaIds: Types.ObjectId[];
  prerequisites: string[];
  formCues: string[];
  commonMistakes: string[];
  tags: string[];
  organization: Types.ObjectId;
  createdBy: Types.ObjectId;
  shared: boolean;
  organizationVisibility: string;
  isArchived: boolean;
  workoutsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ExerciseSchema: Schema = new Schema<IExercise>({
  name: { 
    type: String, 
    required: true, 
    trim: true,
    index: true
  },
  description: { 
    type: String, 
    required: true 
  },
  instructions: { 
    type: String, 
    required: true 
  },
  muscleGroups: [{ 
    type: String, 
    required: true,
    index: true
  }],
  primaryMuscleGroup: { 
    type: String, 
    required: true,
    index: true
  },
  equipment: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'Equipment',
    index: true
  }],
  exerciseType: [{ 
    type: Types.ObjectId, 
    ref: 'ExerciseTypeInfo',
    index: true
  }],
  difficulty: [{ 
    type: Types.ObjectId, 
    ref: 'DifficultyLevelInfo',
    index: true
  }],
  mediaIds: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'Media' 
  }],
  prerequisites: [{ 
    type: String 
  }],
  formCues: [{ 
    type: String 
  }],
  commonMistakes: [{ 
    type: String 
  }],
  tags: [{ 
    type: String,
    index: true
  }],
  organization: { 
    type: Schema.Types.ObjectId, 
    ref: 'Organization',
    required: true,
    index: true
  },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    index: true
  },
  shared: { 
    type: Boolean, 
    default: false,
    index: true
  },
  organizationVisibility: { 
    type: String, 
    default: 'organization',
    index: true
  },
  isArchived: { 
    type: Boolean, 
    default: false,
    index: true
  },
  workoutsCount: { 
    type: Number, 
    default: 0 
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
ExerciseSchema.index({ organization: 1, isArchived: 1 });
ExerciseSchema.index({ createdBy: 1, isArchived: 1 });
ExerciseSchema.index({ muscleGroups: 1, difficulty: 1 });
ExerciseSchema.index({ exerciseType: 1, primaryMuscleGroup: 1 });
ExerciseSchema.index({ 
  name: 'text', 
  description: 'text', 
  muscleGroups: 'text',
  tags: 'text'
}, {
  weights: {
    name: 10,
    tags: 5,
    muscleGroups: 3,
    description: 1
  },
  name: 'exercise_text_search'
});

export const ExerciseModel = mongoose.model<IExercise>('Exercise', ExerciseSchema);