import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IOrganizationMember extends Document {
  organization: Types.ObjectId;
  user: Types.ObjectId;
  role: Types.ObjectId;
  permissions: string[];
  joinedAt: Date;
  active: boolean;
  invitedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationMemberSchema: Schema = new Schema<IOrganizationMember>({
  organization: { 
    type: Schema.Types.ObjectId, 
    ref: 'Organization',
    required: true,
    index: true
  },
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    index: true
  },
  role: [{ 
    type: Types.ObjectId,
    ref: 'OrganizationRoleInfo',
    required: true 
  }],
  permissions: [{ 
    type: String 
  }],
  joinedAt: { 
    type: Date, 
    default: Date.now 
  },
  active: { 
    type: Boolean, 
    default: true 
  },
  invitedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound index for uniqueness and performance
OrganizationMemberSchema.index({ organization: 1, user: 1 }, { unique: true });
OrganizationMemberSchema.index({ organization: 1, role: 1 });
OrganizationMemberSchema.index({ user: 1, active: 1 });

export const OrganizationMemberModel = mongoose.model<IOrganizationMember>('OrganizationMember', OrganizationMemberSchema);