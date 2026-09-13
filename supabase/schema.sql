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
  created_at timestamptz not null default now(),

  -- خط الأساس التاريخي الحقيقي (T-059، نتائج الجماعية 2021 — S-017/S-018،
  -- مصدرها الرسمي بوابة elections.ma). يُعبّى بسكريبت seed منفصل
  -- (supabase/seed_communes_2021_baseline.sql)، ماشي بيانات يدوية.
  participation_rate_2021 numeric,
  seats_total_2021 integer,
  districts_count_2021 integer,
  total_votes_2021 integer,
  leading_party_2021 text,
  leading_party_seats_2021 integer,
  leading_party_pct_2021 numeric
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

-- ------------------------------------------------------------
-- 3) خريطة حضور الأحياء/الدواوير/المداشر (T-059/T-060). لا توجد بيانات
--    رسمية على مستوى الحي/الدوار (بيانات elections.ma تتوقف عند مستوى
--    الجماعة/الدائرة الانتخابية المرقمة) — هذا الجدول فارغ عمدا، يُعبّى
--    يدويا من فريق الحملة اعتمادا على معرفتهم الميدانية. خط الأساس
--    التاريخي الحقيقي (نتائج 2021) موجود على مستوى الجماعة فـ`communes`
--    أعلاه، ماشي هنا.
-- ------------------------------------------------------------
create table if not exists public.commune_zones (
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null references public.communes(id) on delete cascade,
  name text not null,
  zone_type text not null default 'حي' check (zone_type in ('حي', 'دوار', 'مدشر')),
  our_offices_count integer not null default 0,
  our_presence_pct numeric check (our_presence_pct is null or (our_presence_pct >= 0 and our_presence_pct <= 100)),
  party_1_name text,
  party_1_offices integer,
  party_2_name text,
  party_2_offices integer,
  party_3_name text,
  party_3_offices integer,
  notes text,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists commune_zones_commune_idx on public.commune_zones (commune_id);

-- ------------------------------------------------------------
-- 4) البرنامج الميداني اليومي (T-063): مهام ميدانية (توزيع، تعبئة،
--    اجتماع فريق...) مرتبطة بتاريخ/جماعة/فريق وحالة تقدم. zone_name
--    نص حر (حي/دوار) — ماشي FK إلزامي لـcommune_zones، لأن بزاف
--    المهام كتغطي الجماعة كاملة ماشي حي محدد.
-- ------------------------------------------------------------
create table if not exists public.field_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  task_date date not null default current_date,
  commune_id uuid references public.communes(id) on delete set null,
  zone_name text,
  team text,
  status text not null default 'مخطط' check (status in ('مخطط', 'جارية', 'منجزة', 'ملغاة')),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists field_tasks_date_idx on public.field_tasks (task_date);
create index if not exists field_tasks_status_idx on public.field_tasks (status);
create index if not exists field_tasks_commune_idx on public.field_tasks (commune_id);

