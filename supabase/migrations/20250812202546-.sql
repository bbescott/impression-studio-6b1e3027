-- Create creator_profiles table for Basic/Advanced settings
create table if not exists public.creator_profiles (
  user_id uuid not null primary key,
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
  auto_generation_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.creator_profiles enable row level security;

-- RLS policies for creator_profiles
create policy if not exists "Users can view their own creator profile"
  on public.creator_profiles for select
  using (auth.uid() = user_id);

create policy if not exists "Users can insert their own creator profile"
  on public.creator_profiles for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can update their own creator profile"
  on public.creator_profiles for update
  using (auth.uid() = user_id);

create policy if not exists "Users can delete their own creator profile"
  on public.creator_profiles for delete
  using (auth.uid() = user_id);

-- updated_at trigger
create trigger if not exists trg_creator_profiles_updated_at
before update on public.creator_profiles
for each row execute function public.update_updated_at_column();

-- Create library_assets table for media library
create table if not exists public.library_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid,
  type text not null, -- e.g. 'full', 'monologue', 'short'
  title text,
  description text,
  duration_seconds integer,
  video_path text,
  audio_path text,
  thumbnail_path text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_library_assets_user on public.library_assets(user_id);
create index if not exists idx_library_assets_created on public.library_assets(created_at desc);
create index if not exists idx_library_assets_type on public.library_assets(type);

-- Enable RLS
alter table public.library_assets enable row level security;

-- RLS policies
create policy if not exists "Users can view their own assets"
  on public.library_assets for select
  using (auth.uid() = user_id);

create policy if not exists "Users can insert their own assets"
  on public.library_assets for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can update their own assets"
  on public.library_assets for update
  using (auth.uid() = user_id);

create policy if not exists "Users can delete their own assets"
  on public.library_assets for delete
  using (auth.uid() = user_id);

-- updated_at trigger
create trigger if not exists trg_library_assets_updated_at
before update on public.library_assets
for each row execute function public.update_updated_at_column();

-- Create generated_posts table for AI-generated post suggestions
create table if not exists public.generated_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  asset_id uuid null references public.library_assets(id) on delete set null,
  platform text, -- e.g. 'linkedin', 'twitter', 'instagram'
  content text not null,
  status text not null default 'draft', -- 'draft' | 'scheduled' | 'published'
  scheduled_at timestamptz,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_generated_posts_user on public.generated_posts(user_id);
create index if not exists idx_generated_posts_scheduled on public.generated_posts(scheduled_at);

-- Enable RLS
alter table public.generated_posts enable row level security;

-- RLS policies
create policy if not exists "Users can view their own posts"
  on public.generated_posts for select
  using (auth.uid() = user_id);

create policy if not exists "Users can insert their own posts"
  on public.generated_posts for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can update their own posts"
  on public.generated_posts for update
  using (auth.uid() = user_id);

create policy if not exists "Users can delete their own posts"
  on public.generated_posts for delete
  using (auth.uid() = user_id);

-- updated_at trigger
create trigger if not exists trg_generated_posts_updated_at
before update on public.generated_posts
for each row execute function public.update_updated_at_column();