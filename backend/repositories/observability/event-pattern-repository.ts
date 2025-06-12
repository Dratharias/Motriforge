
import { Database } from '~/database/connection';
import { eventActorType, eventActionType, eventScopeType, eventTargetType } from '~/database/schema';
import { BaseRepository } from '../base-repository';
import { eq } from 'drizzle-orm';

export interface EventActorType {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
}

export interface EventActionType {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
}

export interface EventScopeType {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
}

export interface EventTargetType {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
}

export class EventActorRepository extends BaseRepository<EventActorType, typeof eventActorType> {
  constructor(db: Database) {
    super(db, eventActorType);
  }

  async findByName(name: string): Promise<EventActorType | null> {
    const result = await this.db
      .select()
      .from(eventActorType)
      .where(eq(eventActorType.name, name))
      .limit(1);

    return result[0] as EventActorType || null;
  }
}

export class EventActionRepository extends BaseRepository<EventActionType, typeof eventActionType> {
  constructor(db: Database) {
    super(db, eventActionType);
  }

  async findByName(name: string): Promise<EventActionType | null> {
    const result = await this.db
      .select()
      .from(eventActionType)
      .where(eq(eventActionType.name, name))
      .limit(1);

    return result[0] as EventActionType || null;
  }
}

export class EventScopeRepository extends BaseRepository<EventScopeType, typeof eventScopeType> {
  constructor(db: Database) {
    super(db, eventScopeType);
  }

  async findByName(name: string): Promise<EventScopeType | null> {
    const result = await this.db
      .select()
      .from(eventScopeType)
      .where(eq(eventScopeType.name, name))
      .limit(1);

    return result[0] as EventScopeType || null;
  }
}

export class EventTargetRepository extends BaseRepository<EventTargetType, typeof eventTargetType> {
  constructor(db: Database) {
    super(db, eventTargetType);
  }

  async findByName(name: string): Promise<EventTargetType | null> {
    const result = await this.db
      .select()
      .from(eventTargetType)
      .where(eq(eventTargetType.name, name))
      .limit(1);

    return result[0] as EventTargetType || null;
  }
}