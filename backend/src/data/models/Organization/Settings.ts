import { Schema } from "mongoose";

export const SettingsSchema = new Schema({
  allowMemberInvites: { type: Boolean, default: true },
  requireAdminApproval: { type: Boolean, default: true },
  defaultMemberRole: { type: String, default: 'member' },
  contentSharingLevel: { type: String, default: 'organization' },
  customBranding: {
    logo: { type: String },
    colors: {
      primary: { type: String, default: '#3b82f6' },
      secondary: { type: String, default: '#1e40af' },
      accent: { type: String, default: '#f472b6' }
    }
  }
}, { _id: false });

export const StatsSchema = new Schema({
  memberCount: { type: Number, default: 1 },
  exerciseCount: { type: Number, default: 0 },
  workoutCount: { type: Number, default: 0 },
  programCount: { type: Number, default: 0 },
  averageEngagement: { type: Number, default: 0 },
  lastActivityDate: { type: Date, default: Date.now }
}, { _id: false });