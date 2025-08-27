import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';
import { authService } from '../../src/services';
import * as storageUtils from '../../src/utils/storageUtils';

// Mock dependencies
jest.mock('../../src/services', () => ({
  authService: {
    getCurrentUser: jest.fn(),
    signUp: jest.fn(),
    signIn: jest.fn(),
    signInAnonymously: jest.fn(),
    signOut: jest.fn(),
    updateProfile: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
}));

jest.mock('../../src/utils/storageUtils', () => ({
  getAnonymousSession: jest.fn(),
  storeAnonymousSession: jest.fn(),
  clearAnonymousSession: jest.fn(),
}));

// Test component to access auth context
const TestComponent = ({ onAuthData }) => {
  const auth = useAuth();
  React.useEffect(() => {
    onAuthData(auth);
  }, [auth, onAuthData]);
  return null;
};

describe('AuthContext', () => {
  let authData;
  const mockOnAuthData = jest.fn((data) => {
    authData = data;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    authData = null;
    
    // Mock auth state change subscription
    authService.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: jest.fn(),
        },
      },
    });
  });

  describe('initialization', () => {
    it('should initialize with loading state', async () => {
      authService.getCurrentUser.mockResolvedValue({
        success: false,
        user: null,
      });
      
      storageUtils.getAnonymousSession.mockResolvedValue(null);

      render(
        <AuthProvider>
          <TestComponent onAuthData={mockOnAuthData} />
        </AuthProvider>
      );

      expect(authData.loading).toBe(true);
      
      await waitFor(() => {
        expect(authData.loading).toBe(false);
      });
    });

    it('should initialize with existing user', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      
      authService.getCurrentUser.mockResolvedValue({
        success: true,
        user: mockUser,
      });

      render(
        <AuthProvider>
          <TestComponent onAuthData={mockOnAuthData} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authData.user).toEqual(mockUser);
        expect(authData.isAnonymous).toBe(false);
        expect(authData.loading).toBe(false);
      });
    });

    it('should initialize with anonymous session', async () => {
      const mockAnonymousUser = { id: 'anon_123', isAnonymous: true };
      
      authService.getCurrentUser.mockResolvedValue({
        success: false,
        user: null,
      });
      
      storageUtils.getAnonymousSession.mockResolvedValue(mockAnonymousUser);

      render(
        <AuthProvider>
          <TestComponent onAuthData={mockOnAuthData} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authData.user).toEqual(mockAnonymousUser);
        expect(authData.isAnonymous).toBe(true);
        expect(authData.loading).toBe(false);
      });
    });
  });

  describe('signUp', () => {
    it('should successfully sign up user', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      
      authService.getCurrentUser.mockResolvedValue({
        success: false,
        user: null,
      });
      
      storageUtils.getAnonymousSession.mockResolvedValue(null);
      
      authService.signUp.mockResolvedValue({
        success: true,
        data: { user: mockUser },
      });
      
      storageUtils.clearAnonymousSession.mockResolvedValue();

      render(
        <AuthProvider>
          <TestComponent onAuthData={mockOnAuthData} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authData.loading).toBe(false);
      });

      await act(async () => {
        const result = await authData.signUp('test@example.com', 'password123', {});
        expect(result.success).toBe(true);
      });

      expect(authData.user).toEqual(mockUser);
      expect(authData.isAnonymous).toBe(false);
    });
  });

  describe('signIn', () => {
    it('should successfully sign in user', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      
      authService.getCurrentUser.mockResolvedValue({
        success: false,
        user: null,
      });
      
      storageUtils.getAnonymousSession.mockResolvedValue(null);
      
      authService.signIn.mockResolvedValue({
        success: true,
        data: { user: mockUser },
      });
      
      storageUtils.clearAnonymousSession.mockResolvedValue();

      render(
        <AuthProvider>
          <TestComponent onAuthData={mockOnAuthData} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authData.loading).toBe(false);
      });

      await act(async () => {
        const result = await authData.signIn('test@example.com', 'password123');
        expect(result.success).toBe(true);
      });

      expect(authData.user).toEqual(mockUser);
      expect(authData.isAnonymous).toBe(false);
    });
  });

  describe('signInAnonymously', () => {
    it('should successfully sign in anonymously', async () => {
      const mockAnonymousUser = { id: 'anon_123', isAnonymous: true };
      
      authService.getCurrentUser.mockResolvedValue({
        success: false,
        user: null,
      });
      
      storageUtils.getAnonymousSession.mockResolvedValue(null);
      
      authService.signInAnonymously.mockResolvedValue({
        success: true,
        data: { user: mockAnonymousUser },
      });
      
      storageUtils.storeAnonymousSession.mockResolvedValue();

      render(
        <AuthProvider>
          <TestComponent onAuthData={mockOnAuthData} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authData.loading).toBe(false);
      });

      await act(async () => {
        const result = await authData.signInAnonymously(['anxiety', 'depression']);
        expect(result.success).toBe(true);
      });

      expect(authData.isAnonymous).toBe(true);
    });
  });

  describe('signOut', () => {
    it('should successfully sign out authenticated user', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      
      authService.getCurrentUser.mockResolvedValue({
        success: true,
        user: mockUser,
      });
      
      authService.signOut.mockResolvedValue({
        success: true,
      });
      
      storageUtils.clearAnonymousSession.mockResolvedValue();

      render(
        <AuthProvider>
          <TestComponent onAuthData={mockOnAuthData} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authData.user).toEqual(mockUser);
        expect(authData.isAnonymous).toBe(false);
      });

      await act(async () => {
        const result = await authData.signOut();
        expect(result.success).toBe(true);
      });

      expect(authData.user).toBeNull();
      expect(authData.isAnonymous).toBe(false);
    });

    it('should successfully sign out anonymous user', async () => {
      const mockAnonymousUser = { id: 'anon_123', isAnonymous: true };
      
      authService.getCurrentUser.mockResolvedValue({
        success: false,
        user: null,
      });
      
      storageUtils.getAnonymousSession.mockResolvedValue(mockAnonymousUser);
      storageUtils.clearAnonymousSession.mockResolvedValue();

      render(
        <AuthProvider>
          <TestComponent onAuthData={mockOnAuthData} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authData.user).toEqual(mockAnonymousUser);
        expect(authData.isAnonymous).toBe(true);
      });

      await act(async () => {
        const result = await authData.signOut();
        expect(result.success).toBe(true);
      });

      expect(authData.user).toBeNull();
      expect(authData.isAnonymous).toBe(false);
    });
  });

  describe('updateProfile', () => {
    it('should update authenticated user profile', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      
      authService.getCurrentUser.mockResolvedValue({
        success: true,
        user: mockUser,
      });
      
      authService.updateProfile.mockResolvedValue({
        success: true,
        data: { ...mockUser, display_name: 'Updated Name' },
      });

      render(
        <AuthProvider>
          <TestComponent onAuthData={mockOnAuthData} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authData.user).toEqual(mockUser);
      });

      await act(async () => {
        const result = await authData.updateProfile({ display_name: 'Updated Name' });
        expect(result.success).toBe(true);
      });

      expect(authData.user.display_name).toBe('Updated Name');
    });

    it('should update anonymous user profile locally', async () => {
      const mockAnonymousUser = { id: 'anon_123', isAnonymous: true };
      
      authService.getCurrentUser.mockResolvedValue({
        success: false,
        user: null,
      });
      
      storageUtils.getAnonymousSession.mockResolvedValue(mockAnonymousUser);
      storageUtils.storeAnonymousSession.mockResolvedValue();

      render(
        <AuthProvider>
          <TestComponent onAuthData={mockOnAuthData} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authData.user).toEqual(mockAnonymousUser);
        expect(authData.isAnonymous).toBe(true);
      });

      await act(async () => {
        const result = await authData.updateProfile({ displayName: 'Anonymous User' });
        expect(result.success).toBe(true);
      });

      expect(authData.user.displayName).toBe('Anonymous User');
    });
  });
});