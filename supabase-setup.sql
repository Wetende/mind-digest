-- Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create database tables for Mind-digest

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  display_name TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  mental_health_profile JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Moods table
CREATE TABLE IF NOT EXISTS moods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  mood INTEGER CHECK (mood >= 1 AND mood <= 5),
  energy INTEGER CHECK (energy >= 1 AND energy <= 5),
  anxiety INTEGER CHECK (anxiety >= 1 AND anxiety <= 5),
  emotions TEXT[],
  triggers TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Journal entries table
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mood INTEGER CHECK (mood >= 1 AND mood <= 5),
  emotions TEXT[],
  triggers TEXT[],
  ai_insights JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat rooms table
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('anxiety', 'depression', 'general', 'crisis')),
  is_moderated BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Peer messages table
CREATE TABLE IF NOT EXISTS peer_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'audio')),
  reactions JSONB DEFAULT '{}',
  is_moderated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE moods ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policies for moods table
CREATE POLICY "Users can view own moods" ON moods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own moods" ON moods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own moods" ON moods FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own moods" ON moods FOR DELETE USING (auth.uid() = user_id);

-- Create policies for journal entries
CREATE POLICY "Users can view own journal entries" ON journal_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own journal entries" ON journal_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own journal entries" ON journal_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own journal entries" ON journal_entries FOR DELETE USING (auth.uid() = user_id);

-- Create policies for chat rooms (public read)
CREATE POLICY "Anyone can view chat rooms" ON chat_rooms FOR SELECT USING (true);

-- Create policies for peer messages
CREATE POLICY "Users can view messages in joined rooms" ON peer_messages FOR SELECT USING (true);
CREATE POLICY "Users can insert messages" ON peer_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Insert some default chat rooms
INSERT INTO chat_rooms (name, description, category) VALUES
  ('Social Anxiety Support', 'A safe space to discuss social anxiety challenges and victories', 'anxiety'),
  ('Daily Check-ins', 'Share how you''re feeling today with the community', 'general'),
  ('Mindfulness & Meditation', 'Discuss mindfulness practices and meditation techniques', 'general'),
  ('Crisis Support', 'Immediate support for those in crisis (moderated 24/7)', 'crisis')
ON CONFLICT DO NOTHING;

-- Create function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, display_name, is_anonymous)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', 'Mind-digest User'), false);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
--
 Create social_progress table for tracking social skills development
CREATE TABLE social_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- 'roleplay', 'scenario_planner'
  scenario_id INTEGER NOT NULL,
  score INTEGER NOT NULL,
  total_points INTEGER NOT NULL,
  percentage INTEGER NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE social_progress ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own social progress" ON social_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own social progress" ON social_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own social progress" ON social_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own social progress" ON social_progress FOR DELETE USING (auth.uid() = user_id);
-
- Enhanced mood tracking table
CREATE TABLE IF NOT EXISTS mood_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mood_score INTEGER CHECK (mood_score >= 1 AND mood_score <= 10),
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
  anxiety_level INTEGER CHECK (anxiety_level >= 1 AND anxiety_level <= 10),
  stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
  sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
  social_interactions INTEGER DEFAULT 0,
  exercise_minutes INTEGER DEFAULT 0,
  symptoms TEXT[] DEFAULT '{}',
  triggers TEXT[] DEFAULT '{}',
  activities TEXT[] DEFAULT '{}',
  medications TEXT[] DEFAULT '{}',
  weather TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- User matching and pairing tables
CREATE TABLE IF NOT EXISTS chat_pairings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'declined', 'ended')),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user1_id, user2_id)
);

