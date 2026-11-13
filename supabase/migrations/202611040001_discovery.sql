-- Phase 2 only: public-data cache and durable global credit/rate reservations.
-- No profile, authentication, trip, or user-content tables.
begin;
-- Refuse unrecorded collisions before touching existing project objects.
do $$ begin
  if to_regclass('public.discovery_cache') is not null
    or to_regclass('public.discovery_usage') is not null
    or to_regclass('public.discovery_gate') is not null
    or to_regprocedure('public.discovery_acquire(text,integer)') is not null
    or to_regprocedure('public.discovery_complete(text,uuid,jsonb)') is not null then
    raise exception 'Discovery objects already exist; stop for migration review';
  end if;
end $$;
create table if not exists public.discovery_cache (
  key text primary key check (key ~ '^[a-f0-9]{64}$'),
  payload jsonb check (octet_length(payload::text) <= 200000),
  lease uuid not null default gen_random_uuid(),
  expires_at timestamptz not null
);
create table if not exists public.discovery_usage (
  day date primary key,
  credits integer not null default 0 check (credits between 0 and 2000)
);
create table if not exists public.discovery_gate (
  id boolean primary key default true check (id),
  next_at timestamptz not null default '-infinity'
);
insert into public.discovery_gate(id) values (true) on conflict do nothing;
alter table public.discovery_cache enable row level security;
alter table public.discovery_usage enable row level security;
alter table public.discovery_gate enable row level security;
revoke all on public.discovery_cache, public.discovery_usage, public.discovery_gate from public, anon, authenticated;

create or replace function public.discovery_acquire(p_key text, p_budget integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  cached public.discovery_cache%rowtype;
  used integer;
  token uuid;
  stamp timestamptz := clock_timestamp();
  today date := (stamp at time zone 'UTC')::date;
  next_slot timestamptz;
begin
  if p_key !~ '^[a-f0-9]{64}$' or p_budget is null or p_budget < 1 or p_budget > 2000 then
    raise exception 'Invalid discovery reservation';
  end if;
  -- One transaction lock serializes all instances; neither CORS nor a public key is an abuse barrier.
  select next_at into next_slot from public.discovery_gate where id = true for update;
  if not found then raise exception 'Discovery gate unavailable'; end if;
  stamp := clock_timestamp();
  today := (stamp at time zone 'UTC')::date;
  select * into cached from public.discovery_cache where key = p_key;
  if found and cached.expires_at > stamp then
    if cached.payload is not null then return jsonb_build_object('state','hit','payload',cached.payload); end if;
    return jsonb_build_object('state','busy');
  end if;
  if next_slot > stamp then return jsonb_build_object('state','busy'); end if;
  delete from public.discovery_cache where expires_at <= stamp;
  delete from public.discovery_usage where day < today - 7;
  if (select count(*) from public.discovery_cache) >= 256 then
    delete from public.discovery_cache where key in (select key from public.discovery_cache where payload is not null order by expires_at limit 1);
    if (select count(*) from public.discovery_cache) >= 256 then return jsonb_build_object('state','busy'); end if;
  end if;
  insert into public.discovery_usage(day) values (today) on conflict do nothing;
  select credits into used from public.discovery_usage where day = today for update;
  if used >= p_budget then return jsonb_build_object('state','limited'); end if;
  update public.discovery_usage set credits = credits + 1 where day = today;
  update public.discovery_gate set next_at = stamp + interval '275 milliseconds' where id = true;
  token := gen_random_uuid();
  insert into public.discovery_cache(key, lease, expires_at) values (p_key, token, stamp + interval '20 seconds')
    on conflict (key) do update set payload = null, lease = token, expires_at = excluded.expires_at;
  return jsonb_build_object('state','reserved','lease',token);
end $$;

create or replace function public.discovery_complete(p_key text, p_lease uuid, p_payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_payload is null then
    delete from public.discovery_cache where key = p_key and lease = p_lease and payload is null;
  else
    if octet_length(p_payload::text) > 200000 then raise exception 'Cache payload too large'; end if;
    update public.discovery_cache set payload = p_payload, expires_at = clock_timestamp() + interval '24 hours'
      where key = p_key and lease = p_lease and payload is null;
  end if;
end $$;
revoke all on function public.discovery_acquire(text, integer) from public, anon, authenticated;
revoke all on function public.discovery_complete(text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.discovery_acquire(text, integer) to service_role;
grant execute on function public.discovery_complete(text, uuid, jsonb) to service_role;
commit;
