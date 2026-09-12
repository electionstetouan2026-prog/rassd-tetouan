-- ============================================================
-- استيراد قاعدة الناخبين (269,749 صف من tetouan2026) إلى جدول
-- public.voters — يُشغَّل مرة واحدة بعد تشغيل schema.sql المحدّث.
--
-- الخطوات:
-- 1) شغّل schema.sql الجديد فـSupabase SQL Editor (يضيف جدول voters).
-- 2) شغّل الجزء الأول من هذا الملف (create table voters_import_staging)
--    فـSQL Editor.
-- 3) فـSupabase Studio → Table Editor → افتح voters_import_staging →
--    Insert data → Import data from CSV → اختار voters_export.csv
--    (كاين فـDesktop ديالك: /Users/imac/Desktop/voters_export.csv).
-- 4) رجع لـSQL Editor و شغّل الجزء الثاني (INSERT INTO voters) والتحقق.
-- ============================================================

create table if not exists public.voters_import_staging (
  source_id bigint,
  initials text,
  commune_name text,
  sub_office_number text,
  center_name text,
  district_raw text
);

-- ------------------------------------------------------------
-- بعد ما تكمل CSV import فـvoters_import_staging (الخطوة 3 أعلاه)،
-- شغّل هذا الجزء:
-- ------------------------------------------------------------

insert into public.voters (id, initials, commune_id, polling_station_id, district_raw)
select
  s.source_id,
  s.initials,
  c.id as commune_id,
  ps.id as polling_station_id,
  s.district_raw
from public.voters_import_staging s
left join public.communes c on c.name = s.commune_name
left join public.polling_stations ps
  on ps.commune_id = c.id
  and ps.center_name = s.center_name
  and ps.sub_office_number = nullif(trim(s.sub_office_number), '')::integer
on conflict (id) do update set
  initials = excluded.initials,
  commune_id = excluded.commune_id,
  polling_station_id = excluded.polling_station_id,
  district_raw = excluded.district_raw;

-- تحقق: عدد الصفوف المستوردة + نسبة الربط بالجماعة/مكتب التصويت
select count(*) as total_imported from public.voters;
select count(*) as matched_commune from public.voters where commune_id is not null;
select count(*) as matched_polling_station from public.voters where polling_station_id is not null;

-- إذا matched_commune ناقصة بزاف، معناها أسماء الجماعات فـcommunes ما
-- كتطابقش حرفيا مع أسماء tetouan2026 (احتمال اختلاف تشكيل/كتابة) —
-- شوف: select distinct commune_name from voters_import_staging
--       where commune_name not in (select name from communes);

-- بعد التأكد من الأرقام، يمكن تمسح جدول staging (اختياري):
-- drop table if exists public.voters_import_staging;
