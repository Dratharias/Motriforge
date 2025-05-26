import { IAccessControlRepository } from "@/domain/iam/ports/IAccessControlRepository";
import { IDeviceRepository } from "@/domain/iam/ports/IDeviceRepository";
import { IIdentityRepository } from "@/domain/iam/ports/IIdentityRepository";
import { IPermissionRepository } from "@/domain/iam/ports/IPermissionRepository";
import { IRoleRepository } from "@/domain/iam/ports/IRoleRepository";
import { ISessionRepository } from "@/domain/iam/ports/ISessionRepository";
import { MongoAccessControlRepository } from "../repositories/MongoAccessControlRepository";
import { MongoDeviceRepository } from "../repositories/MongoDeviceRepository";
import { MongoIdentityRepository } from "../repositories/MongoIdentityRepository";
import { MongoPermissionRepository } from "../repositories/MongoPermissionRepository";
import { MongoRoleRepository } from "../repositories/MongoRoleRepository";
import { MongoSessionRepository } from "../repositories/MongoSessionRepository";
import { IdentityModel, SessionModel, AccessControlModel, RoleModel, PermissionModel, DeviceModel } from "../schemas";

export interface IAMRepositories {
  identityRepository: IIdentityRepository;
  sessionRepository: ISessionRepository;
  accessControlRepository: IAccessControlRepository;
  roleRepository: IRoleRepository;
  permissionRepository: IPermissionRepository;
  deviceRepository: IDeviceRepository;
}

export class RepositoryFactory {
  static create(): IAMRepositories {
    return {
      identityRepository: new MongoIdentityRepository(IdentityModel),
      sessionRepository: new MongoSessionRepository(SessionModel),
      accessControlRepository: new MongoAccessControlRepository(AccessControlModel),
      roleRepository: new MongoRoleRepository(RoleModel),
      permissionRepository: new MongoPermissionRepository(PermissionModel),
      deviceRepository: new MongoDeviceRepository(DeviceModel)
    };
  }
}