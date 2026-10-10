-- Catch: initial schema. Run against a Supabase project in eu-central-1 (Frankfurt).

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text, headline text, company text,
  linkedin_url text, handle text unique,
  purpose text default 'selling' check (purpose in ('selling','hiring','networking')),
  max_note_length int default 200,
  connect_mode text default 'assisted' check (connect_mode in ('assisted','direct')),
  auto_delete_months int default 12,
  created_at timestamptz default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  name text not null, event_date date default current_date,
  followup_delay_days int default 2, created_at timestamptz default now()
);

-- Additions to the brief's schema: which event is active, and loading-screen progress.
alter table public.profiles
  add column current_event_id uuid references public.events on delete set null,
  add column ai_personalise boolean default true;

create table public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  event_id uuid references public.events on delete set null,
  source text not null check (source in ('linkedin_qr','card','digital_card','link','manual','self_submitted')),
  full_name text, first_name text, headline text, role_title text, company text,
  location text, email text, phone text, website text, linkedin_url text, photo_path text,
  priority text default 'just_met' check (priority in ('priority','follow_up','just_met')),
  notes text, voice_transcript text, ai_summary text, next_steps jsonb,
  brief jsonb, raw_enrichment jsonb,
  enrichment_status text default 'pending' check (enrichment_status in ('pending','ok','partial','failed')),
  enrichment_step text check (enrichment_step in ('qr_read','profile_found','reading','writing_brief','done')),
  consent_basis text check (consent_basis in ('public_profile','card_given','self_submitted')),
  consent_at timestamptz, delete_after timestamptz,
  followup_due date, followed_up_at timestamptz,
  created_at timestamptz default now()
);
create index people_user_created_idx on public.people (user_id, created_at desc);
create index people_delete_after_idx on public.people (delete_after) where delete_after is not null;

create table public.connect_requests (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  note text, mode text default 'assisted',
  status text default 'queued' check (status in ('queued','sent','accepted')),
  queued_at timestamptz default now(), sent_at timestamptz, accepted_at timestamptz
);
create unique index connect_requests_person_idx on public.connect_requests (person_id);

create table public.note_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  name text, body text, is_default boolean default false
);

create table public.usage_events (   -- pilot telemetry
  id bigint generated always as identity primary key,
  user_id uuid, event text, person_id uuid, meta jsonb, at timestamptz default now()
);
create index usage_events_event_idx on public.usage_events (event, at);

-- Per-user enrichment cache (30 days) so the same LinkedIn URL is not paid for twice.
-- Per-user rather than global so a hard delete can remove it without touching other accounts.
create table public.enrichment_cache (
  user_id uuid not null references public.profiles on delete cascade,
  linkedin_url text not null,
  profile jsonb not null,
  fetched_at timestamptz default now(),
  primary key (user_id, linkedin_url)
);

-- ---------- Row-level security ----------
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.people enable row level security;
alter table public.connect_requests enable row level security;
alter table public.note_templates enable row level security;
alter table public.usage_events enable row level security;
alter table public.enrichment_cache enable row level security;

create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own events" on public.events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own people" on public.people
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own connect requests" on public.connect_requests
  for all using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.people p where p.id = person_id and p.user_id = auth.uid())
  );
create policy "own note templates" on public.note_templates
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "insert own usage" on public.usage_events
  for insert with check (user_id = auth.uid());
create policy "read own usage" on public.usage_events
  for select using (user_id = auth.uid());
create policy "own enrichment cache" on public.enrichment_cache
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- New user -> profile row ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  base := lower(regexp_replace(coalesce(split_part(new.email, '@', 1), 'me'), '[^a-z0-9]+', '', 'g'));
  if base = '' then base := 'me'; end if;
  candidate := base;
  while exists (select 1 from public.profiles where handle = candidate) loop
    n := n + 1;
    candidate := base || n::text;
  end loop;
  insert into public.profiles (id, display_name, handle)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), candidate);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Auto delete ----------
-- Rows are removed by the scheduled route /api/cron/cleanup (Vercel Cron, daily), which also removes
-- storage objects. This SQL function is the database half and can also be scheduled with pg_cron:
--   select cron.schedule('catch-delete-expired', '17 3 * * *', $$select public.delete_expired_people()$$);
create or replace function public.delete_expired_people()
returns int language plpgsql security definer set search_path = public as $$
declare removed int;
begin
  delete from public.enrichment_cache c
   using public.people p
   where p.delete_after < now() and c.user_id = p.user_id and c.linkedin_url = p.linkedin_url;
  delete from public.people where delete_after < now();
  get diagnostics removed = row_count;
  return removed;
end $$;
revoke all on function public.delete_expired_people() from public, anon, authenticated;
