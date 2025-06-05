import bcrypt from 'bcryptjs';
import { authConfig } from '@/config/auth';
import { ValidationResult } from '@/shared/types/auth';

export class PasswordManager {
  private readonly saltRounds: number;
  private readonly config: typeof authConfig.password;

  constructor() {
    this.saltRounds = authConfig.bcrypt.saltRounds;
    this.config = authConfig.password;
  }

  async hashPassword(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(this.saltRounds);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      throw new Error(`Failed to hash password: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      throw new Error(`Failed to verify password: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  validatePasswordStrength(password: string): ValidationResult {
    const errors: string[] = [];

    if (password.length < this.config.minLength) {
      errors.push(`Password must be at least ${this.config.minLength} characters long`);
    }

    if (this.config.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (this.config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (this.config.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (this.config.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  generateSalt(): string {
    return bcrypt.genSaltSync(this.saltRounds);
  }
}