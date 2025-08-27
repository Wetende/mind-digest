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