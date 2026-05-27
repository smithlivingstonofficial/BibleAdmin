create table if not exists public.notification_devices (
  id uuid primary key default gen_random_uuid(),
  fcm_token text not null unique,
  platform text not null default 'android',
  admin_verse_push_enabled boolean not null default false,
  daily_verse_notifications_enabled boolean not null default false,
  reading_reminder_enabled boolean not null default false,
  timezone text,
  app_version text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_devices enable row level security;

drop policy if exists "Devices can register notification tokens" on public.notification_devices;
create policy "Devices can register notification tokens"
  on public.notification_devices
  for insert
  to anon
  with check (true);

drop policy if exists "Devices can update notification tokens" on public.notification_devices;
create policy "Devices can update notification tokens"
  on public.notification_devices
  for update
  to anon
  using (true)
  with check (true);

create or replace function public.set_notification_devices_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_notification_devices_updated_at on public.notification_devices;
create trigger set_notification_devices_updated_at
  before update on public.notification_devices
  for each row
  execute function public.set_notification_devices_updated_at();
