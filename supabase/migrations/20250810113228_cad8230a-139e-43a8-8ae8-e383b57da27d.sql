-- Fixing migration with safe drops before creating policies
create extension if not exists pgcrypto;

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null,
  question_index integer not null,
  question text not null,
  transcript text,
  audio_path text,
  video_path text,
  duration_seconds integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_transcripts_user_session on public.transcripts (user_id, session_id);
create index if not exists idx_transcripts_session_q on public.transcripts (session_id, question_index);

alter table public.transcripts enable row level security;

-- Drop and recreate transcript policies to avoid IF NOT EXISTS issues
drop policy if exists "Users can view their own transcripts" on public.transcripts;
drop policy if exists "Users can insert their own transcripts" on public.transcripts;
drop policy if exists "Users can update their own transcripts" on public.transcripts;
drop policy if exists "Users can delete their own transcripts" on public.transcripts;

create policy "Users can view their own transcripts"
  on public.transcripts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own transcripts"
  on public.transcripts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own transcripts"
  on public.transcripts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own transcripts"
  on public.transcripts for delete
  using (auth.uid() = user_id);

create or replace trigger update_transcripts_updated_at
before update on public.transcripts
for each row execute function public.update_updated_at_column();

-- Create the private bucket
insert into storage.buckets (id, name, public) values ('recordings', 'recordings', false)
on conflict (id) do nothing;

-- Storage policies: drop then create
drop policy if exists "Users can view their own recordings" on storage.objects;
drop policy if exists "Users can upload their own recordings" on storage.objects;
drop policy if exists "Users can update their own recordings" on storage.objects;
drop policy if exists "Users can delete their own recordings" on storage.objects;

create policy "Users can view their own recordings"
  on storage.objects for select
  using (
    bucket_id = 'recordings' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can upload their own recordings"
  on storage.objects for insert
  with check (
    bucket_id = 'recordings' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own recordings"
  on storage.objects for update
  using (
    bucket_id = 'recordings' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own recordings"
  on storage.objects for delete
  using (
    bucket_id = 'recordings' and
    auth.uid()::text = (storage.foldername(name))[1]
  );