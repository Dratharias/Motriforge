import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITrainerProfile extends Document {
  user: Types.ObjectId;
  specializations: string[];
  certifications: Types.ObjectId[];
  experience: number; // in months
  bio: string;
  rating: number;
  availabilitySchedule: Record<string, any>;
  clientLimit: number;
  activeClientCount: number;
  hourlyRate?: number;
  portfolio?: string;
  featured: boolean;
  isAcceptingClients: boolean;
  socialMedia?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const TrainerProfileSchema: Schema = new Schema<ITrainerProfile>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  specializations: [{
    type: String,
    required: true,
    index: true
  }],
  certifications: [{
    type: Schema.Types.ObjectId,
    ref: 'Certificate',
    index: true
  }],
  experience: {
    type: Number,
    required: true,
    min: 0,
    index: true
  },
  bio: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
    index: true
  },
  availabilitySchedule: {
    type: Schema.Types.Mixed,
    default: {}
  },
  clientLimit: {
    type: Number,
    default: 20,
    min: 1
  },
  activeClientCount: {
    type: Number,
    default: 0,
    min: 0
  },
  hourlyRate: {
    type: Number,
    min: 0
  },
  portfolio: {
    type: String
  },
  featured: {
    type: Boolean,
    default: false,
    index: true
  },
  isAcceptingClients: {
    type: Boolean,
    default: true,
    index: true
  },
  socialMedia: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Virtual to check if can accept new clients
TrainerProfileSchema.virtual('canAcceptNewClients').get(function(this: ITrainerProfile) {
  return this.isAcceptingClients && this.activeClientCount < this.clientLimit;
});

// Indexes for common queries
TrainerProfileSchema.index({ rating: -1, experience: -1 });
TrainerProfileSchema.index({ featured: 1, rating: -1 });

export const TrainerProfileModel = mongoose.model<ITrainerProfile>('TrainerProfile', TrainerProfileSchema);