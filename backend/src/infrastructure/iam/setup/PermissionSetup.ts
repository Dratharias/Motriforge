import { Role } from '../../../types/core/enums';
import { IPermissionRepository } from '../core/interfaces';
import { PermissionSet } from '../core/PermissionSet';
import { DefaultPermissions } from '../core/DefaultPermissions';

export class PermissionSetup {
  constructor(private readonly repository: IPermissionRepository) {}

  async setupDefaultPermissions(): Promise<void> {
    const roles = [Role.ADMIN, Role.TRAINER, Role.CLIENT, Role.MANAGER, Role.GUEST];

    for (const role of roles) {
      try {
        const existing = await this.repository.findByRole(role);
        if (existing) {
          console.log(`Permissions for ${role} already exist, skipping...`);
          continue;
        }

        const permissions = DefaultPermissions.getForRole(role);
        const description = DefaultPermissions.createDescription(role);

        const permissionSet = new PermissionSet({
          role,
          permissions,
          description,
          isActive: true
        });

        await this.repository.create(permissionSet);
        console.log(`Created default permissions for ${role}`);
      } catch (error) {
        console.error(`Failed to setup permissions for ${role}:`, error);
      }
    }
  }

  async validatePermissions(): Promise<boolean> {
    const roles = [Role.ADMIN, Role.TRAINER, Role.CLIENT, Role.MANAGER, Role.GUEST];
    
    for (const role of roles) {
      const permissionSet = await this.repository.findByRole(role);
      if (!permissionSet) {
        console.error(`Missing permissions for role: ${role}`);
        return false;
      }
      
      if (!permissionSet.isActive) {
        console.error(`Permissions for role ${role} are inactive`);
        return false;
      }
    }

    console.log('All permission sets validated successfully');
    return true;
  }
}



