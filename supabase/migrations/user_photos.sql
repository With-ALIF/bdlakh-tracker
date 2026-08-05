-- =============================================================
-- Global Photo Table — Full Migration
-- Run this ONCE in Supabase SQL Editor
-- =============================================================

-- 1. Create user_photos table
create table if not exists public.user_photos (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  photo_url  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Enable RLS
alter table public.user_photos enable row level security;

-- 3. RLS Policies (safe to run multiple times)
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'Anyone can read user photos' and tablename = 'user_photos'
  ) then
    create policy "Anyone can read user photos"
      on public.user_photos for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'Users can insert own photo' and tablename = 'user_photos'
  ) then
    create policy "Users can insert own photo"
      on public.user_photos for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'Users can update own photo' and tablename = 'user_photos'
  ) then
    create policy "Users can update own photo"
      on public.user_photos for update using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'Users can delete own photo' and tablename = 'user_photos'
  ) then
    create policy "Users can delete own photo"
      on public.user_photos for delete using (auth.uid() = user_id);
  end if;
end $$;

-- 4. Auto-update updated_at trigger
create or replace function public.handle_user_photo_update()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_user_photo_updated on public.user_photos;
create trigger on_user_photo_updated
  before update on public.user_photos
  for each row execute function public.handle_user_photo_update();

-- 5. Upsert helper function
create or replace function public.upsert_user_photo(
  p_user_id uuid,
  p_photo_url text
)
returns void as $$
begin
  insert into public.user_photos (user_id, photo_url)
  values (p_user_id, p_photo_url)
  on conflict (user_id) do update
  set photo_url = excluded.photo_url,
      updated_at = now();
end;
$$ language plpgsql security invoker;

grant execute on function public.upsert_user_photo(uuid, text) to authenticated;

-- 6. Migrate existing data from profiles.photo_url → user_photos
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'photo_url'
  ) then
    insert into public.user_photos (user_id, photo_url, created_at, updated_at)
    select id, photo_url, now(), now()
    from public.profiles
    where photo_url is not null and photo_url != ''
    on conflict (user_id) do update
    set photo_url = excluded.photo_url,
        updated_at = now();

    alter table public.profiles drop column if exists photo_url;

    raise notice 'Migration complete: photo_url moved to user_photos and column dropped from profiles';
  else
    raise notice 'profiles.photo_url does not exist — skipping migration';
  end if;
end $$;