-- ------------------------------------------------------------
-- 5) نقطة استقبال اليقظة الرقمية اليومية (T-061): إدخال يدوي لما
--    يُلاحظ فالفضاء الرقمي (فيسبوك/انستغرام/صحافة/إلخ) — بعد إلغاء
--    الرصد الآلي نهائيا (D-026)، هذا تسجيل يدوي بحت من الفريق، ماشي
--    جمع تلقائي. attachment_url رابط حر (Drive/صورة/PDF مرفوع خارجيا)
--    ماشي رفع ملف مباشر للقاعدة. يُستهلك لاحقا من محرك الترتيب
--    التنافسي (T-062) مع بيانات حضور الأحياء (commune_zones).
-- ------------------------------------------------------------
create table if not exists public.digital_watch_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  platform text not null default 'أخرى'
    check (platform in ('فيسبوك', 'انستغرام', 'تيك توك', 'صحافة/موقع', 'أخرى')),
  source_name text,
  content_summary text not null,
  content_url text,
  attachment_url text,
  sentiment text not null default 'محايد' check (sentiment in ('إيجابي', 'محايد', 'سلبي')),
  priority text not null default 'عادي' check (priority in ('عادي', 'مهم', 'عاجل')),
  status text not null default 'جديد'
    check (status in ('جديد', 'قيد المعالجة', 'تمت المعالجة', 'مؤرشف')),
  commune_id uuid references public.communes(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists digital_watch_date_idx on public.digital_watch_entries (entry_date);
create index if not exists digital_watch_status_idx on public.digital_watch_entries (status);
create index if not exists digital_watch_priority_idx on public.digital_watch_entries (priority);

-- ترقية لقاعدة حية شغّلت `digital_watch_entries` من قبل (بلا عمود commune_id) —
-- لازم تجي قبل أي `create index` على العمود، حيت "create table if not
-- exists" ما كيضيفش العمود لجدول كاين من قبل (الحالة ديال علي هنا).
alter table public.digital_watch_entries
  add column if not exists commune_id uuid references public.communes(id) on delete set null;
create index if not exists digital_watch_commune_idx on public.digital_watch_entries (commune_id);

-- ------------------------------------------------------------
-- 6) محرك الترتيب التنافسي (T-062): الأرقام (حضور الأحياء + اليقظة
--    الرقمية) كتُجمّع حية فكود التطبيق (src/lib/ranking.ts)، بلا حفظ.
--    الجدول أسفله يخزّن غير الملخص النصي المولّد بالـAI (Gemini،
--    توليد يدوي بضغطة زر من محرر/أدمين، مرة وحدة كحد أقصى فاليوم —
--    unique(summary_date) كيمنع التكرار ويخلي الاستهلاك ضعيف جدا).
-- ------------------------------------------------------------
create table if not exists public.ranking_ai_summaries (
  id uuid primary key default gen_random_uuid(),
  summary_date date not null unique,
  summary_text text not null,
  model text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 7) خلايا الأحياء/الدواوير (طلب علي، 12 شتنبر 2026 — مستوحى من التطبيق
--    المرجعي المحلي tetouan2026). كل "خلية" = وحدة تنظيمية قائمة فعليا
--    فحي/دوار معين (فريق/جهة اتصال مسؤولة)، تُدخل يدويا فريق-بفريق.
--    "نسبة التغطية الميدانية" (Level 1) تُحسب آليا فكود التطبيق
--    (src/lib/coverage.ts)، بلا حفظ فالقاعدة: (عدد المناطق فيها خلية
--    واحدة على الأقل) ÷ (عدد المناطق الكلي). تتحدث لحظيا مع كل خلية
--    جديدة — ماشي رقم يدوي كيفما our_presence_pct القديم.
--    "نسبة تغطية يوم الاقتراع" (Level 2) موجودة من قبل (observers/
--    polling_stations)، هذا الجدول ما عندوش علاقة بيها.
-- ------------------------------------------------------------
create table if not exists public.zone_cells (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.commune_zones(id) on delete cascade,
  cell_name text,
  contact_name text,
  contact_phone text,
  established_date date not null default current_date,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists zone_cells_zone_idx on public.zone_cells (zone_id);

-- ------------------------------------------------------------
-- 8) تقارير لجنة المراقبة (المرحلة 3 من خطة التطبيق المرجعي — تقارير
--    يوم الاقتراع: سير عادي/مخالفة/حادث/ملاحظة عامة). تُسجَّل من طرف
--    عضو اللجنة المركزية أو مراقب ميداني (observer_id اختياري — بعض
--    التقارير كتجي من غير مراقب مسجل رسميا، فـreporter_name نص حر
--    كبديل). reviewed_by/review_notes خاصين باللجنة المركزية بعد
--    المراجعة، ماشي وقت التسجيل الأول.
-- ------------------------------------------------------------
create table if not exists public.monitoring_reports (
  id uuid primary key default gen_random_uuid(),
  polling_station_id uuid references public.polling_stations(id) on delete set null,
  commune_id uuid references public.communes(id) on delete set null,
  observer_id uuid references public.observers(id) on delete set null,
  reporter_name text,
  report_type text not null default 'ملاحظة عامة'
    check (report_type in ('سير عادي', 'مخالفة', 'حادث', 'ملاحظة عامة')),
  severity text not null default 'عادي' check (severity in ('عادي', 'متوسط', 'خطير')),
  title text not null,
  description text,
  status text not null default 'جديد' check (status in ('جديد', 'قيد المراجعة', 'تمت المعالجة', 'مؤرشف')),
  reviewed_by uuid references public.profiles(id),
  review_notes text,
  reported_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists monitoring_reports_station_idx on public.monitoring_reports (polling_station_id);
create index if not exists monitoring_reports_commune_idx on public.monitoring_reports (commune_id);
create index if not exists monitoring_reports_status_idx on public.monitoring_reports (status);
create index if not exists monitoring_reports_severity_idx on public.monitoring_reports (severity);

-- ------------------------------------------------------------
-- 9) قاعدة الناخبين المستوردة من تطبيق tetouan2026 (طلب علي، 12 شتنبر
--    2026 — أساس "الكتل الساخنة"). استيراد بخصوصية: الأسماء مختصرة
--    لحرفين فقط (مثال: "سعد شهبون" ← "س.ش")، بلا عنوان كامل — غير
--    الجماعة + مكتب التصويت (للربط مع polling_stations الموجود) +
--    حي/دوار خام (district_raw، نص كما هو من المصدر، بلا تطبيع، لأن
--    التطبيق المرجعي نفسه عانى من فوضى هاد الحقل — راجع
--    ADDRESS_GEOCODING_STRATEGY.md فالتطبيق المرجعي).
--    التعبئة تتم بملف منفصل (supabase/import_voters.sql) بعد رفع
--    CSV مصدَّر من قاعدة tetouan2026 المحلية — ماشي هنا. id هو نفس
--    المعرف الأصلي (Voter.id) لتفادي التكرار عند إعادة الاستيراد.
-- ------------------------------------------------------------
create table if not exists public.voters (
  id bigint primary key,
  initials text not null,
  commune_id uuid references public.communes(id) on delete set null,
  polling_station_id uuid references public.polling_stations(id) on delete set null,
  district_raw text,
  created_at timestamptz not null default now()
);
create index if not exists voters_commune_idx on public.voters (commune_id);
create index if not exists voters_polling_station_idx on public.voters (polling_station_id);
create index if not exists voters_district_idx on public.voters (district_raw);

