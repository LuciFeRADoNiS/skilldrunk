-- 0010: Read-only SQL query RPC for admin AI assistant
--
-- Allows the admin AI's `query_db` tool to run arbitrary SELECT queries
-- against allowlisted tables. Defense-in-depth:
--   1. Application-level: regex SELECT-only + blacklist + table allowlist (in TS)
--   2. RPC level (here): SET LOCAL TRANSACTION READ ONLY + statement_timeout
--   3. Result wrapped in json_agg → no streaming surprises
--
-- The RPC is called via service_role from the admin server action only.
-- It's NOT exposed to anon/authenticated roles.

create or replace function public.sd_query_readonly(p_sql text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  -- Hard caps inside the function. The transaction is already
  -- assumed read-only at the calling layer, but we belt-and-suspender it.
  set local statement_timeout = '5s';
  set local transaction read only;
  set local lock_timeout = '1s';

  -- Wrap the query so we can aggregate rows into json. Caller is
  -- responsible for ensuring p_sql is a single SELECT statement
  -- with a LIMIT. We refuse anything that doesn't start with SELECT.
  if p_sql !~* '^\s*select\s' then
    raise exception 'sd_query_readonly: only SELECT allowed';
  end if;

  -- Disallow semicolons (chained statements) — single statement only.
  if position(';' in trim(trailing ';' from p_sql)) > 0 then
    raise exception 'sd_query_readonly: multiple statements not allowed';
  end if;

  execute format(
    'select coalesce(jsonb_agg(t), ''[]''::jsonb) from (%s) t',
    p_sql
  ) into v_result;

  return v_result;
end;
$$;

-- Lock down execute. Only service_role should call this.
revoke all on function public.sd_query_readonly(text) from public;
revoke all on function public.sd_query_readonly(text) from anon, authenticated;
grant execute on function public.sd_query_readonly(text) to service_role;

comment on function public.sd_query_readonly(text) is
  'Admin AI read-only SQL executor. Wraps the SELECT in jsonb_agg, runs in a read-only tx with 5s timeout. Application MUST validate allowlist/blacklist before calling.';
