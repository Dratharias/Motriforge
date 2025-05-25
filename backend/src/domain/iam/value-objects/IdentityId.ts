import { Types } from 'mongoose';
import { IdentityId as IIdentityId } from '@/types/iam/interfaces';

export class IdentityId implements IIdentityId {
  constructor(public readonly value: Types.ObjectId) {
    if (!Types.ObjectId.isValid(value)) {
      throw new Error('Invalid identity ID format');
    }
  }

  static generate(): IdentityId {
    return new IdentityId(new Types.ObjectId());
  }

  static fromString(id: string): IdentityId {
    return new IdentityId(new Types.ObjectId(id));
  }

  equals(other: IdentityId): boolean {
    return this.value.equals(other.value);
  }

  toString(): string {
    return this.value.toString();
  }
}

