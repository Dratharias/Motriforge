import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRefreshToken extends Document {
  token: string;
  user: Types.ObjectId;
  expiresAt: Date;
  clientId: string;
  userAgent: string;
  ipAddress: string;
  isRevoked: boolean;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  isExpired(): boolean;
  revoke(): Promise<IRefreshToken>;
}

const RefreshTokenSchema: Schema = new Schema<IRefreshToken>({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  clientId: {
    type: String,
    required: true
  },
  userAgent: {
    type: String
  },
  ipAddress: {
    type: String
  },
  isRevoked: {
    type: Boolean,
    default: false,
    index: true
  },
  revokedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for performance on token validation and cleanup
RefreshTokenSchema.index({ user: 1, isRevoked: 1 });
RefreshTokenSchema.index({ expiresAt: 1 });

// Instance methods
RefreshTokenSchema.methods.isExpired = function(): boolean {
  return this.expiresAt < new Date() || this.isRevoked;
};

RefreshTokenSchema.methods.revoke = async function(): Promise<IRefreshToken> {
  this.isRevoked = true;
  this.revokedAt = new Date();
  return this.save();
};

// Static method for cleanup
RefreshTokenSchema.statics.removeExpired = async function() {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isRevoked: true }
    ]
  });
};

export const RefreshTokenModel = mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);