CREATE TABLE IF NOT EXISTS user_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- Scenario planning tables
CREATE TABLE IF NOT EXISTS scenario_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('social', 'workplace', 'family', 'dating', 'public_speaking', 'conflict_resolution')),
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  estimated_duration INTEGER, -- in minutes
  steps JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scenario_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES scenario_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  difficulty_level TEXT,
  estimated_duration INTEGER,
  steps JSONB NOT NULL,
  anxiety_level INTEGER CHECK (anxiety_level >= 1 AND anxiety_level <= 10),
  confidence_level INTEGER CHECK (confidence_level >= 1 AND confidence_level <= 10),
  custom_notes TEXT,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'paused')),
  current_step INTEGER DEFAULT 0,
  success_level TEXT CHECK (success_level IN ('excellent', 'good', 'completed', 'challenging')),
  confidence_improvement DECIMAL,
  anxiety_reduction DECIMAL,
  avg_difficulty DECIMAL,
  total_duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  paused_at TIMESTAMP WITH TIME ZONE,
  resumed_at TIMESTAMP WITH TIME ZONE,
  pause_reason TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scenario_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES scenario_plans(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  status TEXT CHECK (status IN ('started', 'completed', 'skipped')),
  confidence_before INTEGER CHECK (confidence_before >= 1 AND confidence_before <= 10),
  confidence_after INTEGER CHECK (confidence_after >= 1 AND confidence_after <= 10),
  anxiety_before INTEGER CHECK (anxiety_before >= 1 AND anxiety_before <= 10),
  anxiety_after INTEGER CHECK (anxiety_after >= 1 AND anxiety_after <= 10),
  difficulty_experienced INTEGER CHECK (difficulty_experienced >= 1 AND difficulty_experienced <= 10),
  duration_minutes INTEGER,
  notes TEXT,
  challenges_faced TEXT[] DEFAULT '{}',
  strategies_used TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Room members table for private chats
CREATE TABLE IF NOT EXISTS room_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Update users table to include matching fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS mental_health_interests TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS shared_experiences TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS age_range TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_communication_style TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS mood_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_mood_entry DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin'));

-- Update chat_rooms table for private rooms
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 100;

-- Enable RLS for new tables
ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_pairings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;

-- Create policies for mood_entries
CREATE POLICY "Users can view own mood entries" ON mood_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own mood entries" ON mood_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own mood entries" ON mood_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own mood entries" ON mood_entries FOR DELETE USING (auth.uid() = user_id);

-- Create policies for chat_pairings
CREATE POLICY "Users can view own pairings" ON chat_pairings FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "Users can insert pairings" ON chat_pairings FOR INSERT WITH CHECK (auth.uid() = user1_id);
CREATE POLICY "Users can update own pairings" ON chat_pairings FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Create policies for user_reports
CREATE POLICY "Users can view own reports" ON user_reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Users can insert reports" ON user_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Create policies for user_blocks
CREATE POLICY "Users can view own blocks" ON user_blocks FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Users can insert blocks" ON user_blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can delete own blocks" ON user_blocks FOR DELETE USING (auth.uid() = blocker_id);

-- Create policies for scenario_templates (public read)
CREATE POLICY "Anyone can view scenario templates" ON scenario_templates FOR SELECT USING (is_active = true);

-- Create policies for scenario_plans
CREATE POLICY "Users can view own scenario plans" ON scenario_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scenario plans" ON scenario_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own scenario plans" ON scenario_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own scenario plans" ON scenario_plans FOR DELETE USING (auth.uid() = user_id);

-- Create policies for scenario_progress
CREATE POLICY "Users can view own scenario progress" ON scenario_progress 
FOR SELECT USING (auth.uid() = (SELECT user_id FROM scenario_plans WHERE id = plan_id));
CREATE POLICY "Users can insert own scenario progress" ON scenario_progress 
FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM scenario_plans WHERE id = plan_id));

-- Create policies for notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for room_members
CREATE POLICY "Users can view room members" ON room_members FOR SELECT USING (true);
CREATE POLICY "Users can join rooms" ON room_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave rooms" ON room_members FOR DELETE USING (auth.uid() = user_id);

