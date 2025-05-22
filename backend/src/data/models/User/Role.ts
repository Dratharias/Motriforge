import { IRole } from '@/types/models';
import mongoose, { Schema } from 'mongoose';

const RoleSchema: Schema = new Schema<IRole>({
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
  permissions: [{ 
    type: String, 
    required: true 
  }],
  organizationId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Organization',
    index: true
  }
}, {
  timestamps: true
});

// Compound index for organization-specific roles
RoleSchema.index({ name: 1, organizationId: 1 }, { unique: true });

export const RoleModel = mongoose.model<IRole>('Role', RoleSchema);