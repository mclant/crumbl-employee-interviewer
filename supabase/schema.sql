-- Run this in the Supabase SQL Editor

-- Candidates table
create table if not exists public.candidates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  status text default 'in_progress' check (status in ('in_progress', 'complete', 'reviewed')),
  overall_score numeric,
  created_at timestamptz default now()
);

-- Responses table (one row per question per candidate)
create table if not exists public.responses (
  id uuid default gen_random_uuid() primary key,
  candidate_id uuid references public.candidates(id) on delete cascade,
  question_id text not null,
  video_path text,
  scores jsonb,
  processing_status text default 'pending' check (processing_status in ('pending', 'processing', 'complete', 'error')),
  processed_at timestamptz,
  created_at timestamptz default now(),

  unique(candidate_id, question_id)
);

-- Enable Realtime on both tables (for the franchise partner dashboard)
alter publication supabase_realtime add table public.candidates;
alter publication supabase_realtime add table public.responses;

-- Create the storage bucket for interview videos
insert into storage.buckets (id, name, public)
values ('interview-videos', 'interview-videos', false)
on conflict (id) do nothing;

-- Storage policy: allow uploads from authenticated or anon users (hackathon)
create policy "Allow video uploads" on storage.objects
  for insert with check (bucket_id = 'interview-videos');

create policy "Allow video reads for service role" on storage.objects
  for select using (bucket_id = 'interview-videos');

-- RLS: open for hackathon (tighten later)
alter table public.candidates enable row level security;
alter table public.responses enable row level security;

create policy "Allow all candidate operations (hackathon)" on public.candidates
  for all using (true) with check (true);

create policy "Allow all response operations (hackathon)" on public.responses
  for all using (true) with check (true);

-- Index for fast lookups
create index if not exists idx_responses_candidate on public.responses (candidate_id);
