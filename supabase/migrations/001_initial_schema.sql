-- Dream Cloud Studio Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'trial' CHECK (subscription_tier IN ('trial', 'lite', 'basic', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PLATFORMS (creative platforms/brands)
-- ============================================
CREATE TABLE platforms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  color_palette JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROJECTS
-- ============================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform_id UUID REFERENCES platforms(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROJECT BRIEFS
-- ============================================
CREATE TABLE project_briefs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  audience TEXT,
  tone TEXT,
  duration TEXT,
  aspect_ratio TEXT DEFAULT '16:9' CHECK (aspect_ratio IN ('16:9', '9:16', '1:1', '4:5', '4:3', '21:9')),
  goals JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MOOD BOARDS
-- ============================================
CREATE TABLE mood_boards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  images JSONB DEFAULT '[]'::jsonb,  -- [{id, url, name}]
  colors JSONB DEFAULT '[]'::jsonb,  -- ["#hex1", "#hex2"]
  keywords JSONB DEFAULT '[]'::jsonb, -- ["word1", "word2"]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STORYBOARDS (narrative structure)
-- ============================================
CREATE TABLE storyboards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  acts JSONB DEFAULT '[]'::jsonb, -- [{id, name, description, beats: [{id, description}]}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STORYBOARD CARDS (LLM-generated content)
-- ============================================
CREATE TABLE storyboard_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  thumbnail_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SCENES
-- ============================================
CREATE TABLE scenes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  voiceover_script TEXT,
  voiceover_audio_url TEXT,
  voiceover_duration REAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SHOTS
-- ============================================
CREATE TABLE shots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration REAL DEFAULT 3.0,
  sort_order INTEGER DEFAULT 0,
  shot_type TEXT,
  notes TEXT,
  -- Asset references stored as JSON for flexibility
  asset_config JSONB DEFAULT '{}'::jsonb,
  -- Generated media
  media_type TEXT CHECK (media_type IN ('image', 'video')),
  media_url TEXT,
  media_thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ASSETS (media library)
-- ============================================
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE, -- NULL = global asset
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'audio')),
  category TEXT CHECK (category IN ('scene', 'stage', 'character', 'weather', 'prop', 'effect', 'audio', 'voiceover', 'soundtrack', 'sfx')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration REAL, -- for video/audio
  file_size INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EXPORT SETTINGS
-- ============================================
CREATE TABLE export_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  resolution TEXT DEFAULT '1080p' CHECK (resolution IN ('720p', '1080p', '4k')),
  format TEXT DEFAULT 'mp4' CHECK (format IN ('mp4', 'webm', 'mov')),
  frame_rate INTEGER DEFAULT 30 CHECK (frame_rate IN (24, 30, 60)),
  quality TEXT DEFAULT 'high' CHECK (quality IN ('draft', 'standard', 'high')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USAGE TRACKING
-- ============================================
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  images_generated INTEGER DEFAULT 0,
  videos_generated INTEGER DEFAULT 0,
  audio_minutes_used REAL DEFAULT 0,
  storage_bytes_used BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period_start)
);

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX idx_platforms_user_id ON platforms(user_id);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_platform_id ON projects(platform_id);
CREATE INDEX idx_scenes_project_id ON scenes(project_id);
CREATE INDEX idx_shots_scene_id ON shots(scene_id);
CREATE INDEX idx_assets_user_id ON assets(user_id);
CREATE INDEX idx_assets_project_id ON assets(project_id);
CREATE INDEX idx_storyboard_cards_project_id ON storyboard_cards(project_id);
CREATE INDEX idx_usage_tracking_user_id ON usage_tracking(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE storyboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE storyboard_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shots ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only access their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Platforms: users can only access their own platforms
CREATE POLICY "Users can manage own platforms" ON platforms
  FOR ALL USING (auth.uid() = user_id);

-- Projects: users can only access their own projects
CREATE POLICY "Users can manage own projects" ON projects
  FOR ALL USING (auth.uid() = user_id);

-- Project briefs: access through project ownership
CREATE POLICY "Users can manage own project briefs" ON project_briefs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_briefs.project_id AND projects.user_id = auth.uid())
  );

-- Mood boards: access through project ownership
CREATE POLICY "Users can manage own mood boards" ON mood_boards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = mood_boards.project_id AND projects.user_id = auth.uid())
  );

-- Storyboards: access through project ownership
CREATE POLICY "Users can manage own storyboards" ON storyboards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = storyboards.project_id AND projects.user_id = auth.uid())
  );

-- Storyboard cards: access through project ownership
CREATE POLICY "Users can manage own storyboard cards" ON storyboard_cards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = storyboard_cards.project_id AND projects.user_id = auth.uid())
  );

-- Scenes: access through project ownership
CREATE POLICY "Users can manage own scenes" ON scenes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = scenes.project_id AND projects.user_id = auth.uid())
  );

-- Shots: access through scene -> project ownership
CREATE POLICY "Users can manage own shots" ON shots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM scenes
      JOIN projects ON projects.id = scenes.project_id
      WHERE scenes.id = shots.scene_id AND projects.user_id = auth.uid()
    )
  );

-- Assets: users can access their own assets
CREATE POLICY "Users can manage own assets" ON assets
  FOR ALL USING (auth.uid() = user_id);

-- Export settings: access through project ownership
CREATE POLICY "Users can manage own export settings" ON export_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = export_settings.project_id AND projects.user_id = auth.uid())
  );

-- Usage tracking: users can only view their own usage
CREATE POLICY "Users can view own usage" ON usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_platforms_updated_at BEFORE UPDATE ON platforms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_project_briefs_updated_at BEFORE UPDATE ON project_briefs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_mood_boards_updated_at BEFORE UPDATE ON mood_boards FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_storyboards_updated_at BEFORE UPDATE ON storyboards FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_storyboard_cards_updated_at BEFORE UPDATE ON storyboard_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_scenes_updated_at BEFORE UPDATE ON scenes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_shots_updated_at BEFORE UPDATE ON shots FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_export_settings_updated_at BEFORE UPDATE ON export_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_usage_tracking_updated_at BEFORE UPDATE ON usage_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to initialize usage tracking for new month
CREATE OR REPLACE FUNCTION get_or_create_usage_tracking(p_user_id UUID)
RETURNS usage_tracking AS $$
DECLARE
  v_result usage_tracking;
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  v_period_start := DATE_TRUNC('month', CURRENT_DATE);
  v_period_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  SELECT * INTO v_result FROM usage_tracking
  WHERE user_id = p_user_id AND period_start = v_period_start;

  IF NOT FOUND THEN
    INSERT INTO usage_tracking (user_id, period_start, period_end)
    VALUES (p_user_id, v_period_start, v_period_end)
    RETURNING * INTO v_result;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
