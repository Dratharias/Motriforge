
import { Model } from 'mongoose';
import { 
  IdentityDocument, 
  SessionDocument, 
  AccessControlDocument, 
  RoleDocument, 
  PermissionDocument, 
  DeviceDocument, 
  AuditLogDocument, 
  PolicyDocument 
} from './DocumentInterfaces';

export type IIdentityModel = Model<IdentityDocument>;
export type ISessionModel = Model<SessionDocument>;
export type IAccessControlModel = Model<AccessControlDocument>;
export type IRoleModel = Model<RoleDocument>;
export type IPermissionModel = Model<PermissionDocument>;
export type IDeviceModel = Model<DeviceDocument>;
export type IAuditLogModel = Model<AuditLogDocument>;
export type IPolicyModel = Model<PolicyDocument>;