
import { PermissionName as IPermissionName } from '@/types/iam/interfaces';

export class PermissionName implements IPermissionName {
  constructor(
    public readonly value: string,
    public readonly resource: string,
    public readonly action: string
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.value || this.value.trim().length === 0) {
      throw new Error('Permission name cannot be empty');
    }
    
    if (!this.resource || this.resource.trim().length === 0) {
      throw new Error('Permission resource cannot be empty');
    }
    
    if (!this.action || this.action.trim().length === 0) {
      throw new Error('Permission action cannot be empty');
    }
    
    if (this.value.length < 2 || this.value.length > 100) {
      throw new Error('Permission name must be between 2 and 100 characters');
    }
    
    if (!/^[a-zA-Z0-9_\-.]+$/.test(this.value)) {
      throw new Error('Permission name contains invalid characters');
    }
    
    if (!/^[a-zA-Z0-9_\-./]+$/.test(this.resource)) {
      throw new Error('Permission resource contains invalid characters');
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(this.action)) {
      throw new Error('Permission action contains invalid characters');
    }
  }

  getFullName(): string {
    return `${this.resource}:${this.action}`;
  }

  equals(other: PermissionName): boolean {
    return this.value === other.value && 
           this.resource === other.resource && 
           this.action === other.action;
  }
}