-- Wellness plans and tasks tables
CREATE TABLE IF NOT EXISTS wellness_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  plan_type TEXT CHECK (plan_type IN ('anxiety_management', 'mood_improvement', 'social_skills', 'stress_reduction', 'habit_building', 'crisis_prevention')),
  goals TEXT[] DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  duration_weeks INTEGER DEFAULT 8,
  daily_tasks JSONB DEFAULT '[]',
  milestones JSONB DEFAULT '[]',
  ai_insights JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  progress_percentage DECIMAL DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  total_tasks INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  paused_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS wellness_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES wellness_plans(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('mindfulness', 'exercise', 'social', 'journaling', 'breathing', 'self_care', 'learning', 'creative')),
  duration_minutes INTEGER DEFAULT 10,
  points INTEGER DEFAULT 10,
  difficulty TEXT DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  scheduled_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'missed')),
  completed_at TIMESTAMP WITH TIME ZONE,
  skipped_reason TEXT,
  user_notes TEXT,
  effectiveness_rating INTEGER CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 5),
  mood_before INTEGER CHECK (mood_before >= 1 AND mood_before <= 5),
  mood_after INTEGER CHECK (mood_after >= 1 AND mood_after <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Milestone tracking table
CREATE TABLE IF NOT EXISTS wellness_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES wellness_plans(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  milestone_data JSONB NOT NULL,
  achieved_at TIMESTAMP WITH TIME ZONE,
  is_achieved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for wellness tables
ALTER TABLE wellness_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_milestones ENABLE ROW LEVEL SECURITY;

-- Create policies for wellness_plans
CREATE POLICY "Users can view own wellness plans" ON wellness_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wellness plans" ON wellness_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own wellness plans" ON wellness_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own wellness plans" ON wellness_plans FOR DELETE USING (auth.uid() = user_id);

-- Create policies for wellness_tasks
CREATE POLICY "Users can view own wellness tasks" ON wellness_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wellness tasks" ON wellness_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own wellness tasks" ON wellness_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own wellness tasks" ON wellness_tasks FOR DELETE USING (auth.uid() = user_id);

-- Create policies for wellness_milestones
CREATE POLICY "Users can view own wellness milestones" ON wellness_milestones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wellness milestones" ON wellness_milestones FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own wellness milestones" ON wellness_milestones FOR UPDATE USING (auth.uid() = user_id);

-- User notifications table for managing scheduled notifications
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  notification_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wellness plan adaptations table for tracking plan changes
CREATE TABLE IF NOT EXISTS wellness_plan_adaptations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES wellness_plans(id) ON DELETE CASCADE,
  adaptations JSONB NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for new tables
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_plan_adaptations ENABLE ROW LEVEL SECURITY;

-- Create policies for user_notifications
CREATE POLICY "Users can view own notifications" ON user_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON user_notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON user_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON user_notifications FOR DELETE USING (auth.uid() = user_id);

-- Create policies for wellness_plan_adaptations
CREATE POLICY "Users can view own plan adaptations" ON wellness_plan_adaptations 
FOR SELECT USING (auth.uid() = (SELECT user_id FROM wellness_plans WHERE id = plan_id));
CREATE POLICY "System can insert plan adaptations" ON wellness_plan_adaptations FOR INSERT WITH CHECK (true);

-- Insert sample scenario templates
INSERT INTO scenario_templates (title, description, category, difficulty_level, estimated_duration, steps) VALUES
(
  'Meeting New People at a Party',
  'Practice introducing yourself and making conversation at social gatherings',
  'social',
  'beginner',
  10,
  '[
    {
      "id": 1,
      "title": "Prepare mentally",
      "description": "Take a few deep breaths and remind yourself of your conversation goals",
      "tips": ["Set realistic expectations", "Remember that most people are friendly", "Have a few conversation topics ready"],
      "duration": 2
    },
    {
      "id": 2,
      "title": "Make your approach",
      "description": "Find someone who looks approachable and make eye contact",
      "tips": ["Look for open body language", "Smile genuinely", "Choose someone who seems welcoming"],
      "duration": 1
    },
    {
      "id": 3,
      "title": "Start the conversation",
      "description": "Use a friendly greeting and introduce yourself",
      "tips": ["Use their name once you learn it", "Ask open-ended questions", "Show genuine interest"],
      "duration": 5
    },
    {
      "id": 4,
      "title": "Keep it flowing",
      "description": "Find common ground and share experiences",
      "tips": ["Listen actively", "Ask follow-up questions", "Share something about yourself"],
      "duration": 2
    }
  ]'::jsonb
),
(
  'Job Interview Confidence',
  'Build confidence for job interviews and professional conversations',
  'workplace',
  'intermediate',
  15,
  '[
    {
      "id": 1,
      "title": "Research and prepare",
      "description": "Research the company and prepare your key talking points",
      "tips": ["Know your strengths", "Prepare specific examples", "Practice common questions"],
      "duration": 5
    },
    {
      "id": 2,
      "title": "Professional greeting",
      "description": "Make a strong first impression with confident body language",
      "tips": ["Firm handshake", "Good eye contact", "Professional attire"],
      "duration": 2
    },
    {
      "id": 3,
      "title": "Answer questions confidently",
      "description": "Respond to questions with specific examples and enthusiasm",
      "tips": ["Use the STAR method", "Stay positive", "Ask clarifying questions if needed"],
      "duration": 6
    },
    {
      "id": 4,
      "title": "Ask thoughtful questions",
      "description": "Show interest by asking about the role and company culture",
      "tips": ["Prepare questions in advance", "Show genuine curiosity", "Avoid salary questions initially"],
      "duration": 2
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- Habit tracking tables for gamified wellness system

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

-- User badges table for achievement tracking
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  badge_data JSONB NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_key)
);

-- User challenges table for habit formation challenges
CREATE TABLE IF NOT EXISTS user_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL,
  challenge_data JSONB NOT NULL,
  current_progress INTEGER DEFAULT 0,
  target_progress INTEGER NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'abandoned')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ends_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for habit tracking tables
