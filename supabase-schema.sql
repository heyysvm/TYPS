-- ============================================
-- TYPS - Supabase Database Schema
-- ============================================

-- 1. Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  email text,
  theme text default 'yellow',
  avatar_url text,
  created_at timestamptz default now()
);

-- 2. Tests table
create table if not exists public.tests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  wpm int not null,
  raw_wpm int,
  accuracy int not null,
  tier text,
  mode text,
  word_count int,
  time_limit int,
  elapsed real,
  chars_correct int default 0,
  chars_incorrect int default 0,
  chars_extra int default 0,
  chars_missed int default 0,
  created_at timestamptz default now()
);

-- 3. Indexes
create index if not exists idx_tests_user_id on public.tests(user_id);
create index if not exists idx_tests_created_at on public.tests(created_at desc);
create index if not exists idx_tests_wpm on public.tests(wpm desc);

-- 4. Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.tests enable row level security;

-- 5. RLS Policies for profiles
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 6. RLS Policies for tests
create policy "Tests are viewable by everyone"
  on public.tests for select
  using (true);

create policy "Users can insert their own tests"
  on public.tests for insert
  with check (auth.uid() = user_id);

-- 7. Trigger to auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid conflicts
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
