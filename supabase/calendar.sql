-- Regia · link privato del calendario (per Google Calendar / calendario del telefono)
-- Da eseguire una volta in Supabase: SQL Editor → New query → incolla tutto → Run.

create table if not exists public.calendar_feeds (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token text not null unique check (length(token) >= 32),
  created_at timestamptz not null default now()
);

alter table public.calendar_feeds enable row level security;
revoke all on public.calendar_feeds from anon;
grant select, insert, update, delete on public.calendar_feeds to authenticated;

drop policy if exists "feed: lettura propria" on public.calendar_feeds;
create policy "feed: lettura propria" on public.calendar_feeds
  for select using ((select auth.uid()) = user_id);
drop policy if exists "feed: creazione propria" on public.calendar_feeds;
create policy "feed: creazione propria" on public.calendar_feeds
  for insert with check ((select auth.uid()) = user_id);
drop policy if exists "feed: modifica propria" on public.calendar_feeds;
create policy "feed: modifica propria" on public.calendar_feeds
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "feed: eliminazione propria" on public.calendar_feeds;
create policy "feed: eliminazione propria" on public.calendar_feeds
  for delete using ((select auth.uid()) = user_id);

-- Restituisce SOLO i dati da mostrare nel calendario (niente contatti, testi o chiavi AI),
-- a chi conosce il token segreto del link.
create or replace function public.calendar_feed(feed_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'clients', coalesce((
      select jsonb_agg(jsonb_build_object('id', c -> 'id', 'name', c -> 'name'))
      from jsonb_array_elements(coalesce(w.data -> 'clients', '[]'::jsonb)) c
    ), '[]'::jsonb),
    'posts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p -> 'id', 'clientId', p -> 'clientId', 'date', p -> 'date', 'time', p -> 'time',
        'platform', p -> 'platform', 'format', p -> 'format', 'title', p -> 'title', 'status', p -> 'status'))
      from jsonb_array_elements(coalesce(w.data -> 'posts', '[]'::jsonb)) p
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e -> 'id', 'clientId', e -> 'clientId', 'name', e -> 'name', 'date', e -> 'date',
        'time', e -> 'time', 'location', e -> 'location'))
      from jsonb_array_elements(coalesce(w.data -> 'events', '[]'::jsonb)) e
    ), '[]'::jsonb),
    'tasks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t -> 'id', 'clientId', t -> 'clientId', 'title', t -> 'title', 'due', t -> 'due', 'done', t -> 'done'))
      from jsonb_array_elements(coalesce(w.data -> 'tasks', '[]'::jsonb)) t
    ), '[]'::jsonb)
  )
  from public.workspaces w
  join public.calendar_feeds f on f.user_id = w.user_id
  where f.token = feed_token and length(feed_token) >= 32
$$;

revoke all on function public.calendar_feed(text) from public;
grant execute on function public.calendar_feed(text) to anon;
