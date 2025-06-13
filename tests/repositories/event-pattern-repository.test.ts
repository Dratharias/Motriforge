import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { db } from '../../backend/database/connection';
import {
  EventActorRepository,
  EventActionRepository,
  EventScopeRepository,
  EventTargetRepository
} from '../../backend/repositories/observability/event-pattern-repository';
import { eventActorType, eventActionType, eventScopeType, eventTargetType } from '../../backend/database/schema';
import { eq } from 'drizzle-orm';

describe('Event Pattern Repositories', () => {
  let actorRepo: EventActorRepository;
  let actionRepo: EventActionRepository;
  let scopeRepo: EventScopeRepository;
  let targetRepo: EventTargetRepository;

  beforeAll(() => {
    actorRepo = new EventActorRepository(db);
    actionRepo = new EventActionRepository(db);
    scopeRepo = new EventScopeRepository(db);
    targetRepo = new EventTargetRepository(db);
  });

  beforeEach(async () => {
    // Clean up test data
    await Promise.all([
      db.delete(eventActorType).where(eq(eventActorType.createdBy, 'test')),
      db.delete(eventActionType).where(eq(eventActionType.createdBy, 'test')),
      db.delete(eventScopeType).where(eq(eventScopeType.createdBy, 'test')),
      db.delete(eventTargetType).where(eq(eventTargetType.createdBy, 'test'))
    ]);
  });

  it('should create and find actor by name', async () => {
    const testActor = {
      name: 'test-actor',
      displayName: 'Test Actor',
      description: 'Test actor description',
      createdBy: 'test',
      isActive: true
    };

    const created = await actorRepo.create(testActor);
    expect(created.name).toBe('test-actor');

    const found = await actorRepo.findByName('test-actor');
    expect(found).toBeDefined();
    expect(found?.displayName).toBe('Test Actor');
  });

  it('should create and find action by name', async () => {
    const testAction = {
      name: 'test-action',
      displayName: 'Test Action',
      description: 'Test action description',
      createdBy: 'test',
      isActive: true
    };

    await actionRepo.create(testAction);
    const found = await actionRepo.findByName('test-action');
    expect(found).toBeDefined();
    expect(found?.name).toBe('test-action');
  });

  it('should create and find scope by name', async () => {
    const testScope = {
      name: 'test-scope',
      displayName: 'Test Scope',
      description: 'Test scope description',
      createdBy: 'test',
      isActive: true
    };

    await scopeRepo.create(testScope);
    const found = await scopeRepo.findByName('test-scope');
    expect(found).toBeDefined();
    expect(found?.name).toBe('test-scope');
  });

  it('should create and find target by name', async () => {
    const testTarget = {
      name: 'test-target',
      displayName: 'Test Target',
      description: 'Test target description',
      createdBy: 'test',
      isActive: true
    };

    await targetRepo.create(testTarget);
    const found = await targetRepo.findByName('test-target');
    expect(found).toBeDefined();
    expect(found?.name).toBe('test-target');
  });
});