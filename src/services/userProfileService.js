import { supabase } from '../config/supabase';

class UserProfileService {
  /**
   * Ensure user profile exists in users table
   * This fixes the foreign key constraint error in peer_messages
   */
  async ensureUserProfile(userId = null) {
    try {
      // Get current user if no userId provided
      if (!userId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error('No authenticated user found');
        }
        userId = user.id;
      }

      // Check if user profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is expected if profile doesn't exist
        throw checkError;
      }

      // If profile doesn't exist, create it
      if (!existingProfile) {
        console.log('Creating missing user profile for:', userId);
        
        const { data: authUser } = await supabase.auth.getUser();
        const displayName = authUser?.user?.user_metadata?.display_name || 
                           authUser?.user?.email?.split('@')[0] || 
                           'Mind-digest User';

        const { data: newProfile, error: insertError } = await supabase
          .from('users')
          .insert({
            id: userId,
            display_name: displayName,
            is_anonymous: false,
            preferences: {},
            mental_health_profile: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        console.log('User profile created successfully:', newProfile);
        return { success: true, data: newProfile, created: true };
      }

      return { success: true, data: existingProfile, created: false };
    } catch (error) {
      console.error('Error ensuring user profile:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user profile with fallback creation
   */
  async getUserProfile(userId = null) {
    try {
      // Ensure profile exists first
      const ensureResult = await this.ensureUserProfile(userId);
      if (!ensureResult.success) {
        throw new Error(ensureResult.error);
      }

      // Get current user if no userId provided
      if (!userId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error('No authenticated user found');
        }
        userId = user.id;
      }

      // Fetch complete profile
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error getting user profile:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId, updates) {
    try {
      // Ensure profile exists first
      await this.ensureUserProfile(userId);

      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Initialize user profile after registration
   * Call this after successful user registration
   */
  async initializeNewUserProfile(user) {
    try {
      const displayName = user.user_metadata?.display_name || 
                         user.email?.split('@')[0] || 
                         'Mind-digest User';

      const { data, error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          display_name: displayName,
          is_anonymous: false,
          preferences: {
            notifications: true,
            anonymousMode: false,
            interests: []
          },
          mental_health_profile: {
            goals: [],
            triggers: [],
            copingStrategies: []
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      console.log('New user profile initialized:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error initializing new user profile:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new UserProfileService();