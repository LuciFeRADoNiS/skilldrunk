-- 0023_cst_policy_dedup.sql
--
-- cst_* SELECT policy tekilleştirme. Shared DB'de (vrgohatarieeguyyhfan) her
-- cst_ tablosunda 2 paralel SELECT policy oluşmuştu:
--   • "cst_X admin read"  (boşluklu)  → auth.email() = 'ozgurgur@gmail.com'
--       — skimsoulfat tarafının 0004 MIRROR migration'ından
--   • "cst_X_admin_read"  (alt çizgi) → sd_is_admin()
--       — skilldrunk 0022_custodian_init (KANONİK)
--
-- PostgreSQL permissive policy'leri OR'lar → ikisi örtüşüyor; email-based
-- olan gereksiz duplike. Kanonik = skilldrunk sd_is_admin() (user kararı
-- 2026-06-07). Email-based 3 policy düşürülüyor.
--
-- Güvenli: ozgurgur@gmail.com zaten sd_profiles.role='admin' (admin.skilldrunk
-- login çalışıyor) → sd_is_admin() onu kapsar. Custodian okuma zaten
-- service_role (RLS bypass). Bu yalnız hijyen.

drop policy if exists "cst_events admin read"    on public.cst_events;
drop policy if exists "cst_analytics admin read"  on public.cst_analytics_daily;
drop policy if exists "cst_audit admin read"      on public.cst_audit;

-- Kanonik policy'ler (0022) yerinde kalır:
--   cst_events_admin_read, cst_analytics_admin_read, cst_audit_admin_read
