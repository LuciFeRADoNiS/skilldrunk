-- 0004: Notification system
-- Admin notifications for key events + webhook support.

-- ─── 1. Notifications table ──────────────────────────────────
create table if not exists public.sd_notifications (
  id bigint generated always as identity primary key,
  kind text not null, -- 'new_user', 'new_skill', 'new_report', 'new_comment', 'arena_milestone'
  title text not null,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists sd_notifications_unread_idx
  on public.sd_notifications (read, created_at desc)
  where read = false;

alter table public.sd_notifications enable row level security;

-- Only admin can read/update notifications
drop policy if exists "sd_notifications_admin_read" on public.sd_notifications;
create policy "sd_notifications_admin_read" on public.sd_notifications
  for select using (public.sd_is_admin());

drop policy if exists "sd_notifications_admin_update" on public.sd_notifications;
create policy "sd_notifications_admin_update" on public.sd_notifications
  for update using (public.sd_is_admin());

-- ─── 2. Settings table (for webhook URL etc.) ────────────────
create table if not exists public.sd_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.sd_settings enable row level security;

drop policy if exists "sd_settings_admin_all" on public.sd_settings;
create policy "sd_settings_admin_all" on public.sd_settings
  for all using (public.sd_is_admin());

-- ─── 3. Trigger: new user signup → notification ──────────────
create or replace function public.sd_notify_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.sd_notifications (kind, title, body, metadata)
  values (
    'new_user',
    'New user: ' || new.username,
    coalesce(new.display_name, new.username) || ' just signed up.',
    json_build_object('user_id', new.id, 'username', new.username)::jsonb
  );
  -- Try webhook push (fire-and-forget via pg_net if available)
  begin
    perform public.sd_push_webhook('new_user', 'New user: ' || new.username);
  exception when others then null;
  end;
  return new;
end;
$$;

drop trigger if exists sd_notify_new_user_trigger on public.sd_profiles;
create trigger sd_notify_new_user_trigger
  after insert on public.sd_profiles
  for each row execute function public.sd_notify_new_user();

-- ─── 4. Trigger: new skill published → notification ──────────
create or replace function public.sd_notify_new_skill()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status != 'published') then
    insert into public.sd_notifications (kind, title, body, metadata)
    values (
      'new_skill',
      'New skill: ' || new.title,
      new.summary,
      json_build_object('skill_id', new.id, 'slug', new.slug, 'type', new.type)::jsonb
    );
    begin
      perform public.sd_push_webhook('new_skill', 'New skill: ' || new.title);
    exception when others then null;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists sd_notify_new_skill_trigger on public.sd_skills;
create trigger sd_notify_new_skill_trigger
  after insert or update of status on public.sd_skills
  for each row execute function public.sd_notify_new_skill();

-- ─── 5. Trigger: new report → notification ───────────────────
create or replace function public.sd_notify_new_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.sd_notifications (kind, title, body, metadata)
  values (
    'new_report',
    'New report: ' || new.target_type || ' flagged',
    new.reason,
    json_build_object('report_id', new.id, 'target_type', new.target_type, 'target_id', new.target_id)::jsonb
  );
  begin
    perform public.sd_push_webhook('new_report', 'Report: ' || new.reason);
  exception when others then null;
  end;
  return new;
end;
$$;

drop trigger if exists sd_notify_new_report_trigger on public.sd_reports;
create trigger sd_notify_new_report_trigger
  after insert on public.sd_reports
  for each row execute function public.sd_notify_new_report();

-- ─── 6. Webhook push helper (uses pg_net if installed) ───────
-- This calls our API route which forwards to Telegram/Slack/etc.
-- Falls back silently if pg_net is not available.
create or replace function public.sd_push_webhook(p_kind text, p_message text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
begin
  select value into v_url from public.sd_settings where key = 'webhook_url';
  if v_url is null then return; end if;

  -- Try pg_net for async HTTP (available on Supabase)
  begin
    perform net.http_post(
      url := v_url,
      body := json_build_object('kind', p_kind, 'message', p_message)::jsonb
    );
  exception when others then
    -- pg_net not available, silently skip
    null;
  end;
end;
$$;

-- ─── 7. Admin stats: add unread count ────────────────────────
create or replace function public.sd_notification_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*) from public.sd_notifications where read = false;
$$;

grant execute on function public.sd_notification_count() to authenticated;
