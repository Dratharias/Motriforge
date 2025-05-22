import { Schema } from 'mongoose';
import { IAddress, IContact } from '@/types/models';

/**
 * Address schema for locations and organizations
 */
export const AddressSchema = new Schema<IAddress>({
  street: { 
    type: String,
    trim: true,
    maxlength: 200
  },
  city: { 
    type: String,
    trim: true,
    maxlength: 100
  },
  state: { 
    type: String,
    trim: true,
    maxlength: 100
  },
  postalCode: { 
    type: String,
    trim: true,
    maxlength: 20
  },
  country: { 
    type: String,
    trim: true,
    maxlength: 100
  },
  coordinates: {
    latitude: { 
      type: Number,
      min: -90,
      max: 90
    },
    longitude: { 
      type: Number,
      min: -180,
      max: 180
    }
  }
}, { 
  _id: false,
  timestamps: false
});

/**
 * Contact information schema
 */
export const ContactSchema = new Schema<IContact>({
  phone: { 
    type: String,
    trim: true,
    maxlength: 20,
    validate: {
      validator: function(v: string) {
        return !v || /^[\+]?[1-9][\d]{0,15}$/.test(v.replace(/[\s\-\(\)]/g, ''));
      },
      message: 'Invalid phone number format'
    }
  },
  email: { 
    type: String, 
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 100,
    validate: {
      validator: function(v: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  website: { 
    type: String,
    trim: true,
    maxlength: 200,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Website must be a valid URL starting with http:// or https://'
    }
  },
  socialMedia: {
    facebook: { 
      type: String,
      trim: true,
      maxlength: 100
    },
    instagram: { 
      type: String,
      trim: true,
      maxlength: 100
    },
    twitter: { 
      type: String,
      trim: true,
      maxlength: 100
    },
    linkedin: { 
      type: String,
      trim: true,
      maxlength: 100
    }
  }
}, { 
  _id: false,
  timestamps: false
});

// Virtual for formatted address
AddressSchema.virtual('formattedAddress').get(function() {
  const parts = [
    this.street,
    this.city,
    this.state,
    this.postalCode,
    this.country
  ].filter(Boolean);
  
  return parts.join(', ');
});

// Virtual for coordinates validation
AddressSchema.virtual('hasValidCoordinates').get(function() {
  return this.coordinates?.latitude != null && 
         this.coordinates?.longitude != null &&
         Math.abs(this.coordinates.latitude) <= 90 &&
         Math.abs(this.coordinates.longitude) <= 180;
});

// Instance method for contact validation
ContactSchema.methods.hasValidSocialMedia = function(): boolean {
  const socialMedia = this.socialMedia;
  if (!socialMedia) return true;
  
  // Basic validation for social media URLs/usernames
  const urlPattern = /^(https?:\/\/)?([\w\.-]+)\.([a-z\.]{2,6})([\/\w\.-]*)*\/?$/i;
  const usernamePattern = /^[a-zA-Z0-9_\.]{1,30}$/;
  
  return Object.values(socialMedia).every((value) => {
    const str = value as string | undefined;
    if (!str) return true;
    return urlPattern.test(str) || usernamePattern.test(str);
  });
};