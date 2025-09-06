-- Fix missing database tables and RLS policies for Mind-digest app
-- Run this script in your Supabase SQL editor to fix the 404 and 406 errors

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure users table exists with proper structure
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  display_name TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  mental_health_profile JSONB DEFAULT '{}',
  mental_health_interests TEXT[] DEFAULT '{}',
  shared_experiences TEXT[] DEFAULT '{}',
  age_range TEXT,
  preferred_communication_style TEXT,
  is_active BOOLEAN DEFAULT true,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  mood_streak INTEGER DEFAULT 0,
  last_mood_entry DATE,
  is_suspended BOOLEAN DEFAULT false,
  suspension_reason TEXT,
  suspended_until TIMESTAMP WITH TIME ZONE,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User behavior profiles for storing learning preferences and patterns
CREATE TABLE IF NOT EXISTS user_behavior_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  learning_style JSONB DEFAULT '{}',
  interaction_patterns JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  adaptation_settings JSONB DEFAULT '{}',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- User behavior data for tracking all interactions
CREATE TABLE IF NOT EXISTS user_behavior_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL,
  interaction_data JSONB NOT NULL,
  context JSONB DEFAULT '{}',
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User habit statistics table
CREATE TABLE IF NOT EXISTS user_habit_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_activities INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- User badges table for achievement tracking
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  badge_data JSONB NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_key)
);

-- Habit activities table for tracking all user activities
CREATE TABLE IF NOT EXISTS habit_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'MOOD_LOG', 'JOURNAL_ENTRY', 'BREATHING_EXERCISE', 'MEDITATION',
    'SOCIAL_INTERACTION', 'WELLNESS_TASK', 'DAILY_CHECKIN', 'MILESTONE_ACHIEVEMENT'
  )),
  points_earned INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_habit_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_activities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can view own behavior profile" ON user_behavior_profiles;
DROP POLICY IF EXISTS "Users can insert own behavior profile" ON user_behavior_profiles;
DROP POLICY IF EXISTS "Users can update own behavior profile" ON user_behavior_profiles;
DROP POLICY IF EXISTS "Users can view own behavior data" ON user_behavior_data;
DROP POLICY IF EXISTS "Users can insert own behavior data" ON user_behavior_data;
DROP POLICY IF EXISTS "Users can view own habit stats" ON user_habit_stats;
DROP POLICY IF EXISTS "Users can insert own habit stats" ON user_habit_stats;
DROP POLICY IF EXISTS "Users can update own habit stats" ON user_habit_stats;
DROP POLICY IF EXISTS "Users can view own badges" ON user_badges;
DROP POLICY IF EXISTS "Users can insert own badges" ON user_badges;
DROP POLICY IF EXISTS "Users can view own habit activities" ON habit_activities;
DROP POLICY IF EXISTS "Users can insert own habit activities" ON habit_activities;

-- Create policies for users table
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policies for user_behavior_profiles
CREATE POLICY "Users can view own behavior profile" ON user_behavior_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own behavior profile" ON user_behavior_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own behavior profile" ON user_behavior_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for user_behavior_data
CREATE POLICY "Users can view own behavior data" ON user_behavior_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own behavior data" ON user_behavior_data FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for user_habit_stats
CREATE POLICY "Users can view own habit stats" ON user_habit_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habit stats" ON user_habit_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habit stats" ON user_habit_stats FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for user_badges
CREATE POLICY "Users can view own badges" ON user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own badges" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for habit_activities
CREATE POLICY "Users can view own habit activities" ON habit_activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habit activities" ON habit_activities FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, display_name, is_anonymous)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', 'Mind-digest User'), false)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_behavior_data_user_type ON user_behavior_data(user_id, interaction_type);
CREATE INDEX IF NOT EXISTS idx_user_behavior_data_created_at ON user_behavior_data(created_at);
CREATE INDEX IF NOT EXISTS idx_habit_activities_user_type ON habit_activities(user_id, activity_type);
CREATE INDEX IF NOT EXISTS idx_habit_activities_completed_at ON habit_activities(completed_at);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);

-- Grant necessary permissions (if needed)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';