// User and authentication related types

import { Types } from 'mongoose';
import { IBaseModel, IUserPreferences, IPrivacySettings, INotificationSettings } from './common';

/**
 * Core user interface
 */
export interface IUser extends IBaseModel {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  passwordHash: string;
  readonly role: Types.ObjectId;
  readonly organizations: readonly IUserOrganization[];
  readonly primaryOrganization: Types.ObjectId;
  readonly active: boolean;
  readonly storageQuota: number;
  readonly storageUsed: number;
  readonly notificationSettings: INotificationSettings;
  readonly privacySettings: IPrivacySettings;
  readonly preferences: IUserPreferences;
}

export interface IUserDocument extends IUser {
  _password?: string;
}

/**
 * User organization membership interface
 */
export interface IUserOrganization {
  readonly organization: Types.ObjectId;
  readonly role: string;
  readonly joinedAt: Date;
  readonly active: boolean;
}

/**
 * Refresh token interface
 */
export interface IRefreshToken extends IBaseModel {
  readonly token: string;
  readonly user: Types.ObjectId;
  expiresAt: Date;
  readonly clientId: string;
  readonly userAgent: string;
  readonly ipAddress: string;
  readonly isRevoked: boolean;
  readonly revokedAt?: Date;
}

/**
 * Role interface
 */
export interface IRole extends IBaseModel {
  readonly name: string;
  readonly description: string;
  readonly permissions: string[];
  readonly organizationId?: Types.ObjectId;
}

/**
 * Certificate interface
 */
export interface ICertificate extends IBaseModel {
  readonly user: Types.ObjectId;
  readonly name: string;
  readonly issuingBody: string;
  readonly dateObtained: Date;
  readonly expirationDate?: Date;
  readonly verificationLink?: string;
  readonly certificateNumber?: string;
  readonly media?: Types.ObjectId;
  readonly documentUrl?: string;
  readonly isVerified: boolean;
  readonly verifiedBy?: Types.ObjectId;
  readonly verifiedAt?: Date;
}

/**
 * Device token interface for push notifications
 */
export interface IDeviceToken extends IBaseModel {
  readonly user: Types.ObjectId;
  readonly token: string;
  readonly deviceType: 'ios' | 'android' | 'web';
  readonly deviceId?: string;
  readonly isActive: boolean;
  readonly lastUsed?: Date;
}

/**
 * Notification settings interface (extended from common)
 */
export interface IUserNotificationSettings extends IBaseModel {
  readonly user: Types.ObjectId;
  readonly workoutReminders: boolean;
  readonly achievementAlerts: boolean;
  readonly newMessages: boolean;
  readonly systemAnnouncements: boolean;
  readonly programUpdates: boolean;
  readonly trainerFeedback: boolean;
  readonly dailySummary: boolean;
  readonly marketingEmails: boolean;
  readonly mobileEnabled: boolean;
  readonly emailEnabled: boolean;
  readonly webEnabled: boolean;
  readonly quietHoursStart?: number;
  readonly quietHoursEnd?: number;
  readonly customCategories?: Map<string, boolean>;
}
