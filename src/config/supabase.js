import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from './env';

// Supabase configuration
const supabaseUrl = ENV.SUPABASE_URL;
const supabaseAnonKey = ENV.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database table names (we'll create these in Supabase)
export const TABLES = {
  USERS: 'users',
  MOODS: 'moods',
  JOURNAL_ENTRIES: 'journal_entries',
  PEER_MESSAGES: 'peer_messages',
  HABITS: 'habits',
  SOCIAL_SHARES: 'social_shares',
};