ALTER TABLE user_habit_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;

-- Create policies for user_habit_stats
CREATE POLICY "Users can view own habit stats" ON user_habit_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habit stats" ON user_habit_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habit stats" ON user_habit_stats FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for habit_activities
CREATE POLICY "Users can view own habit activities" ON habit_activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habit activities" ON habit_activities FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for user_badges
CREATE POLICY "Users can view own badges" ON user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own badges" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for user_challenges
CREATE POLICY "Users can view own challenges" ON user_challenges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own challenges" ON user_challenges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own challenges" ON user_challenges FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_habit_activities_user_type ON habit_activities(user_id, activity_type);
CREATE INDEX IF NOT EXISTS idx_habit_activities_completed_at ON habit_activities(completed_at);
CREATE INDEX IF NOT EXISTS idx_user_challenges_status ON user_challenges(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);

-- User behavior learning tables for AI-powered recommendations

-- User behavior profiles for storing learning preferences and patterns
CREATE TABLE IF NOT EXISTS user_behavior_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  learning_preferences JSONB DEFAULT '{}',
  interaction_patterns JSONB DEFAULT '{}',
  content_preferences JSONB DEFAULT '{}',
  peer_preferences JSONB DEFAULT '{}',
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
  context_data JSONB DEFAULT '{}',
  effectiveness_score DECIMAL,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  session_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recommendation history for tracking recommendation effectiveness
CREATE TABLE IF NOT EXISTS recommendation_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL,
  recommendation_data JSONB NOT NULL,
  context_at_time JSONB DEFAULT '{}',
  user_action TEXT CHECK (user_action IN ('viewed', 'accepted', 'declined', 'completed', 'ignored')),
  effectiveness_rating INTEGER CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 5),
  adaptation_applied BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Content interaction tracking for learning content preferences
CREATE TABLE IF NOT EXISTS content_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  content_id TEXT NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'like', 'share', 'complete', 'skip', 'rate')),
  duration_seconds INTEGER,
  completion_percentage DECIMAL CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  context_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Peer interaction tracking for social recommendations
CREATE TABLE IF NOT EXISTS peer_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  peer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('message', 'support', 'activity', 'recommendation')),
  interaction_quality TEXT CHECK (interaction_quality IN ('positive', 'neutral', 'negative')),
  interaction_data JSONB DEFAULT '{}',
  mutual_rating INTEGER CHECK (mutual_rating >= 1 AND mutual_rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Real-time adaptation cache for storing contextual adaptations
CREATE TABLE IF NOT EXISTS adaptation_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  context_key TEXT NOT NULL,
  adaptation_data JSONB NOT NULL,
  confidence_score DECIMAL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, context_key)
);

-- Enable RLS for behavior learning tables
ALTER TABLE user_behavior_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptation_cache ENABLE ROW LEVEL SECURITY;

