
import { RoleName as IRoleName } from '@/types/iam/interfaces';

export class RoleName implements IRoleName {
  constructor(
    public readonly value: string,
    public readonly scope?: string
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.value || this.value.trim().length === 0) {
      throw new Error('Role name cannot be empty');
    }
    
    if (this.value.length < 2 || this.value.length > 100) {
      throw new Error('Role name must be between 2 and 100 characters');
    }
    
    if (!/^[a-zA-Z0-9_\-\s]+$/.test(this.value)) {
      throw new Error('Role name contains invalid characters');
    }

    if (this.scope && this.scope.length > 50) {
      throw new Error('Role scope must be 50 characters or less');
    }
  }

  getFullName(): string {
    return this.scope ? `${this.value}@${this.scope}` : this.value;
  }

  equals(other: RoleName): boolean {
    return this.value === other.value && this.scope === other.scope;
  }
}