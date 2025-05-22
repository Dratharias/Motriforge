import { IMuscle } from "@/types/models";
import mongoose, { Schema } from "mongoose";

const MuscleSchema: Schema = new Schema<IMuscle>({
  id: { 
    type: String, 
    required: true, 
    unique: true 
  },
  zone: { 
    type: String, 
    required: true,
    index: true 
  },
  name: { 
    type: String, 
    required: true,
    index: true 
  },
  type: { 
    type: String, 
    required: true,
    index: true 
  },
  level: { 
    type: String, 
    required: true,
    index: true 
  },
  conventional_name: { 
    type: String, 
    required: true 
  },
  latin_term: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  attachments: [{ 
    type: String 
  }],
  functions: [{ 
    type: String 
  }],
  innervation: { 
    type: String 
  },
  bloodSupply: { 
    type: String 
  },
  relatedMuscles: [{ 
    type: String 
  }],
  imagePath: { 
    type: String 
  },
  threeDModelPath: { 
    type: String 
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
MuscleSchema.index({ zone: 1, level: 1 });
MuscleSchema.index({ type: 1, zone: 1 });
MuscleSchema.index({ name: 'text', conventional_name: 'text', latin_term: 'text' });

export const MuscleModel = mongoose.model<IMuscle>('Muscle', MuscleSchema);