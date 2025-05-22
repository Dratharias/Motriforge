import { IProgram } from '@/types/models';
import mongoose, { Schema, Types } from 'mongoose';

const ProgramTargetExerciseSchema = new Schema({
  exerciseId: {
    type: Schema.Types.ObjectId,
    ref: 'Exercise',
    required: true
  },
  targetMetrics: {
    type: Schema.Types.Mixed,
    default: {}
  },
  progressionPlan: {
    type: String
  }
}, { _id: false });

const ProgramSchema: Schema = new Schema<IProgram>({
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
  durationInWeeks: {
    type: Number,
    required: true,
    min: 1,
    index: true
  },
  goal: [{
     type: Types.ObjectId,
     ref: 'ProgramGoal',
     required: true,
     index: true
  }],
  subgoals: [{
    type: Types.ObjectId,
    ref: 'ProgramSubgoalInfo',
    index: true
  }],
  targetExercises: [ProgramTargetExerciseSchema],
  targetMetrics: {
    type: Schema.Types.Mixed,
    default: {}
  },
  tags: [{
    type: String,
    index: true
  }],
  mediaIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Media'
  }],
  organizationVisibility: [{
    type: Schema.Types.ObjectId,
    ref: 'OrganizationVisibilityInfo',
    index: true
  }],
  shared: {
    type: Boolean,
    default: false,
    index: true
  },
  isTemplate: {
    type: Boolean,
    default: false,
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
ProgramSchema.index({ organization: 1, isArchived: 1 });
ProgramSchema.index({ createdBy: 1, isArchived: 1 });
ProgramSchema.index({ goal: 1, durationInWeeks: 1 });
ProgramSchema.index({ isTemplate: 1, shared: 1 });
ProgramSchema.index({
   name: 'text',
   description: 'text',
   tags: 'text'
 }, {
  weights: {
    name: 10,
    tags: 5,
    goal: 3,
    subgoals: 2,
    description: 1
  },
  name: 'program_text_search'
});

export const ProgramModel = mongoose.model<IProgram>('Program', ProgramSchema);