-- تجميع مُسبق بدل جلب 270 ألف صف فكود التطبيق فـ"الكتل الساخنة"
-- (src/app/hot-blocks). تجربة أولى بـview عادية (security_invoker=on)
-- بانت سريعة جدا (362ms) لما تُشغّل مباشرة فSQL Editor (صلاحيات
-- postgres، بلا حد زمني)، لكن كانت كتتقطع بخطأ "statement timeout"
-- (57014) لما التطبيق كيقرا منها عبر PostgREST/authenticated —
-- الحد الزمني والموارد المخصصة لهاد الدور فمشروع Supabase المجاني
-- محدودة بزاف. الحل: materialized view — النتيجة محسوبة ومخزّنة
-- مسبقا، فالقراءة وقت الطلب ما فيها حتى GROUP BY، غير قراءة 22/594
-- صف جاهزين. تُحدَّث (refresh) يدويا بعد أي استيراد/تعديل جديد
-- لقاعدة voters (راجع تعليمة REFRESH فآخر supabase/import_voters.sql).
create materialized view if not exists public.voters_by_commune as
  select commune_id, count(*) as voter_count
  from public.voters
  where commune_id is not null
  group by commune_id;

create materialized view if not exists public.voters_by_polling_station as
  select polling_station_id, count(*) as voter_count
  from public.voters
  where polling_station_id is not null
  group by polling_station_id;

grant select on public.voters_by_commune to authenticated, anon;
grant select on public.voters_by_polling_station to authenticated, anon;

