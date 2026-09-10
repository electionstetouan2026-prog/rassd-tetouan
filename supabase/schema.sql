-- ============================================================
-- مخطط قاعدة البيانات: منصة رصد تطوان (rassd-tetouan)
-- نسخة مُعاد بناؤها (8 شتنبر 2026) بعد فقدان الكود المحلي —
-- هذا الملف مطابق (حسب التوثيق الكامل فـ TASK_REGISTER/DECISION_LOG)
-- للبنية الحية فعليا على Supabase. تشغيله على قاعدة حية فيها
-- الجداول أصلا "if not exists" آمن — ما غايبدلش البيانات الموجودة.
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

-- ------------------------------------------------------------
-- 2) مصادر الجمع (rss آلي، أو manual إدخال يدوي)
-- ------------------------------------------------------------
create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('rss','youtube','manual','other')),
  url text,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);
create unique index if not exists sources_url_unique
  on public.sources (url) where url is not null;

-- ------------------------------------------------------------
-- 3) سجل كل عملية جمع فعلية — يبني مؤشر "آخر تحديث" الحقيقي
-- ------------------------------------------------------------
create table if not exists public.collection_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running','success','error')),
  items_found int not null default 0,
  error_message text
);

-- ------------------------------------------------------------
-- 4) الإشارات/المنشورات المجمّعة
-- ------------------------------------------------------------
create table if not exists public.mentions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources(id) on delete set null,
  external_id text,
  title text,
  content text,
  url text,
  published_at timestamptz,
  collected_at timestamptz not null default now(),
  entry_method text not null default 'auto' check (entry_method in ('auto','manual')),
  uploaded_by uuid references public.profiles(id),

  -- المنصة (T-042، Migration 5)
  platform text not null default 'press'
    check (platform in ('facebook','instagram','tiktok','press','other')),

  -- قناة الجمع (T-050، لبنية تعدد القنوات)
  collector_channel text not null default 'rss'
    check (collector_channel in ('rss','agent','apify','manual')),

  -- نتائج التحليل بمرحلتين (D-009)
  region_relevant boolean,
  region_relevance_reason text,
  threat_score numeric,
  threat_score_reason text,
  threat_model_used text,
  threat_confidence numeric,
  analyzed_at timestamptz,

  -- اقتراح الرد (T-041) — مسودة دائما، بلا نشر آلي أبدا
  response_type text check (response_type in
    ('comment','post','statement','video_scenario','ignore','multi_step_plan')),
  response_draft text,
  response_model_used text,
  response_generated_at timestamptz,

  created_at timestamptz not null default now()
);
create unique index if not exists mentions_source_external_unique
  on public.mentions (source_id, external_id) where external_id is not null;

-- ------------------------------------------------------------
-- 5) سجل تدقيق append-only — ما يتبدلش ولا يتمسح
-- ------------------------------------------------------------
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  target_table text,
  target_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.block_audit_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'audit_log غير قابل للتعديل أو الحذف — append-only';
end;
$$;
drop trigger if exists no_update_audit on public.audit_log;
create trigger no_update_audit before update on public.audit_log
  for each row execute function public.block_audit_mutation();
drop trigger if exists no_delete_audit on public.audit_log;
create trigger no_delete_audit before delete on public.audit_log
  for each row execute function public.block_audit_mutation();

-- ------------------------------------------------------------
-- 6) كلمات المراقبة (Ciblage — T-016/T-036)
-- ------------------------------------------------------------
create table if not exists public.keywords (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  category text not null default 'general'
    check (category in ('candidate','competitor','issue','general')),
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);
create unique index if not exists keywords_term_unique on public.keywords (lower(term));

