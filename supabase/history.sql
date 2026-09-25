-- Regia · cronologia dei dati (copie di sicurezza automatiche nel database)
-- Da eseguire una volta in Supabase: SQL Editor → New query → incolla tutto → Run.
-- Ogni volta che i dati cambiano, la versione precedente viene conservata:
-- al massimo una copia ogni 15 minuti, e sempre quando spariscono clienti o contenuti.

create table if not exists public.workspace_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  clients_count int not null default 0,
  posts_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists workspace_history_user_idx on public.workspace_history (user_id, created_at desc);

alter table public.workspace_history enable row level security;
revoke all on public.workspace_history from anon;
grant select on public.workspace_history to authenticated;

drop policy if exists "cronologia: lettura propria" on public.workspace_history;
create policy "cronologia: lettura propria" on public.workspace_history
  for select using ((select auth.uid()) = user_id);

create or replace function public.jsonb_len(v jsonb)
returns int
language sql
immutable
as $$ select case when jsonb_typeof(v) = 'array' then jsonb_array_length(v) else 0 end $$;

create or replace function public.snapshot_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  last_at timestamptz;
  old_clients int := public.jsonb_len(old.data -> 'clients');
  old_posts int := public.jsonb_len(old.data -> 'posts');
begin
  if old.data is not distinct from new.data or (old_clients = 0 and old_posts = 0) then
    return new;
  end if;

  select max(created_at) into last_at from public.workspace_history where user_id = old.user_id;

  if last_at is null
     or last_at < now() - interval '15 minutes'
     or public.jsonb_len(new.data -> 'clients') < old_clients
     or public.jsonb_len(new.data -> 'posts') < old_posts then
    insert into public.workspace_history (user_id, data, clients_count, posts_count)
    values (old.user_id, old.data, old_clients, old_posts);

    -- Conserva le ultime 200 copie e comunque tutte quelle degli ultimi 7 giorni
    delete from public.workspace_history h
    where h.user_id = old.user_id
      and h.created_at < now() - interval '7 days'
      and h.id not in (
        select id from public.workspace_history
        where user_id = old.user_id
        order by created_at desc
        limit 200
      );
  end if;
  return new;
end;
$$;

drop trigger if exists workspace_snapshot on public.workspaces;
create trigger workspace_snapshot
  before update on public.workspaces
  for each row execute function public.snapshot_workspace();

-- Funzioni interne: non richiamabili dall'esterno
revoke execute on function public.snapshot_workspace() from public, anon, authenticated;
revoke execute on function public.jsonb_len(jsonb) from public, anon;
