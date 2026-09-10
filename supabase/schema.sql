-- ============================================================
-- مخطط قاعدة البيانات: منصة إدارة الحملة — تطوان (rassd-tetouan)
-- بعد إلغاء وحدة الرصد/المراقبة نهائيا (D-026، 10 شتنبر 2026):
-- المنصة أصبحت منصة إدارة صرفة. هذا الملف يعكس البنية *المطلوبة*
-- من الآن فصاعدا — جداول الرصد القديمة (mentions/sources/...) لم
-- تعد جزءا من هذا الملف، وحذفها من القاعدة الحية فعليا يتم عبر
-- supabase/remove_monitoring_module.sql (سكريبت منفصل، للتشغيل اليدوي).
-- تشغيل هذا الملف على قاعدة حية آمن (create table if not exists) —
-- ما غايبدلش البيانات الموجودة فـ profiles أو وحدة المراقبين.
-- ============================================================

-- ------------------------------------------------------------
-- 1) الملفات الشخصية + الأدوار (فوق auth.users الجاهز فـ Supabase)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'viewer' check (role in ('admin','editor','viewer')),
  created_at timestamptz not null default now()
);

-- دالة SECURITY DEFINER لقراءة دور المستخدم الحالي بلا المرور عبر RLS —
-- هذا هو إصلاح بق "infinite recursion" (T-037): السياسات القديمة كانت
-- كتقرا من profiles داخل سياسة profiles نفسها، فكيدخل فحلقة لا نهائية.
create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_editor_or_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_user_role() in ('admin','editor'), false);
$$;

drop policy if exists "read own profile or admin" on public.profiles;
create policy "read own profile or admin" on public.profiles
  for select using (auth.uid() = id or public.current_user_role() = 'admin');

alter table public.profiles enable row level security;

-- ------------------------------------------------------------
-- 2) جرد المراقبين ومتابعة مكاتب التصويت (T-057/T-058، الوحدة الأولى
--    من منصة الإدارة بعد إلغاء الرصد — D-026). البيانات المرجعية
--    (communes/polling_stations) تُعبّى بملف seed منفصل (راجع
--    supabase/seed_communes.sql) اعتمادا على S-016 (حقيقي لجماعة
--    تطوان) وS-017/S-018/S-019 (22 جماعة إقليم تطوان).
-- ------------------------------------------------------------
create table if not exists public.communes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text not null default 'قروي' check (type in ('حضري', 'قروي')),
  registered_voters_est integer,
  has_detailed_station_data boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.polling_stations (
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null references public.communes(id) on delete cascade,
  center_name text not null,
  sub_office_number integer,
  approx_zone text,
  coordinates text,
  map_link text,
  location_confirmed text default 'غير محدد'
    check (location_confirmed in ('مؤكد', 'يحتاج تأكيد', 'غير محدد')),
  is_mock boolean not null default false,
  source text not null default 'S-016',
  created_at timestamptz not null default now()
);
create index if not exists polling_stations_commune_idx on public.polling_stations (commune_id);

create table if not exists public.observers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  polling_station_id uuid references public.polling_stations(id) on delete set null,
  confirmation_status text not null default 'لم يُعيّن'
    check (confirmation_status in ('مؤكد', 'غير مؤكد', 'غايب', 'لم يُعيّن')),
  last_checked_at timestamptz,
  notes text,
  assigned_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists observers_station_idx on public.observers (polling_station_id);
create index if not exists observers_status_idx on public.observers (confirmation_status);

-- ============================================================
-- RLS: تفعيل + سياسات (بلا recursion — عبر current_user_role()/is_editor_or_admin())
-- ============================================================
alter table public.communes enable row level security;
alter table public.polling_stations enable row level security;
alter table public.observers enable row level security;

drop policy if exists "authenticated read communes" on public.communes;
create policy "authenticated read communes" on public.communes
  for select using (auth.role() = 'authenticated');
drop policy if exists "editors write communes" on public.communes;
create policy "editors write communes" on public.communes
  for all using (public.is_editor_or_admin());

drop policy if exists "authenticated read polling_stations" on public.polling_stations;
create policy "authenticated read polling_stations" on public.polling_stations
  for select using (auth.role() = 'authenticated');
drop policy if exists "editors write polling_stations" on public.polling_stations;
create policy "editors write polling_stations" on public.polling_stations
  for all using (public.is_editor_or_admin());

drop policy if exists "authenticated read observers" on public.observers;
create policy "authenticated read observers" on public.observers
  for select using (auth.role() = 'authenticated');
drop policy if exists "editors write observers" on public.observers;
create policy "editors write observers" on public.observers
  for all using (public.is_editor_or_admin());
