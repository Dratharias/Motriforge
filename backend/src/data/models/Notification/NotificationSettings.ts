import { INotificationSettings } from '@/types/models';
import mongoose, { Schema } from 'mongoose';

const NotificationSettingsSchema: Schema = new Schema<INotificationSettings>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  workoutReminders: {
    type: Boolean,
    default: true
  },
  achievementAlerts: {
    type: Boolean,
    default: true
  },
  newMessages: {
    type: Boolean,
    default: true
  },
  systemAnnouncements: {
    type: Boolean,
    default: true
  },
  programUpdates: {
    type: Boolean,
    default: true
  },
  trainerFeedback: {
    type: Boolean,
    default: true
  },
  dailySummary: {
    type: Boolean,
    default: false
  },
  marketingEmails: {
    type: Boolean,
    default: false
  },
  mobileEnabled: {
    type: Boolean,
    default: true
  },
  emailEnabled: {
    type: Boolean,
    default: true
  },
  webEnabled: {
    type: Boolean,
    default: true
  },
  quietHoursStart: {
    type: Number,
    min: 0,
    max: 23
  },
  quietHoursEnd: {
    type: Number,
    min: 0,
    max: 23
  },
  customCategories: {
    type: Map,
    of: Boolean,
    default: new Map()
  }
}, {
  timestamps: true
});

// Create compound index for efficient querying
NotificationSettingsSchema.index({ user: 1, emailEnabled: 1 });
NotificationSettingsSchema.index({ user: 1, mobileEnabled: 1 });
NotificationSettingsSchema.index({ user: 1, webEnabled: 1 });

export const NotificationSettingsModel = mongoose.model<INotificationSettings>('NotificationSettings', NotificationSettingsSchema);