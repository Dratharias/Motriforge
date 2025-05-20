import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITrainingFeedback extends Document {
  client: Types.ObjectId;
  coach: Types.ObjectId;
  workoutSession: Types.ObjectId;
  date: Date;
  feedbackText: string;
  correctionNotes: string;
  formComments: string;
  performanceRating: number;
  progressionSuggestions: string;
  mediaNotes: Types.ObjectId[];
  wasReviewed: boolean;
  reviewDate?: Date;
  exerciseFeedback?: Map<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const TrainingFeedbackSchema: Schema = new Schema<ITrainingFeedback>({
  client: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  coach: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  workoutSession: {
    type: Schema.Types.ObjectId,
    ref: 'WorkoutSession',
    required: true,
    index: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  feedbackText: {
    type: String,
    required: true
  },
  correctionNotes: {
    type: String
  },
  formComments: {
    type: String
  },
  performanceRating: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  progressionSuggestions: {
    type: String
  },
  mediaNotes: [{
    type: Schema.Types.ObjectId,
    ref: 'MediaNote'
  }],
  wasReviewed: {
    type: Boolean,
    default: false,
    index: true
  },
  reviewDate: {
    type: Date
  },
  exerciseFeedback: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
TrainingFeedbackSchema.index({ client: 1, coach: 1, date: -1 });
TrainingFeedbackSchema.index({ workoutSession: 1 }, { unique: true });
TrainingFeedbackSchema.index({ client: 1, wasReviewed: 1 });

// Instance methods
TrainingFeedbackSchema.methods.markAsReviewed = async function(): Promise<ITrainingFeedback> {
  this.wasReviewed = true;
  this.reviewDate = new Date();
  return this.save();
};

export const TrainingFeedbackModel = mongoose.model<ITrainingFeedback>(
  'TrainingFeedback',
  TrainingFeedbackSchema
);