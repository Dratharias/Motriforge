import bcrypt from 'bcrypt';
import { IPasswordHasher } from '@/domain/iam/ports/IPasswordHasher';

export class BcryptPasswordAdapter implements IPasswordHasher {
  private readonly saltRounds: number;

  constructor(saltRounds: number = 12) {
    this.saltRounds = saltRounds;
  }

  async hash(password: string): Promise<string> {
    return await bcrypt.hash(password, this.saltRounds);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  needsRehash(hash: string): boolean {
    // Extract salt rounds from hash and compare with current setting
    try {
      const rounds = parseInt(hash.split('$')[2]);
      return rounds < this.saltRounds;
    } catch {
      return true; // If we can't parse, assume it needs rehashing
    }
  }
}

