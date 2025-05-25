import { Username as IUsername } from '@/types/iam/interfaces';

export class Username implements IUsername {
  constructor(
    public readonly value: string,
    public readonly domain?: string
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.value || this.value.trim().length === 0) {
      throw new Error('Username cannot be empty');
    }
    
    if (this.value.length < 3 || this.value.length > 50) {
      throw new Error('Username must be between 3 and 50 characters');
    }
    
    if (!/^[a-zA-Z0-9._-]+$/.test(this.value)) {
      throw new Error('Username contains invalid characters');
    }
  }

  getFullUsername(): string {
    return this.domain ? `${this.value}@${this.domain}` : this.value;
  }

  equals(other: Username): boolean {
    return this.value === other.value && this.domain === other.domain;
  }
}