-- Create policies for user_behavior_profiles
CREATE POLICY "Users can view own behavior profile" ON user_behavior_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own behavior profile" ON user_behavior_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own behavior profile" ON user_behavior_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for user_behavior_data
CREATE POLICY "Users can view own behavior data" ON user_behavior_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own behavior data" ON user_behavior_data FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for recommendation_history
CREATE POLICY "Users can view own recommendation history" ON recommendation_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recommendation history" ON recommendation_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recommendation history" ON recommendation_history FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for content_interactions
CREATE POLICY "Users can view own content interactions" ON content_interactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own content interactions" ON content_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for peer_interactions
CREATE POLICY "Users can view own peer interactions" ON peer_interactions FOR SELECT USING (auth.uid() = user_id OR auth.uid() = peer_id);
CREATE POLICY "Users can insert own peer interactions" ON peer_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for adaptation_cache
CREATE POLICY "Users can view own adaptation cache" ON adaptation_cache FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own adaptation cache" ON adaptation_cache FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own adaptation cache" ON adaptation_cache FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for behavior learning performance
CREATE INDEX IF NOT EXISTS idx_user_behavior_data_user_type ON user_behavior_data(user_id, interaction_type);
CREATE INDEX IF NOT EXISTS idx_user_behavior_data_created_at ON user_behavior_data(created_at);
CREATE INDEX IF NOT EXISTS idx_recommendation_history_user_type ON recommendation_history(user_id, recommendation_type);
CREATE INDEX IF NOT EXISTS idx_content_interactions_user_content ON content_interactions(user_id, content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_peer_interactions_users ON peer_interactions(user_id, peer_id);
CREATE INDEX IF NOT EXISTS idx_adaptation_cache_context ON adaptation_cache(user_id, context_key);--
 Social accountability tables for habit tracking

-- Progress sharing table
CREATE TABLE IF NOT EXISTS progress_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  share_type TEXT NOT NULL CHECK (share_type IN (
    'general_progress', 'milestone_reached', 'badge_earned', 'level_up', 'streak_achievement'
  )),
  content JSONB NOT NULL,
  visibility TEXT DEFAULT 'all' CHECK (visibility IN ('all', 'accountability_partners', 'specific_users')),
  target_users UUID[] DEFAULT '{}',
  reactions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Accountability partner requests table
CREATE TABLE IF NOT EXISTS accountability_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  declined_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(from_user_id, to_user_id)
);

-- Accountability partnerships table
CREATE TABLE IF NOT EXISTS accountability_partnerships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  end_reason TEXT,
  UNIQUE(user1_id, user2_id)
);

-- Partner encouragements table
CREATE TABLE IF NOT EXISTS partner_encouragements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  encouragement_type TEXT DEFAULT 'general' CHECK (encouragement_type IN (
    'general', 'streak_support', 'milestone_celebration', 'challenge_motivation'
  )),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for social accountability tables
ALTER TABLE progress_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_encouragements ENABLE ROW LEVEL SECURITY;

-- Create policies for progress_shares
CREATE POLICY "Users can view relevant progress shares" ON progress_shares 
FOR SELECT USING (
  visibility = 'all' OR 
  user_id = auth.uid() OR
  (visibility = 'accountability_partners' AND EXISTS (
    SELECT 1 FROM accountability_partnerships 
    WHERE (user1_id = auth.uid() AND user2_id = progress_shares.user_id)
       OR (user2_id = auth.uid() AND user1_id = progress_shares.user_id)
    AND status = 'active'
  )) OR
  (visibility = 'specific_users' AND auth.uid() = ANY(target_users))
);

CREATE POLICY "Users can insert own progress shares" ON progress_shares 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress shares" ON progress_shares 
FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for accountability_requests
CREATE POLICY "Users can view own requests" ON accountability_requests 
FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can insert requests" ON accountability_requests 
FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update requests they received" ON accountability_requests 
FOR UPDATE USING (auth.uid() = to_user_id);