-- ------------------------------------------------------------
-- 10) أرقام حقيقية للأحياء/الدواوير من tetouan2026 (residenceNorm عبر
--     Bridge API — راجع claude/AUDIT_TETOUAN2026_REFERENCE_APP.md
--     وT-073). جدول مرجعي للقراءة فقط (بلا أي اسم/عنوان فردي، غير
--     اسم الحي وعدد الناخبين) — منفصل عمدا عن commune_zones (اللي
--     خاصة بالبيانات التشغيلية اليدوية: عدد مكاتبنا، الأحزاب المنافسة).
--     قيد مهم موثق بصدق لعلي: residenceNorm مكتمل بنسبة عالية
--     (60-90%) فأغلب الجماعات القروية، لكن ناقص بزاف فجماعة تطوان
--     نفسها (7.9% فقط من 179,708 ناخب عندهم قيمة) — يعني تغطية
--     الأحياء الحضرية لتطوان جزئية بطبيعتها، ماشي بق فالاستيراد.
--     فلترة أعمالنا: احتفظنا فقط بالأحياء اللي فيها 5 ناخبين فما فوق
--     (تفاديا لضجيج الأخطاء الإملائية/التكرارات الفريدة)، ودمجنا
--     الأسماء المكررة بلاحقة اسم الجماعة (مثال: "حي النسيم تطوان"
--     مع "حي النسيم"). التعبئة عبر supabase/import_localities.sql.
-- ------------------------------------------------------------
create table if not exists public.commune_localities (
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null references public.communes(id) on delete cascade,
  locality_name text not null,
  voter_count integer not null default 0,
  source text not null default 'tetouan2026_residenceNorm',
  created_at timestamptz not null default now(),
  unique (commune_id, locality_name)
);
create index if not exists commune_localities_commune_idx on public.commune_localities (commune_id);
create index if not exists commune_localities_count_idx on public.commune_localities (voter_count desc);

-- ------------------------------------------------------------
-- 11) متابعة الفريق الميداني لكل ناخب (`voters`، T-078 أول مهمة) —
--     سجل واحد لكل ناخب "تواصلنا معاه فعلا" فقط (الجدول يبدأ فارغا
--     عمدا، ماشي صف مسبق لكل الـ269,749 ناخب) — نفس منطق ContactStatus
--     فالتطبيق المرجعي (tetouan2026)، لكن سجل واحد حالي لكل ناخب
--     (upsert)، ماشي تاريخ كامل. commune_id/polling_station_id
--     مُكرَّرين عمدا (denormalized) من voters وقت الإدخال باش تحسب
--     إحصائيات التغطية (KPI) بسرعة بلا join على جدول 270 ألف صف.
-- ------------------------------------------------------------
create table if not exists public.voter_contact_status (
  voter_id bigint primary key references public.voters(id) on delete cascade,
  commune_id uuid references public.communes(id) on delete set null,
  polling_station_id uuid references public.polling_stations(id) on delete set null,
  status text not null default 'contacted',
  channel text,
  notes text,
  contacted_by text,
  updated_at timestamptz not null default now()
);
create index if not exists voter_contact_status_commune_idx on public.voter_contact_status (commune_id);
create index if not exists voter_contact_status_station_idx on public.voter_contact_status (polling_station_id);
create index if not exists voter_contact_status_status_idx on public.voter_contact_status (status);

-- ------------------------------------------------------------
-- 12) إدارة المتطوعين (T-078، ثاني مهمة) — نسخة مباشرة من `FieldAgent`
--     فالتطبيق المرجعي (schema.cloud.prisma): بيانات غير حساسة (اسم،
--     هاتف، مهارات، توفر) لأشخاص متطوعين فالحملة (بلا علاقة بمهمة
--     "مراقب" الرسمية المتابعة أصلا فجدول `observers`). سجل تشغيلي
--     بحت، ماشي بيانات ناخبين.
-- ------------------------------------------------------------
create table if not exists public.volunteers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  commune_id uuid references public.communes(id) on delete set null,
  skills text,
  availability text,
  status text not null default 'نشيط',
  notes text,
  joined_at timestamptz not null default now()
);
create index if not exists volunteers_commune_idx on public.volunteers (commune_id);
create index if not exists volunteers_status_idx on public.volunteers (status);

-- ------------------------------------------------------------
-- 13) المناضلون (T-078، ثالث مهمة) — نسخة مباشرة من `CampaignActivist`
--     فالتطبيق المرجعي: أعضاء الحزب المنخرطين رسميا (رقم الانخراط،
--     الفرع المحلي، المسؤولية)، مختلفين عن المتطوعين العاديين
--     (`volunteers`) وعن المراقبين الرسميين (`observers`).
-- ------------------------------------------------------------
create table if not exists public.activists (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  membership_number text unique,
  commune_id uuid references public.communes(id) on delete set null,
  local_branch text,
  responsibility text,
  status text not null default 'نشيط',
  notes text,
  joined_at timestamptz not null default now()
);
create index if not exists activists_commune_idx on public.activists (commune_id);
create index if not exists activists_status_idx on public.activists (status);

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

alter table public.commune_zones enable row level security;

