-- =====================================================================
-- jellosanime: profiles + comments + "continue watching" (my_list.last_episode)
-- Paste this WHOLE file into the Supabase SQL editor and press Run.
-- It is safe to run more than once (it never deletes your data).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. PROFILES: one row per user (username, picture, theme choices)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null,
  avatar_url  text,
  accent      text not null default 'pink',
  mode        text not null default 'dark',
  title_lang  text not null default 'english',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Rules for the values (named, so re-running the file does not fail).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_username_format' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_username_format
      check (char_length(username) between 3 and 24 and username ~ '^[a-zA-Z0-9_]+$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_accent_check' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_accent_check
      check (accent in ('pink', 'purple', 'blue', 'green', 'orange'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_mode_check' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_mode_check
      check (mode in ('dark', 'light'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_title_lang_check' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_title_lang_check
      check (title_lang in ('english', 'romanized', 'native'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_avatar_https' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_avatar_https
      check (avatar_url is null or (avatar_url like 'https://%' and char_length(avatar_url) <= 500));
  end if;
end $$;

-- Usernames must be unique, ignoring upper/lower case ("Mia" and "mia" are the same name).
create unique index if not exists profiles_username_lower_key on public.profiles (lower(username));

-- Keeps updated_at fresh whenever a profile changes.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- 2. USERNAME PICKER: turns any text into a valid, unused username
--    (letters/numbers/underscore only, 3-24 long, adds a number if taken)
-- ---------------------------------------------------------------------
create or replace function public.pick_username(base text, uid uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  cleaned   text;
  candidate text;
  n         int := 0;
begin
  -- Remove every character that is not a letter, number or underscore.
  cleaned := regexp_replace(coalesce(base, ''), '[^a-zA-Z0-9_]', '', 'g');
  -- Too short after cleaning? Use a name made from the user's id.
  if char_length(cleaned) < 3 then
    cleaned := 'user' || substr(replace(uid::text, '-', ''), 1, 6);
  end if;
  -- Leave room for a number on the end.
  cleaned := left(cleaned, 18);
  candidate := cleaned;
  -- If the name is taken, try name1, name2, ... until a free one is found.
  while exists (select 1 from public.profiles p where lower(p.username) = lower(candidate)) loop
    n := n + 1;
    candidate := cleaned || n::text;
    exit when n > 500;
  end loop;
  -- Extremely unlikely fallback: the id itself is unique.
  if n > 500 then
    candidate := 'u' || substr(replace(uid::text, '-', ''), 1, 20);
  end if;
  return candidate;
end;
$$;

revoke execute on function public.pick_username(text, uuid) from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- 3. AUTO-CREATE A PROFILE when someone signs up (Google or e-mail)
--    "security definer" is needed because the sign-up system, not the
--    user, runs this. search_path is locked so it cannot be tricked.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_name text;
  picture   text;
begin
  -- Google gives full_name / name; otherwise use the part of the e-mail before the @.
  base_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );
  picture := coalesce(
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(new.raw_user_meta_data ->> 'picture', '')
  );
  -- Only keep a picture address that is a normal https link.
  if picture is not null and (picture not like 'https://%' or char_length(picture) > 500) then
    picture := null;
  end if;

  insert into public.profiles (id, username, avatar_url)
  values (new.id, public.pick_username(base_name, new.id), picture)
  on conflict (id) do nothing;
  return new;
exception when others then
  -- Never block a sign-up because of a profile problem. The app also works without a profile row.
  return new;
end;
$$;

-- Trigger functions do not need to be callable by website visitors.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: give a profile to everyone who signed up BEFORE this file was run.
do $$
declare
  u record;
begin
  for u in
    select au.id, au.email, au.raw_user_meta_data
    from auth.users au
    where not exists (select 1 from public.profiles p where p.id = au.id)
    order by au.created_at
  loop
    insert into public.profiles (id, username, avatar_url)
    values (
      u.id,
      public.pick_username(
        coalesce(
          nullif(u.raw_user_meta_data ->> 'full_name', ''),
          nullif(u.raw_user_meta_data ->> 'name', ''),
          split_part(coalesce(u.email, ''), '@', 1)
        ),
        u.id
      ),
      case
        when coalesce(nullif(u.raw_user_meta_data ->> 'avatar_url', ''), nullif(u.raw_user_meta_data ->> 'picture', '')) like 'https://%'
         and char_length(coalesce(nullif(u.raw_user_meta_data ->> 'avatar_url', ''), nullif(u.raw_user_meta_data ->> 'picture', ''))) <= 500
        then coalesce(nullif(u.raw_user_meta_data ->> 'avatar_url', ''), nullif(u.raw_user_meta_data ->> 'picture', ''))
        else null
      end
    )
    on conflict do nothing;
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- 4. PROFILES SECURITY: everyone can read, you can only edit your own
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public"
  on public.profiles for select
  to anon, authenticated
  using (true);

drop policy if exists "edit own profile" on public.profiles;
create policy "edit own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Start from nothing, then give back only what is needed.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
-- Only these columns can be edited (not id or created_at). No insert/delete from the website.
grant update (username, avatar_url, accent, mode, title_lang) on public.profiles to authenticated;


-- ---------------------------------------------------------------------
-- 5. COMMENTS
-- ---------------------------------------------------------------------
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  mal_id      int  not null,
  anime_title text not null,
  anime_image text,
  episode     int,
  body        text not null,
  spoiler     boolean not null default false,
  created_at  timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'comments_mal_id_pos' and conrelid = 'public.comments'::regclass) then
    alter table public.comments add constraint comments_mal_id_pos check (mal_id > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'comments_title_len' and conrelid = 'public.comments'::regclass) then
    alter table public.comments add constraint comments_title_len
      check (char_length(anime_title) between 1 and 200);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'comments_image_https' and conrelid = 'public.comments'::regclass) then
    alter table public.comments add constraint comments_image_https
      check (anime_image is null or (anime_image like 'https://%' and char_length(anime_image) <= 500));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'comments_episode_range' and conrelid = 'public.comments'::regclass) then
    alter table public.comments add constraint comments_episode_range
      check (episode is null or episode between 0 and 5000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'comments_body_len' and conrelid = 'public.comments'::regclass) then
    alter table public.comments add constraint comments_body_len
      check (char_length(btrim(body)) between 1 and 500);
  end if;
end $$;

-- Indexes: "comments for one anime, newest first" and "newest comments overall".
create index if not exists comments_mal_id_created_idx on public.comments (mal_id, created_at desc);
create index if not exists comments_created_idx        on public.comments (created_at desc);
-- Helps the rate-limit check below.
create index if not exists comments_user_created_idx   on public.comments (user_id, created_at desc);

-- Rate limit: at most 1 comment per 10 seconds and 30 per hour for each user.
create or replace function public.comments_rate_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.comments c
    where c.user_id = new.user_id and c.created_at > now() - interval '10 seconds'
  ) then
    raise exception 'You are commenting too fast. Please wait a few seconds.'
      using errcode = 'P0001', hint = 'rate_limit_seconds';
  end if;

  if (
    select count(*) from public.comments c
    where c.user_id = new.user_id and c.created_at > now() - interval '1 hour'
  ) >= 30 then
    raise exception 'You have reached the limit of 30 comments per hour. Please try again later.'
      using errcode = 'P0001', hint = 'rate_limit_hour';
  end if;

  return new;
end;
$$;

drop trigger if exists comments_rate_limit_trg on public.comments;
create trigger comments_rate_limit_trg
  before insert on public.comments
  for each row execute function public.comments_rate_limit();

-- COMMENTS SECURITY: everyone reads; only logged-in users add; you delete your own.
alter table public.comments enable row level security;

drop policy if exists "comments are public" on public.comments;
create policy "comments are public"
  on public.comments for select
  to anon, authenticated
  using (true);

drop policy if exists "add own comment" on public.comments;
create policy "add own comment"
  on public.comments for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "delete own comment" on public.comments;
create policy "delete own comment"
  on public.comments for delete
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.comments from anon, authenticated;
grant select on public.comments to anon, authenticated;
grant insert (user_id, mal_id, anime_title, anime_image, episode, body, spoiler) on public.comments to authenticated;
grant delete on public.comments to authenticated;


-- ---------------------------------------------------------------------
-- 6. MY LIST: remember the last episode watched ("continue watching")
-- ---------------------------------------------------------------------
alter table public.my_list add column if not exists last_episode int not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'my_list_last_episode_range' and conrelid = 'public.my_list'::regclass) then
    alter table public.my_list add constraint my_list_last_episode_range
      check (last_episode between 0 and 5000);
  end if;
end $$;

-- Allow a user to update their own rows (needed for the "+1 episode" button).
drop policy if exists "update own list" on public.my_list;
create policy "update own list"
  on public.my_list for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Only the episode number can be changed (not the title, owner, etc.).
revoke update on public.my_list from authenticated;
grant update (last_episode) on public.my_list to authenticated;

-- Done. Check the Table Editor: profiles, comments, and my_list.last_episode should exist.
