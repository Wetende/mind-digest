import { supabase } from '../config/supabase';

class AuthService {
  // Sign up with email and password
  async signUp(email, password, userData = {}) {
    try {
      console.log('AuthService: Attempting sign up for:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });
      
      console.log('AuthService: Sign up response:', { data: data?.user?.id, error: error?.message });
      
      if (error) {
        console.log('AuthService: Sign up error:', error);
        
        // Provide user-friendly error messages
        let userMessage = error.message;
        if (error.message.includes('User already registered')) {
          userMessage = 'An account with this email already exists. Please sign in instead.';
        } else if (error.message.includes('Password should be at least')) {
          userMessage = 'Password must be at least 6 characters long.';
        } else if (error.message.includes('Invalid email')) {
          userMessage = 'Please enter a valid email address.';
        }
        
        throw new Error(userMessage);
      }
      
      console.log('AuthService: Sign up successful');
      return { success: true, data };
    } catch (error) {
      console.error('AuthService: Sign up error:', error);
      return { success: false, error: error.message };
    }
  }

  // Sign in with email and password
  async signIn(email, password) {
    try {
      console.log('AuthService: Attempting sign in for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      console.log('AuthService: Sign in response:', { data: data?.user?.id, error: error?.message });
      
      if (error) {
        console.log('AuthService: Sign in error:', error);
        
        // Provide user-friendly error messages
        let userMessage = error.message;
        if (error.message.includes('Invalid login credentials')) {
          userMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.message.includes('Email not confirmed')) {
          userMessage = 'Please check your email and click the confirmation link before signing in.';
        } else if (error.message.includes('Too many requests')) {
          userMessage = 'Too many sign-in attempts. Please wait a moment and try again.';
        }
        
        throw new Error(userMessage);
      }
      
      if (!data?.user) {
        throw new Error('Sign in failed. Please try again.');
      }
      
      console.log('AuthService: Sign in successful for user:', data.user.id);
      return { success: true, data };
    } catch (error) {
      console.error('AuthService: Sign in error:', error);
      return { success: false, error: error.message };
    }
  }

  // Create anonymous session
  async signInAnonymously() {
    try {
      // For anonymous users, we'll create a temporary session
      // This is a simplified implementation - in production, you'd want proper anonymous auth
      const anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return { 
        success: true, 
        data: { 
          user: { 
            id: anonymousId, 
            isAnonymous: true,
            email: null 
          } 
        } 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Sign out
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get current user
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      // Also check for session to ensure user is properly authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      return { 
        success: true, 
        user: user && session ? user : null,
        session 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Listen to auth state changes
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  }

  // Update user profile
  async updateProfile(updates) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: updates
      });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Reset password
  async resetPassword(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new AuthService();