-- ------------------------------------------------------------
-- 7) الحسابات/الصفحات المستهدفة (فيسبوك/انستغرام — T-040 Migration 4،
--    عمود note زيد فـMigration 6/T-047)
-- ------------------------------------------------------------
create table if not exists public.target_accounts (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  platform text not null check (platform in ('facebook','instagram','tiktok','other')),
  label text,
  category text not null default 'other'
    check (category in ('attacker','competitor','sympathizer','other')),
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists target_accounts_url_unique on public.target_accounts (url);

-- ------------------------------------------------------------
-- 8) مشاهدات الإشارات عبر قنوات متعددة (T-050، أساس تنقيط الفعالية T-053)
-- ------------------------------------------------------------
create table if not exists public.mention_sightings (
  id uuid primary key default gen_random_uuid(),
  mention_id uuid not null references public.mentions(id) on delete cascade,
  channel text not null check (channel in ('rss','agent','apify','manual')),
  sighted_at timestamptz not null default now(),
  raw_ref jsonb,
  created_at timestamptz not null default now()
);
create index if not exists mention_sightings_mention_idx on public.mention_sightings (mention_id);
create index if not exists mention_sightings_channel_idx on public.mention_sightings (channel);

-- ------------------------------------------------------------
-- 9) جرد المراقبين ومتابعة مكاتب التصويت (T-057/T-058، الوحدة الثانية
--    من التحول الشامل D-023). البيانات المرجعية (communes/polling_stations)
--    تُعبّى بملف seed منفصل (راجع supabase/seed_communes.sql) اعتمادا على
--    S-016 (حقيقي لجماعة تطوان) وS-017/S-018/S-019 (22 جماعة إقليم تطوان).
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
alter table public.profiles enable row level security;
alter table public.sources enable row level security;
alter table public.collection_runs enable row level security;
alter table public.mentions enable row level security;
alter table public.audit_log enable row level security;
alter table public.keywords enable row level security;
alter table public.target_accounts enable row level security;
alter table public.mention_sightings enable row level security; -- بلا أي policy — service role فقط

drop policy if exists "read own profile or admin" on public.profiles;
create policy "read own profile or admin" on public.profiles
  for select using (auth.uid() = id or public.current_user_role() = 'admin');

drop policy if exists "authenticated read sources" on public.sources;
create policy "authenticated read sources" on public.sources
  for select using (auth.role() = 'authenticated');
drop policy if exists "editors write sources" on public.sources;
create policy "editors write sources" on public.sources
  for all using (public.is_editor_or_admin());

drop policy if exists "authenticated read runs" on public.collection_runs;
create policy "authenticated read runs" on public.collection_runs
  for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated read mentions" on public.mentions;
create policy "authenticated read mentions" on public.mentions
  for select using (auth.role() = 'authenticated');
drop policy if exists "editors write mentions" on public.mentions;
create policy "editors write mentions" on public.mentions
  for all using (public.is_editor_or_admin());

drop policy if exists "authenticated read audit" on public.audit_log;
create policy "authenticated read audit" on public.audit_log
  for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated insert audit" on public.audit_log;
create policy "authenticated insert audit" on public.audit_log
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "authenticated read keywords" on public.keywords;
create policy "authenticated read keywords" on public.keywords
  for select using (auth.role() = 'authenticated');
drop policy if exists "editors write keywords" on public.keywords;
create policy "editors write keywords" on public.keywords
  for all using (public.is_editor_or_admin());

drop policy if exists "authenticated read target_accounts" on public.target_accounts;
create policy "authenticated read target_accounts" on public.target_accounts
  for select using (auth.role() = 'authenticated');
drop policy if exists "editors write target_accounts" on public.target_accounts;
create policy "editors write target_accounts" on public.target_accounts
  for all using (public.is_editor_or_admin());

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

-- ============================================================
-- بيانات أولية (idempotent — on conflict do nothing)
-- ============================================================
insert into public.sources (name, type, url, notes) values
  ('فيسبوك/انستغرام — إدخال يدوي', 'manual', null,
   'لا وجود لوصول آلي رسمي شامل (Meta Content Library محصور بالباحثين الأكاديميين فقط) — إدخال شفاف إلزامي عبر uploaded_by')
on conflict do nothing;
