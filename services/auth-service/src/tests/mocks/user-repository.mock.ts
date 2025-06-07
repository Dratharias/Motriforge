import { vi } from 'vitest'
import { User } from '@/prisma/generated'

export const mockUser: User & { password?: string } = {
  id: 'user-123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  password: '$2b$12$hashed_password',
  dateOfBirth: null,
  notes: null,
  ageRange: null,
  visibilityId: 'vis-123',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  lastLogin: null,
  createdBy: null,
}

export const createMockUserRepository = () => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  updateUserLastLogin: vi.fn(),
  isEmailAvailable: vi.fn(),
})