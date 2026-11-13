-- Phase 5 additive weighted reservation. No tables/data reset; preserve the reviewed 2-argument RPC.
begin;
do $$ begin
  if to_regprocedure('public.discovery_acquire(text,integer,integer)') is not null then
    raise exception 'Mapping reservation already exists; stop for migration review';
  end if;
end $$;
create or replace function public.discovery_acquire(p_key text, p_budget integer, p_cost integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  cached public.discovery_cache%rowtype;
  used integer;
  token uuid;
  stamp timestamptz := clock_timestamp();
  today date := (stamp at time zone 'UTC')::date;
  next_slot timestamptz;
begin
  if p_key !~ '^[a-f0-9]{64}$' or p_budget is null or p_budget < 1 or p_budget > 100 or p_cost is null or p_cost < 1 or p_cost > 20 then
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
  if used + p_cost > p_budget then return jsonb_build_object('state','limited'); end if;
  update public.discovery_usage set credits = credits + p_cost where day = today;
  update public.discovery_gate set next_at = stamp + interval '275 milliseconds' where id = true;
  token := gen_random_uuid();
  insert into public.discovery_cache(key, lease, expires_at) values (p_key, token, stamp + interval '20 seconds')
    on conflict (key) do update set payload = null, lease = token, expires_at = excluded.expires_at;
  return jsonb_build_object('state','reserved','lease',token);
end $$;


revoke all on function public.discovery_acquire(text,integer,integer) from public, anon, authenticated;
grant execute on function public.discovery_acquire(text,integer,integer) to service_role;
commit;
