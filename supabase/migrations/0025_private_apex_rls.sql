-- 0025_private_apex_rls.sql
--
-- Private-apex CUTOVER data wall (D3 / D7, plan §7 "9b"). Drops the public
-- SELECT policies on the former-marketplace tables and replaces them with
-- admin-only reads. This is the TRUE privacy boundary: even if a public API
-- route (/api/v1, /api/mcp, /api/ai/find, vote/comment reads) is hit by an
-- anon client, RLS now returns zero rows. Writes are unaffected here (service
-- role bypasses RLS; app writes go through requireAdmin).
--
-- ⚠️ FILE ONLY — apply at CUTOVER (Phase B), together with the branch deploy.
-- Applying it while the public marketplace is still live would empty the live
-- finder. ZERO data loss — only read policies change; no rows touched.
--
-- Name-independent: drops existing SELECT/ALL-cmd policies via catalog lookup,
-- so it doesn't depend on remembering exact legacy policy names. Verify with
-- `select * from pg_policies where tablename = ...` after applying.

do $$
declare
  pol record;
  tbl text;
  tables text[] := array[
    'sd_skills', 'sd_profiles', 'sd_comments', 'sd_votes', 'sd_skill_versions'
  ];
begin
  foreach tbl in array tables loop
    -- drop every policy that currently grants read (SELECT or ALL)
    for pol in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = tbl and cmd in ('SELECT', 'ALL')
    loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, tbl);
    end loop;

    -- admin-only read (service_role still bypasses RLS for server writes)
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.sd_is_admin())',
      tbl || '_admin_read', tbl
    );
  end loop;
end $$;

-- NOTE on dropped ALL-cmd policies: any combined read+write policy removed above
-- must have its WRITE half re-created if it was the only write path. For the
-- private apex all writes are admin/service-role, so re-add admin write policies
-- here if a table loses its only INSERT/UPDATE/DELETE policy. Verify per table
-- at apply time:
--   select tablename, cmd, policyname, qual from pg_policies
--   where schemaname='public' and tablename = any(array['sd_skills','sd_profiles','sd_comments','sd_votes','sd_skill_versions']);
