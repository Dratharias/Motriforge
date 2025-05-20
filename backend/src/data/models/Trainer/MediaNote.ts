import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMediaNote extends Document {
  media: Types.ObjectId;
  creator: Types.ObjectId;
  timestamp: number; // In seconds for video/audio, or coordinates for images
  comment: string;
  drawingData?: string; // SVG path or canvas data
  visibleToClient: boolean;
  relatedExercise?: Types.ObjectId;
  relatedWorkoutSession?: Types.ObjectId;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MediaNoteSchema: Schema = new Schema<IMediaNote>({
  media: {
    type: Schema.Types.ObjectId,
    ref: 'Media',
    required: true,
    index: true
  },
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  timestamp: {
    type: Number,
    required: true
  },
  comment: {
    type: String,
    required: true
  },
  drawingData: {
    type: String
  },
  visibleToClient: {
    type: Boolean,
    default: true,
    index: true
  },
  relatedExercise: {
    type: Schema.Types.ObjectId,
    ref: 'Exercise',
    index: true
  },
  relatedWorkoutSession: {
    type: Schema.Types.ObjectId,
    ref: 'WorkoutSession',
    index: true
  },
  tags: [{
    type: String,
    index: true
  }]
}, {
  timestamps: true
});

// Compound indexes for common queries
MediaNoteSchema.index({ media: 1, timestamp: 1 });
MediaNoteSchema.index({ creator: 1, media: 1 });
MediaNoteSchema.index({ relatedExercise: 1, visibleToClient: 1 });

export const MediaNoteModel = mongoose.model<IMediaNote>('MediaNote', MediaNoteSchema);