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