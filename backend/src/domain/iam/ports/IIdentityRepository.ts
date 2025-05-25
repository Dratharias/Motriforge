import { Types } from 'mongoose';
import { Identity } from '../entities/Identity';
import { IdentityAggregate } from '../aggregates/IdentityAggregate';

export interface IIdentityRepository {
  findById(id: Types.ObjectId): Promise<Identity | null>;
  findByUsername(username: string): Promise<Identity | null>;
  findByEmail(email: string): Promise<Identity | null>;
  findByUsernameOrEmail(usernameOrEmail: string): Promise<Identity | null>;
  save(identity: Identity): Promise<void>;
  saveAggregate(aggregate: IdentityAggregate): Promise<void>;
  delete(id: Types.ObjectId): Promise<void>;
  exists(id: Types.ObjectId): Promise<boolean>;
  findAll(skip?: number, limit?: number): Promise<Identity[]>;
  countAll(): Promise<number>;
  findByStatus(status: import('@/types/iam/interfaces').IdentityStatus): Promise<Identity[]>;
}

