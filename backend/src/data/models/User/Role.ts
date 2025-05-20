import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRole extends Document {
  name: string;
  description: string;
  permissions: string[];
  organizationId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

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