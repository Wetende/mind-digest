import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from '../../src/contexts/AuthContext';
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
  storeAnonymousSession: jest.fn(),
  getAnonymousSession: jest.fn(),
  clearAnonymousSession: jest.fn(),
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
  }),
}));

// Mock screens for testing
const MockLoginScreen = () => {
  const React = require('react');
  const { View, Text, TextInput, TouchableOpacity } = require('react-native');
  const { useAuth } = require('../../src/contexts/AuthContext');
  
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const { signIn, signInAnonymously } = useAuth();

  const handleSignIn = async () => {
    await signIn(email, password);
  };

  const handleAnonymousSignIn = async () => {
    await signInAnonymously(['anxiety']);
  };

  return (
    <View>
      <Text testID="login-screen">Login Screen</Text>
      <TextInput
        testID="email-input"
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
      />
      <TextInput
        testID="password-input"
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
      />
      <TouchableOpacity testID="sign-in-button" onPress={handleSignIn}>
        <Text>Sign In</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="anonymous-button" onPress={handleAnonymousSignIn}>
        <Text>Continue Anonymously</Text>
      </TouchableOpacity>
    </View>
  );
};

const MockHomeScreen = () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  const { useAuth } = require('../../src/contexts/AuthContext');
  
  const { user, signOut, isAnonymous } = useAuth();

  return (
    <View>
      <Text testID="home-screen">Home Screen</Text>
      <Text testID="user-info">
        User: {user?.id || 'none'} - Anonymous: {isAnonymous.toString()}
      </Text>
      <TouchableOpacity testID="sign-out-button" onPress={signOut}>
        <Text>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

const TestApp = ({ initialScreen = 'Login' }) => {
  const React = require('react');
  const [currentScreen, setCurrentScreen] = React.useState(initialScreen);
  const { user } = require('../../src/contexts/AuthContext').useAuth();

  React.useEffect(() => {
    if (user) {
      setCurrentScreen('Home');
    } else {
      setCurrentScreen('Login');
    }
  }, [user]);

  return (
    <NavigationContainer>
      <AuthProvider>
        {currentScreen === 'Login' ? <MockLoginScreen /> : <MockHomeScreen />}
      </AuthProvider>
    </NavigationContainer>
  );
};

describe.skip('User Journey Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console logs during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Default mock implementations
    authService.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    });
    authService.getCurrentUser.mockResolvedValue({ success: false });
    storageUtils.getAnonymousSession.mockResolvedValue(null);
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe('Authentication Flow', () => {
    it('should complete successful sign in journey', async () => {
      const mockUser = { id: 'user123', email: 'test@example.com' };
      authService.signIn.mockResolvedValue({
        success: true,
        data: { user: mockUser },
      });

      const { getByTestId } = render(<TestApp />);

      // Should start on login screen
      expect(getByTestId('login-screen')).toBeTruthy();

      // Fill in credentials
      fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
      fireEvent.changeText(getByTestId('password-input'), 'password123');

      // Sign in
      fireEvent.press(getByTestId('sign-in-button'));

      // Should navigate to home screen after successful sign in
      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
        expect(getByTestId('user-info').children[0]).toContain('user123');
        expect(getByTestId('user-info').children[0]).toContain('Anonymous: false');
      });

      expect(authService.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should complete anonymous sign in journey', async () => {
      const mockAnonymousUser = { id: 'anon123', isAnonymous: true };
      authService.signInAnonymously.mockResolvedValue({
        success: true,
        data: { user: mockAnonymousUser },
      });

      const { getByTestId } = render(<TestApp />);

      // Should start on login screen
      expect(getByTestId('login-screen')).toBeTruthy();

      // Sign in anonymously
      fireEvent.press(getByTestId('anonymous-button'));

      // Should navigate to home screen after successful anonymous sign in
      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
        expect(getByTestId('user-info').children[0]).toContain('anon123');
        expect(getByTestId('user-info').children[0]).toContain('Anonymous: true');
      });

      expect(authService.signInAnonymously).toHaveBeenCalled();
      expect(storageUtils.storeAnonymousSession).toHaveBeenCalled();
    });

    it('should handle sign out journey', async () => {
      // Start with authenticated user
      const mockUser = { id: 'user123', email: 'test@example.com' };
      authService.getCurrentUser.mockResolvedValue({
        success: true,
        user: mockUser,
      });

      const { getByTestId } = render(<TestApp initialScreen="Home" />);

      // Should start on home screen with user
      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
        expect(getByTestId('user-info').children[0]).toContain('user123');
      });

      // Sign out
      fireEvent.press(getByTestId('sign-out-button'));

      // Should navigate back to login screen
      await waitFor(() => {
        expect(getByTestId('login-screen')).toBeTruthy();
      });

      expect(authService.signOut).toHaveBeenCalled();
      expect(storageUtils.clearAnonymousSession).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle sign in errors gracefully', async () => {
      authService.signIn.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      });

      const { getByTestId } = render(<TestApp />);

      // Fill in credentials
      fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
      fireEvent.changeText(getByTestId('password-input'), 'wrongpassword');

      // Attempt sign in
      fireEvent.press(getByTestId('sign-in-button'));

      // Should remain on login screen
      await waitFor(() => {
        expect(getByTestId('login-screen')).toBeTruthy();
      });

      expect(authService.signIn).toHaveBeenCalledWith('test@example.com', 'wrongpassword');
    });

    it('should handle network errors during authentication', async () => {
      authService.signIn.mockRejectedValue(new Error('Network error'));

      const { getByTestId } = render(<TestApp />);

      // Fill in credentials
      fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
      fireEvent.changeText(getByTestId('password-input'), 'password123');

      // Attempt sign in
      fireEvent.press(getByTestId('sign-in-button'));

      // Should remain on login screen
      await waitFor(() => {
        expect(getByTestId('login-screen')).toBeTruthy();
      });
    });
  });

  describe('Session Persistence', () => {
    it('should restore authenticated session on app restart', async () => {
      const mockUser = { id: 'user123', email: 'test@example.com' };
      authService.getCurrentUser.mockResolvedValue({
        success: true,
        user: mockUser,
      });

      const { getByTestId } = render(<TestApp />);

      // Should automatically navigate to home screen with restored session
      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
        expect(getByTestId('user-info').children[0]).toContain('user123');
        expect(getByTestId('user-info').children[0]).toContain('Anonymous: false');
      });
    });

    it('should restore anonymous session on app restart', async () => {
      const mockAnonymousUser = { id: 'anon123', isAnonymous: true };
      authService.getCurrentUser.mockResolvedValue({ success: false });
      storageUtils.getAnonymousSession.mockResolvedValue(mockAnonymousUser);

      const { getByTestId } = render(<TestApp />);

      // Should automatically navigate to home screen with restored anonymous session
      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
        expect(getByTestId('user-info').children[0]).toContain('anon123');
        expect(getByTestId('user-info').children[0]).toContain('Anonymous: true');
      });
    });
  });
});