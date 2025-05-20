import mongoose, { Schema, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUserPreferences {
  theme: string;
  language: string;
  measurementSystem: 'metric' | 'imperial';
  workoutDisplayMode: 'standard' | 'compact';
  emailNotifications: boolean;
  pushNotifications: boolean;
}

export interface IPrivacySettings {
  profileVisibility: 'public' | 'organization' | 'private';
  showWorkoutHistory: boolean;
  showProgression: boolean;
  allowDataAnalytics: boolean;
  shareWithTrainers: boolean;
}

export interface INotificationSettings {
  workoutReminders: boolean;
  achievementAlerts: boolean;
  newMessages: boolean;
  systemAnnouncements: boolean;
  programUpdates: boolean;
  trainerFeedback: boolean;
  dailySummary: boolean;
  marketingEmails: boolean;
}

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: Types.ObjectId;
  organizations: Array<{
    organization: Types.ObjectId;
    role: string;
    joinedAt: Date;
    active: boolean;
  }>;
  primaryOrganization: Types.ObjectId;
  active: boolean;
  storageQuota: number;
  storageUsed: number;
  notificationSettings: INotificationSettings;
  privacySettings: IPrivacySettings;
  preferences: IUserPreferences;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

export interface IUserDocument extends IUser {
  _password?: string;
}

const UserSchema: Schema = new Schema<IUserDocument>({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    trim: true,
    index: true
  },
  passwordHash: { type: String, required: true },
  role: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
  organizations: [{
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    role: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now },
    active: { type: Boolean, default: true }
  }],
  primaryOrganization: { 
    type: Schema.Types.ObjectId, 
    ref: 'Organization'
  },
  active: { type: Boolean, default: true },
  storageQuota: { type: Number, default: 1024 * 1024 * 100 }, // 100MB default
  storageUsed: { type: Number, default: 0 },
  notificationSettings: {
    workoutReminders: { type: Boolean, default: true },
    achievementAlerts: { type: Boolean, default: true },
    newMessages: { type: Boolean, default: true },
    systemAnnouncements: { type: Boolean, default: true },
    programUpdates: { type: Boolean, default: true },
    trainerFeedback: { type: Boolean, default: true },
    dailySummary: { type: Boolean, default: false },
    marketingEmails: { type: Boolean, default: false }
  },
  privacySettings: {
    profileVisibility: { type: String, enum: ['public', 'organization', 'private'], default: 'organization' },
    showWorkoutHistory: { type: Boolean, default: false },
    showProgression: { type: Boolean, default: false },
    allowDataAnalytics: { type: Boolean, default: true },
    shareWithTrainers: { type: Boolean, default: true }
  },
  preferences: {
    theme: { type: String, default: 'light' },
    language: { type: String, default: 'en' },
    measurementSystem: { type: String, enum: ['metric', 'imperial'], default: 'metric' },
    workoutDisplayMode: { type: String, enum: ['standard', 'compact'], default: 'standard' },
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

// Indexes for optimized queries
UserSchema.index({ 'organizations.organization': 1 });
UserSchema.index({ primaryOrganization: 1 });
UserSchema.index({ email: 1, 'organizations.organization': 1 });

// Method to compare password with hash
UserSchema.methods.comparePassword = async function(this: IUserDocument, candidate: string) {
  return bcrypt.compare(candidate, this.passwordHash);
};

// Virtual for full name
UserSchema.virtual('fullName').get(function(this: IUserDocument) {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save hook to hash password if modified
UserSchema.virtual('password')
  .set(function(this: IUserDocument, pwd: string) {
    this._password = pwd;
  })
  .get(function(this: IUserDocument) {
    return this._password;
  });

// pre-save hook to hash when `password` virtual is set
UserSchema.pre<IUserDocument>('save', async function() {
  if (!this._password) return;

  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this._password, salt);
});

export const UserModel = mongoose.model<IUser>('User', UserSchema);