-- Create policies for accountability_partnerships
CREATE POLICY "Users can view own partnerships" ON accountability_partnerships 
FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "System can insert partnerships" ON accountability_partnerships 
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own partnerships" ON accountability_partnerships 
FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Create policies for partner_encouragements
CREATE POLICY "Users can view encouragements they sent or received" ON partner_encouragements 
FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can send encouragements" ON partner_encouragements 
FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_progress_shares_user_visibility ON progress_shares(user_id, visibility);
CREATE INDEX IF NOT EXISTS idx_progress_shares_created_at ON progress_shares(created_at);
CREATE INDEX IF NOT EXISTS idx_accountability_requests_to_user ON accountability_requests(to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_accountability_partnerships_users ON accountability_partnerships(user1_id, user2_id, status);
CREATE INDEX IF NOT EXISTS idx_partner_encouragements_to_user ON partner_encouragements(to_user_id, created_at);

-- Social sharing and daily prompts tables

-- Daily prompts table for wellness content creation
CREATE TABLE IF NOT EXISTS daily_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('gratitude', 'mindfulness', 'growth', 'connection', 'selfcare', 'resilience', 'hope', 'reflection')),
  prompt_text TEXT NOT NULL,
  user_response TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- User prompt preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  prompt_categories TEXT[] DEFAULT '{}',
  notification_settings JSONB DEFAULT '{}',
  privacy_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Shareable content table for multi-platform sharing
CREATE TABLE IF NOT EXISTS shareable_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('mood_update', 'achievement', 'tip', 'quote', 'prompt_response', 'milestone')),
  base_content JSONB NOT NULL,
  platform_content JSONB NOT NULL,
  is_anonymous BOOLEAN DEFAULT true,
  platforms TEXT[] DEFAULT '{}',
  engagement_stats JSONB DEFAULT '{"views": 0, "likes": 0, "shares": 0}',
  shared_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Social sharing analytics table
CREATE TABLE IF NOT EXISTS sharing_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID REFERENCES shareable_content(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('view', 'like', 'share', 'comment', 'click')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content templates table for platform-specific formatting
CREATE TABLE IF NOT EXISTS content_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'x', 'facebook')),
  content_type TEXT NOT NULL,
  template_data JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(template_name, platform, content_type)
);

-- Enable RLS for social sharing tables
ALTER TABLE daily_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE shareable_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE sharing_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for daily_prompts
CREATE POLICY "Users can view own daily prompts" ON daily_prompts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily prompts" ON daily_prompts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily prompts" ON daily_prompts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own daily prompts" ON daily_prompts FOR DELETE USING (auth.uid() = user_id);

-- Create policies for user_preferences
CREATE POLICY "Users can view own preferences" ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON user_preferences FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for shareable_content
CREATE POLICY "Users can view own shareable content" ON shareable_content FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own shareable content" ON shareable_content FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own shareable content" ON shareable_content FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own shareable content" ON shareable_content FOR DELETE USING (auth.uid() = user_id);

-- Create policies for sharing_analytics
CREATE POLICY "Users can view analytics for own content" ON sharing_analytics 
FOR SELECT USING (auth.uid() = (SELECT user_id FROM shareable_content WHERE id = content_id));
CREATE POLICY "System can insert analytics" ON sharing_analytics FOR INSERT WITH CHECK (true);

