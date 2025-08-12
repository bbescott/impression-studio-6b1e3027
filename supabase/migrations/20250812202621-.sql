-- Create creator_profiles table for Basic/Advanced settings
CREATE TABLE public.creator_profiles (
  user_id uuid NOT NULL PRIMARY KEY,
  bio text,
  goals text,
  niche text,
  audience text,
  tone text,
  links jsonb,
  brand_keywords text[],
  do_donts jsonb,
  ctas text[],
  platform_prefs jsonb,
  cadence text,
  auto_generation_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for creator_profiles
CREATE POLICY "Users can view their own creator profile"
  ON public.creator_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own creator profile"
  ON public.creator_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own creator profile"
  ON public.creator_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own creator profile"
  ON public.creator_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at trigger
CREATE TRIGGER trg_creator_profiles_updated_at
BEFORE UPDATE ON public.creator_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create library_assets table for media library
CREATE TABLE public.library_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid,
  type text NOT NULL, -- e.g. 'full', 'monologue', 'short'
  title text,
  description text,
  duration_seconds integer,
  video_path text,
  audio_path text,
  thumbnail_path text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_library_assets_user ON public.library_assets(user_id);
CREATE INDEX idx_library_assets_created ON public.library_assets(created_at DESC);
CREATE INDEX idx_library_assets_type ON public.library_assets(type);

-- Enable RLS
ALTER TABLE public.library_assets ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own assets"
  ON public.library_assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assets"
  ON public.library_assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assets"
  ON public.library_assets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assets"
  ON public.library_assets FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at trigger
CREATE TRIGGER trg_library_assets_updated_at
BEFORE UPDATE ON public.library_assets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create generated_posts table for AI-generated post suggestions
CREATE TABLE public.generated_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  asset_id uuid NULL REFERENCES public.library_assets(id) ON DELETE SET NULL,
  platform text, -- e.g. 'linkedin', 'twitter', 'instagram'
  content text NOT NULL,
  status text NOT NULL DEFAULT 'draft', -- 'draft' | 'scheduled' | 'published'
  scheduled_at timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_generated_posts_user ON public.generated_posts(user_id);
CREATE INDEX idx_generated_posts_scheduled ON public.generated_posts(scheduled_at);

-- Enable RLS
ALTER TABLE public.generated_posts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own posts"
  ON public.generated_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own posts"
  ON public.generated_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON public.generated_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON public.generated_posts FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at trigger
CREATE TRIGGER trg_generated_posts_updated_at
BEFORE UPDATE ON public.generated_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();