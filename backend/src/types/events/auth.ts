/**
 * Represents information about the device used for authentication
 */
export interface DeviceInfo {
  type: string;
  os?: string;
  client?: string;
  ip?: string;
  userAgent?: string;
  deviceId?: string;
}

/**
 * Metadata specific to authentication events
 */
export interface AuthMetadata {
  method: string;
  provider?: string;
  timestamp: Date;
  success: boolean;
  error?: string;
  factors?: string[];
}