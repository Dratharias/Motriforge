import { describe, it, expect } from 'vitest';

describe('Test Setup', () => {
  it('should run basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('should create mock data', () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date(),
      isActive: true,
    };

    const mockEvent = {
      id: 'test-event-id',
      actorId: 'test-actor-id',
      actionId: 'test-action-id',
      scopeId: 'test-scope-id',
      targetId: 'test-target-id',
      eventData: { test: 'data' },
      occurredAt: new Date(),
    };

    expect(mockUser.id).toBe('test-user-id');
    expect(mockUser.email).toBe('test@example.com');
    expect(mockEvent.eventData).toEqual({ test: 'data' });
  });
});