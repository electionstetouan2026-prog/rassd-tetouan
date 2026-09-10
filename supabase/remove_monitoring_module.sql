-- ============================================================
-- حذف نهائي لكل بيانات وجداول وحدة الرصد/المراقبة (D-026، 10 شتنبر 2026)
-- ============================================================
-- ⚠️ تحذير: هذا السكريبت كيمسح البيانات نهائيا ولا يمكن التراجع عنه.
-- كيشمل: 255 إشارة (mentions)، 69 حساب مستهدف (target_accounts)،
-- 38 كلمة مراقبة (keywords)، سجل audit_log بالكامل، وكل المصادر
-- وعمليات الجمع المرتبطة بها.
--
-- هذا الملف **لا يُشغَّل من طرفي (Claude)** — قاعدة تشغيلية صارمة
-- عندي بخصوص الحذف النهائي للبيانات. خصك تشغّله بنفسك (علي) من:
-- Supabase Dashboard → SQL Editor → الصق هاد الكود → Run.
--
-- قبل التشغيل، تأكد:
--   1. راك متيقن 100% بلي بغيتي تمسح هاد البيانات نهائيا (سدينا فالرصد).
--   2. إيلا بغيتي نسخة احتياطية قبل، صيفط تصدير (export) ديال الجداول
--      هاذي من Supabase قبل ما تجري هاد السكريبت.
--   3. هاد السكريبت كيمسح الجداول بالكامل (DROP TABLE)، ماشي غير
--      الصفوف — يعني الجداول رايحة تختفي نهائيا من قاعدة البيانات.
-- ============================================================

-- 1) إزالة آلية append-only ديال audit_log قبل حذفه (trigger + function)
drop trigger if exists no_update_audit on public.audit_log;
drop trigger if exists no_delete_audit on public.audit_log;
drop function if exists public.block_audit_mutation();

-- 2) حذف الجداول بترتيب يحترم العلاقات (CASCADE كيمسح أي policy/index/FK مرتبط)
drop table if exists public.mention_sightings cascade;
drop table if exists public.mentions cascade;
drop table if exists public.collection_runs cascade;
drop table if exists public.sources cascade;
drop table if exists public.audit_log cascade;
drop table if exists public.keywords cascade;
drop table if exists public.target_accounts cascade;

-- ============================================================
-- بعد التشغيل: الجداول التالية كتبقى فالقاعدة (ماشي جزء من الرصد،
-- خاصها تبقى لأن وحدة المراقبين/الإدارة كتعتمد عليها):
--   public.profiles, public.communes, public.polling_stations,
--   public.observers, والدوال public.current_user_role() /
--   public.is_editor_or_admin()
-- ============================================================
