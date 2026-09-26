-- Applied to AsterSync (shsftfopegxkkatplyra) on 2026-09-25 as the named
-- migration create_aster_sync_enquiries. Apply once only to fresh environments.
begin;

create table public.enquiries (
  id uuid primary key,
  name text not null check (char_length(name) between 2 and 100),
  email text not null check (char_length(email) between 3 and 254 and email = lower(email) and position('@' in email) > 1),
  company text not null default '' check (char_length(company) <= 160),
  service text not null check (service in ('websites', 'automation', 'data', 'unsure')),
  budget text not null check (budget in ('not-set', 'under-50k', '50k-150k', '150k-500k', '500k-plus')),
  timeline text not null default '' check (char_length(timeline) <= 100),
  message text not null check (char_length(message) between 20 and 4000),
  created_at timestamptz not null default now()
);
create index enquiries_email_created_idx on public.enquiries (email, created_at);
alter table public.enquiries enable row level security;
revoke all on public.enquiries from public, anon, authenticated;
grant select, insert on public.enquiries to service_role;

-- Only the private server key may call this function. SECURITY INVOKER keeps
-- normal table permissions in force; anonymous visitors have no table access.
create function public.submit_enquiry(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  request_id uuid := (payload->>'id')::uuid;
  request_email text := lower(payload->>'email');
  previous public.enquiries%rowtype;
begin
  if coalesce(payload->>'website', '') <> '' then
    raise exception 'Invalid submission' using errcode = '22023';
  end if;
  -- Serialize retries for an ID and submissions from the same email. The limit
  -- and insert share a transaction, so concurrent requests cannot skip it.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('enquiry-id:' || request_id::text, 0));
  select * into previous from public.enquiries where id = request_id;
  if found then
    if previous.email = request_email and previous.name = payload->>'name'
       and previous.company = coalesce(payload->>'company', '')
       and previous.service = payload->>'service' and previous.budget = payload->>'budget'
       and previous.timeline = coalesce(payload->>'timeline', '') and previous.message = payload->>'message' then
      return jsonb_build_object('status', 'duplicate', 'id', request_id);
    end if;
    return jsonb_build_object('status', 'conflict', 'id', request_id);
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('enquiry-email:' || request_email, 0));
  if (select count(*) from public.enquiries where email = request_email and created_at > now() - interval '1 hour') >= 5 then
    return jsonb_build_object('status', 'rate_limited', 'id', request_id);
  end if;
  insert into public.enquiries (id, name, email, company, service, budget, timeline, message)
  values (request_id, payload->>'name', request_email, coalesce(payload->>'company', ''),
          payload->>'service', payload->>'budget', coalesce(payload->>'timeline', ''), payload->>'message');
  return jsonb_build_object('status', 'created', 'id', request_id);
end;
$$;

revoke all on function public.submit_enquiry(jsonb) from public, anon, authenticated;
grant execute on function public.submit_enquiry(jsonb) to service_role;
commit;
