import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICertificate extends Document {
  user: Types.ObjectId;
  name: string;
  issuingBody: string;
  dateObtained: Date;
  expirationDate?: Date;
  verificationLink?: string;
  certificateNumber?: string;
  media?: Types.ObjectId;
  documentUrl?: string;
  isVerified: boolean;
  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  isValid(): boolean;
}

const CertificateSchema: Schema = new Schema<ICertificate>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    index: true
  },
  media: [{
    type: Types.ObjectId,
    ref: 'Media'
  }],
  issuingBody: {
    type: String,
    required: true,
    index: true
  },
  dateObtained: {
    type: Date,
    required: true
  },
  expirationDate: {
    type: Date,
    index: true
  },
  verificationLink: {
    type: String
  },
  certificateNumber: {
    type: String,
    index: true
  },
  documentUrl: {
    type: String
  },
  isVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  verifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Method to check if certificate is still valid
CertificateSchema.methods.isValid = function(): boolean {
  if (!this.expirationDate) return true; // No expiration date, always valid
  return new Date() < this.expirationDate;
};

// Compound indexes
CertificateSchema.index({ user: 1, name: 1, issuingBody: 1 });

export const CertificateModel = mongoose.model<ICertificate>('Certificate', CertificateSchema);