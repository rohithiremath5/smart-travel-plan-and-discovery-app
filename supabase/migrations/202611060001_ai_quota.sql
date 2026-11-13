-- Phase 6 proposal ONLY: separate hosted approval required. No discovery/personal-trip resources changed.
begin;
create table public.ai_requests (
 request_hash text primary key check (request_hash ~ '^[a-f0-9]{64}$'),
 client_hash text not null check (client_hash ~ '^[a-f0-9]{64}$'),
 content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default clock_timestamp()
);
alter table public.ai_requests enable row level security;
revoke all on public.ai_requests from public, anon, authenticated;
grant select,insert,delete on public.ai_requests to service_role;
create function public.ai_reserve(p_request text,p_client text,p_content text,p_daily integer,p_client_limit integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare stamp timestamptz:=clock_timestamp(); day_start timestamptz; used integer; client_used integer;
begin
 if p_request is null or p_client is null or p_content is null or p_request !~ '^[a-f0-9]{64}$' or p_client !~ '^[a-f0-9]{64}$' or p_content !~ '^[a-f0-9]{64}$' or p_daily is null or p_daily<1 or p_daily>5 or p_client_limit is null or p_client_limit<1 or p_client_limit>3 then raise exception 'Invalid AI reservation'; end if;
 perform pg_advisory_xact_lock(60061106);
 stamp:=clock_timestamp(); day_start:=date_trunc('day',stamp at time zone 'UTC') at time zone 'UTC';
 delete from public.ai_requests where created_at<day_start-interval '6 days';
 select count(*) into used from public.ai_requests where created_at>=day_start;
 select count(*) into client_used from public.ai_requests where created_at>=day_start and client_hash=p_client;
 if exists(select 1 from public.ai_requests where request_hash=p_request) then return jsonb_build_object('state','duplicate','globalRemaining',greatest(0,p_daily-used),'clientRemaining',greatest(0,p_client_limit-client_used)); end if;
 if used>=p_daily then return jsonb_build_object('state','limited','globalRemaining',0,'clientRemaining',greatest(0,p_client_limit-client_used)); end if;
 if client_used>=p_client_limit then return jsonb_build_object('state','client_limited','globalRemaining',greatest(0,p_daily-used),'clientRemaining',0); end if;
 if exists(select 1 from public.ai_requests where created_at>stamp-interval '10 seconds' or (content_hash=p_content and created_at>stamp-interval '60 seconds')) then return jsonb_build_object('state','busy','globalRemaining',greatest(0,p_daily-used),'clientRemaining',greatest(0,p_client_limit-client_used)); end if;
 insert into public.ai_requests(request_hash,client_hash,content_hash,created_at) values(p_request,p_client,p_content,stamp);
 return jsonb_build_object('state','reserved','globalRemaining',p_daily-used-1,'clientRemaining',p_client_limit-client_used-1);
end $$;
revoke all on function public.ai_reserve(text,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.ai_reserve(text,text,text,integer,integer) to service_role;
commit;
