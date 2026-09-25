-- ============================================================
-- النتيجة الرسمية النهائية للائحة المحلية — دائرة تطوان، انتخابات
-- 23 شتنبر 2026. طلب علي (25 شتنبر 2026): بعد ما زودنا محضر رسمي
-- (S55C-6e26092416210.pdf، الصفحتين 1-2) فيه محضر لجنة الإحصاء
-- المكلفة بإحصاء الأصوات وإعلان نتائج الاقتراع لـ"الدائرة الانتخابية
-- المحلية: تطوان" مباشرة (17 مترشح/ة يمثلون 17 لائحة متنافسة على
-- المستوى المحلي، القاسم الانتخابي، وتوزيع 5 المقاعد المتاحة بالدائرة).
--
-- هاد الجدول ماشي بديل لـelection_results/election_results_summary
-- (اللي بقاو مبنيين على محضر اللائحة الجهوية كتقدير تحليلي حسب
-- المكتب/المدرسة، لعدم توفر تفصيل مكتب-بمكتب للائحة المحلية بعد) —
-- بلكل هذا هو الرقم الرسمي النهائي الوحيد المتوفر لينا لحد الآن
-- لأصوات زهير الركاني بالضبط فاللائحة المحلية (3593 صوتا، صفر مقاعد،
-- أكد علي صحة الرقم شخصيا 25 شتنبر 2026).
--
-- ملاحظة: الصفين رقم 9 (ادريس افتيس) و10 (سليمان اخماش) فيهم أرقام
-- مكتوبة بخط اليد صعيبة القراءة بدقة 100% (~1400-1800 صوت تقريبا) —
-- ماكاينش تأثير على ترتيب المقاعد الخمسة (بعيدين بزاف على حد 5077).
-- ============================================================

create table if not exists public.local_list_official_result (
  id uuid primary key default gen_random_uuid(),
  candidate_rank integer not null unique,
  candidate_name text not null,
  votes integer not null,
  seats_won integer not null default 0,
  is_our_candidate boolean not null default false,
  approx_reading boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.local_list_official_result enable row level security;
drop policy if exists "authenticated read local_list_official_result" on public.local_list_official_result;
create policy "authenticated read local_list_official_result" on public.local_list_official_result
  for select using (auth.role() = 'authenticated');
drop policy if exists "editors write local_list_official_result" on public.local_list_official_result;
create policy "editors write local_list_official_result" on public.local_list_official_result
  for all using (public.is_editor_or_admin());

delete from public.local_list_official_result;

insert into public.local_list_official_result
  (candidate_rank, candidate_name, votes, seats_won, is_our_candidate, approx_reading)
values
  (1,  'حميد الدراق',            2455,  0, false, false),
  (2,  'نور الدين الهروشي',       1420,  0, false, false),
  (3,  'اسحاق شرية',              2561,  0, false, false),
  (4,  'راشد الطالبي العلمي',     12834, 1, false, false),
  (5,  'منصف الطوب',              5077,  1, false, false),
  (6,  'محمد لوشامي',             306,   0, false, false),
  (7,  'احمد بوخبزة',             11909, 1, false, false),
  (8,  'محمد العربي احنين',       9852,  1, false, false),
  (9,  'ادريس افتيس',             1814,  0, false, true),
  (10, 'سليمان اخماش',            1644,  0, false, true),
  (11, 'زهير الركاني',            3593,  0, true,  false),
  (12, 'حمزة الخروبي',            1560,  0, false, false),
  (13, 'حكيم البحتوي',            220,   0, false, false),
  (14, 'محمد بن كريش',            2144,  0, false, false),
  (15, 'الهاشمي بوغيث',           142,   0, false, false),
  (16, 'ابراهيم بنصبيح',          7034,  1, false, false),
  (17, 'عماد اليوسفي',            109,   0, false, false);

-- بيانات السياق العامة للدائرة (من نفس المحضر، صفحة 2):
-- عدد الناخبات والناخبين المقيدين بالدائرة المحلية: 268994
-- القاسم الانتخابي: 53798
-- عدد المقاعد المخصصة للدائرة الانتخابية المحلية: 5
-- تاريخ المحضر: 23 شتنبر 2026 — رئيس لجنة الإحصاء: محمد سعيد الكشوري
