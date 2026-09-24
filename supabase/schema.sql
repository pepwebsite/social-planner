-- Regia · schema database (Supabase)
-- Da eseguire una volta in Supabase: SQL Editor → New query → incolla tutto → Run.

-- Profilo pubblico dell'utente (nome), creato in automatico alla registrazione
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now()
);

-- Tutti i dati di lavoro dell'utente: clienti, contenuti, eventi, attività
create table if not exists public.workspaces (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  -- Provider AI collegati (chiavi comprese): leggibili solo dal proprietario
  ai jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Accesso dall'app solo per utenti autenticati (serve se "expose new tables" è disattivato)
revoke all on public.profiles, public.workspaces from anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.workspaces to authenticated;

-- Sicurezza: ogni utente vede e modifica solo le proprie righe
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;

drop policy if exists "profilo: lettura propria" on public.profiles;
create policy "profilo: lettura propria" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profilo: modifica propria" on public.profiles;
create policy "profilo: modifica propria" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "workspace: lettura propria" on public.workspaces;
create policy "workspace: lettura propria" on public.workspaces
  for select using (auth.uid() = user_id);

drop policy if exists "workspace: creazione propria" on public.workspaces;
create policy "workspace: creazione propria" on public.workspaces
  for insert with check (auth.uid() = user_id);

drop policy if exists "workspace: modifica propria" on public.workspaces;
create policy "workspace: modifica propria" on public.workspaces
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "workspace: eliminazione propria" on public.workspaces;
create policy "workspace: eliminazione propria" on public.workspaces
  for delete using (auth.uid() = user_id);

-- Alla registrazione crea profilo e workspace vuoto
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.email, ''))
  on conflict (id) do nothing;
  insert into public.workspaces (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