-- Create policies for content_templates (public read)
CREATE POLICY "Anyone can view active content templates" ON content_templates FOR SELECT USING (is_active = true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_prompts_user_date ON daily_prompts(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_prompts_category ON daily_prompts(category);
CREATE INDEX IF NOT EXISTS idx_shareable_content_user_type ON shareable_content(user_id, content_type);
CREATE INDEX IF NOT EXISTS idx_shareable_content_created_at ON shareable_content(created_at);
CREATE INDEX IF NOT EXISTS idx_sharing_analytics_content_platform ON sharing_analytics(content_id, platform);

-- Insert default content templates
INSERT INTO content_templates (template_name, platform, content_type, template_data) VALUES
(
  'mood_update_story',
  'instagram',
  'mood_update',
  '{
    "format": "story",
    "template": "{title}\n\n{content}\n\n{hashtags}",
    "backgroundColor": "{backgroundColor}",
    "textColor": "#FFFFFF",
    "fontSize": 18,
    "alignment": "center"
  }'::jsonb
),
(
  'mood_update_post',
  'instagram',
  'mood_update',
  '{
    "format": "post",
    "template": "{content}\n\n{hashtags}",
    "imageStyle": "gradient",
    "textOverlay": true
  }'::jsonb
),
(
  'mood_update_video',
  'tiktok',
  'mood_update',
  '{
    "format": "video",
    "template": "{content}",
    "duration": 15,
    "hashtags": "{hashtags}",
    "videoStyle": "text_overlay"
  }'::jsonb
),
(
  'mood_update_tweet',
  'x',
  'mood_update',
  '{
    "format": "text",
    "template": "{content}\n\n{hashtags}",
    "maxLength": 280,
    "includeMedia": false
  }'::jsonb
),
(
  'mood_update_post',
  'facebook',
  'mood_update',
  '{
    "format": "post",
    "template": "{title}\n\n{content}\n\n{hashtags}",
    "privacy": "friends",
    "allowComments": true
  }'::jsonb
),
(
  'achievement_story',
  'instagram',
  'achievement',
  '{
    "format": "story",
    "template": "🎉 {title}\n\n{content}\n\n{hashtags}",
    "backgroundColor": "#98FB98",
    "textColor": "#FFFFFF",
    "celebrationStickers": ["🎉", "🏆", "✨"]
  }'::jsonb
),
(
  'tip_post',
  'instagram',
  'tip',
  '{
    "format": "post",
    "template": "💡 {title}\n\n{content}\n\n{hashtags}",
    "imageStyle": "tip_card",
    "backgroundColor": "#FFD700"
  }'::jsonb
),
(
  'quote_story',
  'instagram',
  'quote',
  '{
    "format": "story",
    "template": "✨ {title}\n\n{content}\n\n{hashtags}",
    "backgroundColor": "#DDA0DD",
    "textColor": "#FFFFFF",
    "fontStyle": "italic"
  }'::jsonb
)
ON CONFLICT (template_name, platform, content_type) DO NOTHING;

-- Function to automatically update user preferences on first prompt
CREATE OR REPLACE FUNCTION public.ensure_user_preferences()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id, prompt_categories, notification_settings, privacy_settings)
  VALUES (
    NEW.user_id, 
    ARRAY['gratitude', 'mindfulness', 'growth'],
    '{"daily_prompts": true, "achievements": true, "social_updates": false}'::jsonb,
    '{"anonymous_sharing": true, "public_profile": false}'::jsonb
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user preferences
DROP TRIGGER IF EXISTS on_daily_prompt_created ON daily_prompts;
CREATE TRIGGER on_daily_prompt_created
  AFTER INSERT ON daily_prompts
  FOR EACH ROW EXECUTE PROCEDURE public.ensure_user_preferences();

-- Configuration table for feature flags and remote configuration
CREATE TABLE IF NOT EXISTS config_table (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for config table (admin only)
ALTER TABLE config_table ENABLE ROW LEVEL SECURITY;

-- Create policy for config table (public read for active configs)
CREATE POLICY "Anyone can view active configs" ON config_table FOR SELECT USING (is_active = true);

-- Insert default feature flags
INSERT INTO config_table (config_key, config_value, description) VALUES
(
  'social_sharing_enabled',
  '{"enabled": true, "platforms": ["instagram", "tiktok", "x", "facebook"]}'::jsonb,
  'Controls availability of social sharing features'
),
(
  'ai_features_enabled',
  '{"journal_analysis": true, "mood_insights": true, "crisis_detection": true}'::jsonb,
  'Controls AI-powered features availability'
),
(
  'chat_features_enabled',
  '{"peer_chat": true, "group_rooms": true, "one_on_one": true, "moderation": true}'::jsonb,
  'Controls chat and peer support features'
),
(
  'daily_prompts_config',
  '{"enabled": true, "categories": ["gratitude", "mindfulness", "growth", "connection", "selfcare", "resilience", "hope", "reflection"], "max_per_day": 1}'::jsonb,
  'Configuration for daily prompts system'
),
(
  'content_moderation_config',
  '{"auto_moderation": true, "human_review": true, "crisis_keywords": ["suicide", "self-harm", "kill myself"], "sensitivity_level": "medium"}'::jsonb,
  'Content moderation and safety settings'
)
ON CONFLICT (config_key) DO NOTHING;