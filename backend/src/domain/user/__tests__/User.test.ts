import { describe, it, expect, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { User } from '../entities/User.js';
import { Role, Status, ResourceType, Action } from '../../../types/core/enums.js';

describe('User Entity', () => {
  let userData: any;
  let user: User;

  beforeEach(() => {
    userData = {
      id: new Types.ObjectId(),
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: Role.CLIENT,
      status: Status.ACTIVE,
      organization: new Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: new Types.ObjectId(),
      isActive: true
    };
    user = new User(userData);
  });

  it('should create user with all properties', () => {
    expect(user.id).toBe(userData.id);
    expect(user.email).toBe(userData.email);
    expect(user.firstName).toBe(userData.firstName);
    expect(user.lastName).toBe(userData.lastName);
    expect(user.role).toBe(userData.role);
    expect(user.status).toBe(userData.status);
    expect(user.isActive).toBe(true);
    expect(user.isDraft).toBe(false);
  });

  it('should get full name correctly', () => {
    expect(user.getFullName()).toBe('John Doe');
  });

  it('should get display name with role prefix', () => {
    const trainerUser = new User({ ...userData, role: Role.TRAINER });
    const adminUser = new User({ ...userData, role: Role.ADMIN });
    
    expect(user.getDisplayName()).toBe('John Doe');
    expect(trainerUser.getDisplayName()).toBe('Trainer: John Doe');
    expect(adminUser.getDisplayName()).toBe('Admin: John Doe');
  });

  it('should check if user is active correctly', () => {
    expect(user.isUserActive()).toBe(true);
    
    const inactiveUser = new User({ ...userData, isActive: false });
    expect(inactiveUser.isUserActive()).toBe(false);
    
    const suspendedUser = new User({ ...userData, status: Status.SUSPENDED });
    expect(suspendedUser.isUserActive()).toBe(false);
  });

  it('should update last active timestamp', () => {
    const originalTime = user.lastActiveAt;
    const updatedUser = user.updateLastActive();
    
    expect(updatedUser.lastActiveAt).toBeDefined();
    expect(updatedUser.lastActiveAt).not.toBe(originalTime);
    expect(updatedUser.updatedAt).toBeDefined();
  });

  describe('Access Control', () => {
    it('should allow admin full access', () => {
      const admin = new User({ ...userData, role: Role.ADMIN });
      
      expect(admin.canAccess(ResourceType.EXERCISE, Action.DELETE)).toBe(true);
      expect(admin.canAccess(ResourceType.PROGRAM, Action.CREATE)).toBe(true);
      expect(admin.canAccess(ResourceType.PROFILE, Action.UPDATE)).toBe(true);
    });

    it('should restrict client access appropriately', () => {
      const client = new User({ ...userData, role: Role.CLIENT });
      
      expect(client.canAccess(ResourceType.PROFILE, Action.READ)).toBe(true);
      expect(client.canAccess(ResourceType.PROFILE, Action.UPDATE)).toBe(true);
      expect(client.canAccess(ResourceType.EXERCISE, Action.DELETE)).toBe(false);
      expect(client.canAccess(ResourceType.PROGRAM, Action.CREATE)).toBe(false);
    });

    it('should restrict guest access to read-only dashboard', () => {
      const guest = new User({ ...userData, role: Role.GUEST });
      
      expect(guest.canAccess(ResourceType.DASHBOARD, Action.READ)).toBe(true);
      expect(guest.canAccess(ResourceType.DASHBOARD, Action.UPDATE)).toBe(false);
      expect(guest.canAccess(ResourceType.PROFILE, Action.READ)).toBe(false);
    });
  });

  it('should determine assignment capabilities correctly', () => {
    const client = new User({ ...userData, role: Role.CLIENT });
    const trainer = new User({ ...userData, role: Role.TRAINER });
    const inactiveClient = new User({ ...userData, role: Role.CLIENT, isActive: false });
    
    expect(client.canBeAssigned()).toBe(true);
    expect(trainer.canBeAssigned()).toBe(false);
    expect(inactiveClient.canBeAssigned()).toBe(false);
    
    expect(client.canAssignToOthers()).toBe(false);
    expect(trainer.canAssignToOthers()).toBe(true);
  });

  it('should update user properties correctly', () => {
    const updates = {
      firstName: 'Jane',
      email: 'jane@example.com',
      role: Role.TRAINER
    };
    
    const updatedUser = user.update(updates);
    
    expect(updatedUser.firstName).toBe('Jane');
    expect(updatedUser.email).toBe('jane@example.com');
    expect(updatedUser.role).toBe(Role.TRAINER);
    expect(updatedUser.lastName).toBe(userData.lastName); // Unchanged
    expect(updatedUser.updatedAt).not.toBe(userData.updatedAt);
  });
});

