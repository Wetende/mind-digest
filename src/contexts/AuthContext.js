import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services';
import { storeAnonymousSession, getAnonymousSession, clearAnonymousSession } from '../utils';
import { setSentryUser, trackUserEngagement } from '../utils/sentryConfig';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    initializeAuth();
    
    // Listen to auth state changes
    const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setIsAnonymous(false);
        setLoading(false);
        // Set Sentry user context for crash reporting and analytics
        setSentryUser(session.user);
        trackUserEngagement('auth_state_change', 'authentication');
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAnonymous(false);
        setLoading(false);
        // Clear Sentry user context on sign out
        setSentryUser(null);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user);
        setIsAnonymous(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const initializeAuth = async () => {
    try {
      console.log('Initializing auth...');
      
      // Check for existing Supabase session
      const result = await authService.getCurrentUser();
      console.log('Current user result:', result);
      
      if (result.success && result.user) {
        console.log('Found existing user:', result.user.id);
        setUser(result.user);
        setIsAnonymous(false);
      } else {
        console.log('No existing user, checking anonymous session...');
        // Check for anonymous session
        const anonymousSession = await getAnonymousSession();
        if (anonymousSession) {
          console.log('Found anonymous session:', anonymousSession.id);
          setUser(anonymousSession);
          setIsAnonymous(true);
        } else {
          console.log('No user session found');
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password, userData) => {
    try {
      const result = await authService.signUp(email, password, userData);
      if (result.success) {
        setUser(result.data.user);
        setIsAnonymous(false);
        // Clear any anonymous session
        await clearAnonymousSession();
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signIn = async (email, password) => {
    try {
      const result = await authService.signIn(email, password);
      if (result.success && result.data?.user) {
        console.log('Setting user in context:', result.data.user.id);
        
        // Immediately set the user state to trigger navigation
        setUser(result.data.user);
        setIsAnonymous(false);
        setLoading(false);

        // Clear any anonymous session
        await clearAnonymousSession();

        // Set Sentry user context for crash reporting and analytics
        setSentryUser(result.data.user);
        trackUserEngagement('auth_sign_in', 'authentication');
        
        console.log('User state updated, should navigate now');
      }
      return result;
    } catch (error) {
      console.error('SignIn context error:', error);
      return { success: false, error: error.message };
    }
  };

  const signInAnonymously = async (interests = []) => {
    try {
      const result = await authService.signInAnonymously();
      if (result.success) {
        const anonymousUser = {
          ...result.data.user,
          interests,
          createdAt: new Date().toISOString(),
        };
        
        // Store anonymous session locally
        await storeAnonymousSession(anonymousUser);
        
        setUser(anonymousUser);
        setIsAnonymous(true);
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      if (!isAnonymous) {
        await authService.signOut();
      }
      
      // Clear anonymous session
      await clearAnonymousSession();
      
      setUser(null);
      setIsAnonymous(false);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const updateProfile = async (updates) => {
    try {
      if (isAnonymous) {
        // Update anonymous session locally
        const updatedUser = { ...user, ...updates };
        await storeAnonymousSession(updatedUser);
        setUser(updatedUser);
        return { success: true, data: updatedUser };
      } else {
        const result = await authService.updateProfile(updates);
        if (result.success) {
          setUser(prev => ({ ...prev, ...updates }));
        }
        return result;
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const upgradeToFullAccount = async (email, password) => {
    try {
      if (!isAnonymous) {
        return { success: false, error: 'User is not anonymous' };
      }

      // Create full account with existing anonymous data
      const userData = {
        display_name: user.displayName || 'Mind-digest User',
        interests: user.interests || [],
        is_anonymous: false,
      };

      const result = await authService.signUp(email, password, userData);
      
      if (result.success) {
        // Clear anonymous session
        await clearAnonymousSession();
        
        setUser(result.data.user);
        setIsAnonymous(false);
      }
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    loading,
    isAnonymous,
    signUp,
    signIn,
    signInAnonymously,
    signOut,
    updateProfile,
    upgradeToFullAccount,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
