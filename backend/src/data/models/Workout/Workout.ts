import mongoose, { Schema, Document, Types } from 'mongoose';

export enum WorkoutGoal {
  STRENGTH = 'strength',
  HYPERTROPHY = 'hypertrophy',
  ENDURANCE = 'endurance',
  CARDIO = 'cardio',
  FLEXIBILITY = 'flexibility',
  WEIGHT_LOSS = 'weight_loss',
  REHABILITATION = 'rehabilitation',
  SKILL = 'skill',
  GENERAL_FITNESS = 'general_fitness',
  SPORT_SPECIFIC = 'sport_specific',
  BALANCE = 'balance',
  POWER = 'power'
}

export interface IWorkout extends Document {
  name: string;
  description: string;
  durationInMinutes: number;
  intensityLevel: Types.ObjectId;
  goal: Types.ObjectId[];
  tags: string[];
  mediaIds: Types.ObjectId[];
  equipment: Types.ObjectId[];
  targetMuscleGroups: string[];
  prerequisites: string[];
  estimatedCalories: number;
  isTemplate: boolean;
  templateCategory: string;
  shared: boolean;
  organizationVisibility: string;
  isArchived: boolean;
  createdBy: Types.ObjectId;
  organization: Types.ObjectId;
  subscribersCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const WorkoutSchema: Schema = new Schema<IWorkout>({
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
  durationInMinutes: {
    type: Number,
    required: true,
    min: 1,
    index: true
  },
  intensityLevel: [{
    type: Types.ObjectId,
    ref: 'IntensityLevelInfo',
    required: true,
    index: true
  }],
  goal: [{
    type: Types.ObjectId,
    ref: 'WorkoutGoalInfo',
    required: true,
    index: true
  }],
  tags: [{
    type: String,
    index: true
  }],
  mediaIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Media'
  }],
  equipment: [{
    type: Schema.Types.ObjectId,
    ref: 'Equipment',
    index: true
  }],
  targetMuscleGroups: [{
    type: String,
    required: true,
    index: true
  }],
  prerequisites: [{
    type: String
  }],
  estimatedCalories: {
    type: Number,
    default: 0
  },
  isTemplate: {
    type: Boolean,
    default: false,
    index: true
  },
  templateCategory: {
    type: String,
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
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  subscribersCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
WorkoutSchema.index({ organization: 1, isArchived: 1 });
WorkoutSchema.index({ createdBy: 1, isArchived: 1 });
WorkoutSchema.index({ durationInMinutes: 1, intensityLevel: 1 });
WorkoutSchema.index({ goal: 1, intensityLevel: 1 });
WorkoutSchema.index({ isTemplate: 1, templateCategory: 1 });

// Text search index
WorkoutSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text',
  targetMuscleGroups: 'text'
}, {
  weights: {
    name: 10,
    tags: 5,
    targetMuscleGroups: 3,
    description: 1
  },
  name: 'workout_text_search'
});

export const WorkoutModel = mongoose.model<IWorkout>('Workout', WorkoutSchema);