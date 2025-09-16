// Note: This file is for testing demonstration purposes and requires a test environment like Jest to run.

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// FIX: Cast mock functions to jest.Mock to resolve 'never' type errors.
const mockSignUp = jest.fn() as jest.Mock;
const mockInsert = jest.fn() as jest.Mock;
const mockSingle = jest.fn() as jest.Mock;
const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

const mockFrom = jest.fn().mockReturnValue({
  insert: mockInsert,
  select: mockSelect,
});

jest.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      signUp: mockSignUp,
    },
    from: mockFrom,
  },
}));

import {
  registerUser,
  loginUser,
} from './userService';

describe('userService with Supabase', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      // FIX: Cast mock functions to jest.Mock to resolve 'never' type errors.
      mockSignUp.mockResolvedValueOnce({
        data: { user: { id: '123' }, session: {} },
        error: null,
      } as any);
      // FIX: Cast mock functions to jest.Mock to resolve 'never' type errors.
      mockInsert.mockResolvedValueOnce({ error: null } as any);

      const result = await registerUser('newuser', 'new@example.com', '0123456789');

      expect(result.success).toBe(true);
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: expect.any(String),
      });
      // Check if a profile was created
      expect(mockFrom).toHaveBeenCalledWith('users');
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        id: '123',
        full_name: 'newuser',
        email: 'new@example.com'
      }));
    });

    it('should fail if Supabase auth returns an error', async () => {
      // FIX: Cast mock functions to jest.Mock to resolve 'never' type errors.
      mockSignUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      } as any);

      const result = await registerUser('testuser', 'test@example.com', '123');
      
      expect(result.success).toBe(false);
      // Fix: Added a type guard to safely access 'message' property on failed result.
      if (result.success === false) {
        expect(result.message).toBe('User already registered');
      }
    });

    it('should fail if any field is empty', async () => {
      const result = await registerUser('', 'email@test.com', '123');
      expect(result.success).toBe(false);
      // Fix: Added a type guard to safely access 'message' property on failed result.
      if (result.success === false) {
        expect(result.message).toBe('All fields are required.');
      }
    });
  });

  describe('loginUser', () => {
    it('should log in a user successfully if they exist', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        phone: '12345',
        role: 'user' as const,
        status: 'trial',
        api_key: null,
        avatar_url: null,
        created_at: new Date().toISOString(),
        subscription_expiry: new Date().toISOString()
      };
      // FIX: Cast mock functions to jest.Mock to resolve 'never' type errors.
      mockSingle.mockResolvedValueOnce({ data: mockProfile, error: null } as any);

      const result = await loginUser('test@example.com');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.id).toBe('user-123');
        expect(result.user.email).toBe('test@example.com');
      }
    });

    it('should fail to log in if user is not found', async () => {
      // FIX: Cast mock functions to jest.Mock to resolve 'never' type errors.
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'user not found' },
      } as any);

      const result = await loginUser('test@example.com');

      expect(result.success).toBe(false);
      // Fix: Added a type guard to safely access 'message' property on failed result.
      if (result.success === false) {
        expect(result.message).toBe('Email not found. Please register if you are a new user.');
      }
    });
  });
});