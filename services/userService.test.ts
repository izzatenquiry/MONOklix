// Nota: Fail ini adalah untuk tujuan demonstrasi ujian dan memerlukan persekitaran ujian seperti Jest untuk dijalankan.

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
      (mockSignUp as jest.Mock).mockResolvedValueOnce({
        data: { user: { id: '123' }, session: {} },
        error: null,
      });
      // FIX: Cast mock functions to jest.Mock to resolve 'never' type errors.
      (mockInsert as jest.Mock).mockResolvedValueOnce({ error: null });

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
      (mockSignUp as jest.Mock).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      const result = await registerUser('testuser', 'test@example.com', '123');
      
      expect(result.success).toBe(false);
      // FIX: Added a type guard to correctly handle the discriminated union return type.
      if (!result.success) {
        expect(result.message).toBe('User already registered');
      }
    });

    it('should fail if any field is empty', async () => {
      const result = await registerUser('', 'email@test.com', '123');
      expect(result.success).toBe(false);
      // FIX: Added a type guard to correctly handle the discriminated union return type.
      if (!result.success) {
        expect(result.message).toBe('Semua medan diperlukan.');
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
      (mockSingle as jest.Mock).mockResolvedValueOnce({ data: mockProfile, error: null });

      const result = await loginUser('test@example.com');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.id).toBe('user-123');
        expect(result.user.email).toBe('test@example.com');
      }
    });

    it('should fail to log in if user is not found', async () => {
      // FIX: Cast mock functions to jest.Mock to resolve 'never' type errors.
      (mockSingle as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'user not found' },
      });

      const result = await loginUser('test@example.com');

      expect(result.success).toBe(false);
      // FIX: Added a type guard to correctly handle the `LoginResult` discriminated union type,
      // ensuring `result.message` is only accessed on a failed login attempt.
      if (!result.success) {
        expect(result.message).toBe('E-mel tidak ditemui. Sila daftar jika anda pengguna baru.');
      }
    });
  });
});