drop policy if exists "authenticated read commune_zones" on public.commune_zones;
create policy "authenticated read commune_zones" on public.commune_zones
  for select using (auth.role() = 'authenticated');
drop policy if exists "editors write commune_zones" on public.commune_zones;
create policy "editors write commune_zones" on public.commune_zones
  for all using (public.is_editor_or_admin());

alter table public.field_tasks enable row level security;

drop policy if exists "authenticated read field_tasks" on public.field_tasks;
create policy "authenticated read field_tasks" on public.field_tasks
  for select using (auth.role() = 'authenticated');
drop policy if exists "editors write field_tasks" on public.field_tasks;
create policy "editors write field_tasks" on public.field_tasks
  for all using (public.is_editor_or_admin());

alter table public.digital_watch_entries enable row level security;

drop policy if exists "authenticated read digital_watch_entries" on public.digital_watch_entries;
create policy "authenticated read digital_watch_entries" on public.digital_watch_entries
  for select using (auth.role() = 'authenticated');
drop policy if exists "editors write digital_watch_entries" on public.digital_watch_entries;
create policy "editors write digital_watch_entries" on public.digital_watch_entries
  for all using (public.is_editor_or_admin());

alter table public.ranking_ai_summaries enable row level security;

drop policy if exists "authenticated read ranking_ai_summaries" on public.ranking_ai_summaries;
create policy "authenticated read ranking_ai_summaries" on public.ranking_ai_summaries
  for select using (auth.role() = 'authenticated');
drop policy if exists "editors write ranking_ai_summaries" on public.ranking_ai_summaries;
create policy "editors write ranking_ai_summaries" on public.ranking_ai_summaries
  for all using (public.is_editor_or_admin());

alter table public.zone_cells enable row level security;

drop policy if exists "authenticated read zone_cells" on public.zone_cells;
create policy "authenticated read zone_cells" on public.zone_cells
  for select using (auth.role() = 'authenticated');
drop policy if exists "editors write zone_cells" on public.zone_cells;
create policy "editors write zone_cells" on public.zone_cells
  for all using (public.is_editor_or_admin());

alter table public.monitoring_reports enable row level security;

drop policy if exists "authenticated read monitoring_reports" on public.monitoring_reports;
create policy "authenticated read monitoring_reports" on public.monitoring_reports
  for select using (auth.role() = 'authenticated');
drop policy if exists "editors write monitoring_reports" on public.monitoring_reports;
create policy "editors write monitoring_reports" on public.monitoring_reports
  for all using (public.is_editor_or_admin());

alter table public.voters enable row level security;

drop policy if exists "authenticated read voters" on public.voters;
create policy "authenticated read voters" on public.voters
  for select using (auth.role() = 'authenticated');
drop policy if exists "editors write voters" on public.voters;
create policy "editors write voters" on public.voters
  for all using (public.is_editor_or_admin());

alter table public.commune_localities enable row level security;

drop policy if exists "authenticated read commune_localities" on public.commune_localities;
create policy "authenticated read commune_localities" on public.commune_localities
  for select using (auth.role() = 'authenticated');
drop policy if exists "editors write commune_localities" on public.commune_localities;
create policy "editors write commune_localities" on public.commune_localities
  for all using (public.is_editor_or_admin());

alter table public.voter_contact_status enable row level security;

drop policy if exists "authenticated read voter_contact_status" on public.voter_contact_status;
create policy "authenticated read voter_contact_status" on public.voter_contact_status
  for select using (auth.role() = 'authenticated');
drop policy if exists "editors write voter_contact_status" on public.voter_contact_status;
create policy "editors write voter_contact_status" on public.voter_contact_status
  for all using (public.is_editor_or_admin());

alter table public.volunteers enable row level security;

drop policy if exists "authenticated read volunteers" on public.volunteers;
create policy "authenticated read volunteers" on public.volunteers
  for select using (auth.role() = 'authenticated');
drop policy if exists "editors write volunteers" on public.volunteers;
create policy "editors write volunteers" on public.volunteers
  for all using (public.is_editor_or_admin());

alter table public.activists enable row level security;

drop policy if exists "authenticated read activists" on public.activists;
create policy "authenticated read activists" on public.activists
  for select using (auth.role() = 'authenticated');
drop policy if exists "editors write activists" on public.activists;
create policy "editors write activists" on public.activists
  for all using (public.is_editor_or_admin());
