import authService from '../../src/services/authService';
import { supabase } from '../../src/config/supabase';

// Mock Supabase
jest.mock('../../src/config/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      updateUser: jest.fn(),
      resetPasswordForEmail: jest.fn(),
    },
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('should successfully sign up a user', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      const mockData = { user: mockUser };
      
      supabase.auth.signUp.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await authService.signUp('test@example.com', 'password123', {
        display_name: 'Test User',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: { display_name: 'Test User' },
        },
      });
    });

    it('should handle sign up errors', async () => {
      const mockError = { message: 'User already registered' };
      
      supabase.auth.signUp.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await authService.signUp('test@example.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('An account with this email already exists. Please sign in instead.');
    });

    it('should handle weak password error', async () => {
      const mockError = { message: 'Password should be at least 6 characters' };
      
      supabase.auth.signUp.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await authService.signUp('test@example.com', '123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password must be at least 6 characters long.');
    });
  });

  describe('signIn', () => {
    it('should successfully sign in a user', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      const mockData = { user: mockUser };
      
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await authService.signIn('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should handle invalid credentials error', async () => {
      const mockError = { message: 'Invalid login credentials' };
      
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await authService.signIn('test@example.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password. Please check your credentials and try again.');
    });

    it('should handle missing user data', async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await authService.signIn('test@example.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sign in failed. Please try again.');
    });
  });

  describe('signOut', () => {
    it('should successfully sign out', async () => {
      supabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      const result = await authService.signOut();

      expect(result.success).toBe(true);
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle sign out errors', async () => {
      const mockError = { message: 'Sign out failed' };
      
      supabase.auth.signOut.mockResolvedValue({
        error: mockError,
      });

      const result = await authService.signOut();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sign out failed');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user when authenticated', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      const mockSession = { access_token: 'token123' };
      
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      
      supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await authService.getCurrentUser();

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
    });

    it('should return null when no session exists', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await authService.getCurrentUser();

      expect(result.success).toBe(true);
      expect(result.user).toBeNull();
    });
  });

  describe('signInAnonymously', () => {
    it('should create anonymous session', async () => {
      const result = await authService.signInAnonymously();

      expect(result.success).toBe(true);
      expect(result.data.user.isAnonymous).toBe(true);
      expect(result.data.user.id).toMatch(/^anon_/);
    });
  });

  describe('updateProfile', () => {
    it('should successfully update user profile', async () => {
      const mockUpdatedUser = { id: '123', email: 'test@example.com' };
      const mockData = { user: mockUpdatedUser };
      
      supabase.auth.updateUser.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const updates = { display_name: 'Updated Name' };
      const result = await authService.updateProfile(updates);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        data: updates,
      });
    });
  });

  describe('resetPassword', () => {
    it('should successfully send reset password email', async () => {
      supabase.auth.resetPasswordForEmail.mockResolvedValue({
        error: null,
      });

      const result = await authService.resetPassword('test@example.com');

      expect(result.success).toBe(true);
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com');
    });
  });
});