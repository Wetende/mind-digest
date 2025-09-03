import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { ENV } from './env';

// Supabase configuration
const supabaseUrl = ENV.SUPABASE_URL;
const supabaseAnonKey = ENV.SUPABASE_ANON_KEY;

// Validate Supabase configuration
const isValidUrl = (url) => {
  try {
    return url && url !== 'YOUR_SUPABASE_URL' && new URL(url);
  } catch {
    return false;
  }
};

const isValidKey = (key) => {
  return key && key !== 'YOUR_SUPABASE_ANON_KEY' && key.length > 10;
};

// Validate and create Supabase client
if (!isValidUrl(supabaseUrl) || !isValidKey(supabaseAnonKey)) {
  console.error('❌ Supabase configuration error:');
  console.error('Please set valid EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file');
  console.error('Current values:', { url: supabaseUrl, hasKey: !!supabaseAnonKey });
  throw new Error('Supabase configuration required. Please check your .env file.');
}

// Configure auth storage differently for web vs native so sessions work correctly
const authOptions = {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: false,
};

if (Platform.OS !== 'web') {
  // Use AsyncStorage on native
  authOptions.storage = AsyncStorage;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: authOptions,
});

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => true;

// Log successful configuration
if (ENV.IS_DEV) {
  console.log('✅ Supabase client initialized successfully');
}

// Database table names (we'll create these in Supabase)
export const TABLES = {
  USERS: 'users',
  MOODS: 'moods',
  JOURNAL_ENTRIES: 'journal_entries',
  PEER_MESSAGES: 'peer_messages',
  HABITS: 'habits',
  SOCIAL_SHARES: 'social_shares',
  WELLNESS_PLANS: 'wellness_plans',
  WELLNESS_TASKS: 'wellness_tasks',
};