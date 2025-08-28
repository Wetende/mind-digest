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
    // Suppress console logs during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe('signUp', () => {
    it('should successfully sign up a user', async () => {
      const mockUser = { id: 'user123', email: 'test@example.com' };
      supabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authService.signUp('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.data.user).toEqual(mockUser);
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: { data: {} },
      });
    });

    it('should handle sign up errors with user-friendly messages', async () => {
      supabase.auth.signUp.mockResolvedValue({
        data: null,
        error: { message: 'User already registered' },
      });

      const result = await authService.signUp('test@example.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('An account with this email already exists. Please sign in instead.');
    });

    it('should handle password validation errors', async () => {
      supabase.auth.signUp.mockResolvedValue({
        data: null,
        error: { message: 'Password should be at least 6 characters' },
      });

      const result = await authService.signUp('test@example.com', '123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password must be at least 6 characters long.');
    });

    it('should handle invalid email errors', async () => {
      supabase.auth.signUp.mockResolvedValue({
        data: null,
        error: { message: 'Invalid email' },
      });

      const result = await authService.signUp('invalid-email', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Please enter a valid email address.');
    });
  });

  describe('signIn', () => {
    it('should successfully sign in a user', async () => {
      const mockUser = { id: 'user123', email: 'test@example.com' };
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authService.signIn('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.data.user).toEqual(mockUser);
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should handle invalid credentials error', async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' },
      });

      const result = await authService.signIn('test@example.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password. Please check your credentials and try again.');
    });

    it('should handle email not confirmed error', async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Email not confirmed' },
      });

      const result = await authService.signIn('test@example.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Please check your email and click the confirmation link before signing in.');
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

  describe('signInAnonymously', () => {
    it('should create anonymous session', async () => {
      const result = await authService.signInAnonymously();

      expect(result.success).toBe(true);
      expect(result.data.user.isAnonymous).toBe(true);
      expect(result.data.user.email).toBe(null);
      expect(result.data.user.id).toMatch(/^anon_\d+_[a-z0-9]+$/);
    });
  });

  describe('signOut', () => {
    it('should successfully sign out', async () => {
      supabase.auth.signOut.mockResolvedValue({ error: null });

      const result = await authService.signOut();

      expect(result.success).toBe(true);
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle sign out errors', async () => {
      supabase.auth.signOut.mockResolvedValue({
        error: { message: 'Sign out failed' },
      });

      const result = await authService.signOut();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sign out failed');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user with valid session', async () => {
      const mockUser = { id: 'user123', email: 'test@example.com' };
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

    it('should return null user when no session', async () => {
      const mockUser = { id: 'user123', email: 'test@example.com' };

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
      expect(result.user).toBe(null);
    });

    it('should handle errors', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: null,
        error: { message: 'User fetch failed' },
      });

      const result = await authService.getCurrentUser();

      expect(result.success).toBe(false);
      expect(typeof result.error).toBe('string');
    });
  });

  describe('updateProfile', () => {
    it('should successfully update user profile', async () => {
      const updates = { displayName: 'John Doe' };
      const mockData = { user: { id: 'user123', user_metadata: updates } };

      supabase.auth.updateUser.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await authService.updateProfile(updates);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({ data: updates });
    });

    it('should handle update errors', async () => {
      supabase.auth.updateUser.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      const result = await authService.updateProfile({ displayName: 'John' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('resetPassword', () => {
    it('should successfully send password reset email', async () => {
      supabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

      const result = await authService.resetPassword('test@example.com');

      expect(result.success).toBe(true);
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should handle reset password errors', async () => {
      supabase.auth.resetPasswordForEmail.mockResolvedValue({
        error: { message: 'Reset failed' },
      });

      const result = await authService.resetPassword('test@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Reset failed');
    });
  });

  describe('onAuthStateChange', () => {
    it('should set up auth state change listener', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();
      
      supabase.auth.onAuthStateChange.mockReturnValue(mockUnsubscribe);

      const result = authService.onAuthStateChange(mockCallback);

      expect(supabase.auth.onAuthStateChange).toHaveBeenCalledWith(mockCallback);
      expect(result).toBe(mockUnsubscribe);
    });
  });
});