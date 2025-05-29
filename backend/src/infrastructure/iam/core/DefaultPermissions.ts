import { Role, ResourceType, Action } from '../../../types/core/enums';
import { IResourcePermission } from '../../../types/core/interfaces';

export class DefaultPermissions {
  static getForRole(role: Role): readonly IResourcePermission[] {
    switch (role) {
      case Role.ADMIN:
        return [
          { resource: ResourceType.EXERCISE, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.SHARE] },
          { resource: ResourceType.WORKOUT, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.SHARE] },
          { resource: ResourceType.PROGRAM, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.SHARE] },
          { resource: ResourceType.PROFILE, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE] }
        ];

      case Role.TRAINER:
        return [
          { resource: ResourceType.EXERCISE, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.SHARE] },
          { resource: ResourceType.WORKOUT, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.SHARE] },
          { resource: ResourceType.PROGRAM, actions: [Action.READ, Action.SHARE] },
          { resource: ResourceType.PROFILE, actions: [Action.READ] }
        ];

      case Role.CLIENT:
        return [
          { resource: ResourceType.EXERCISE, actions: [Action.READ] },
          { resource: ResourceType.WORKOUT, actions: [Action.READ] },
          { resource: ResourceType.PROGRAM, actions: [Action.READ] },
          { resource: ResourceType.PROFILE, actions: [Action.READ, Action.UPDATE] }
        ];

      case Role.MANAGER:
        return [
          { resource: ResourceType.EXERCISE, actions: [Action.READ, Action.SHARE] },
          { resource: ResourceType.WORKOUT, actions: [Action.READ, Action.SHARE] },
          { resource: ResourceType.PROGRAM, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.SHARE] },
          { resource: ResourceType.PROFILE, actions: [Action.READ] }
        ];

      case Role.GUEST:
        return [
          { resource: ResourceType.DASHBOARD, actions: [Action.READ] }
        ];

      default:
        return [];
    }
  }

  static createDescription(role: Role): string {
    return `Default permissions for ${role} role`;
  }
}