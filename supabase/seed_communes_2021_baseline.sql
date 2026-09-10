-- ============================================================
-- Seed: خط الأساس التاريخي الحقيقي لـ22 جماعة إقليم تطوان (نتائج
-- الجماعية 2021) — T-059، مصدر البيانات: S-017/S-018 (elections.ma)
-- idempotent: insert on conflict (name) يحدّث الأعمدة، آمن يتعاد تشغيله
-- ============================================================

insert into public.communes (name, type, registered_voters_est, has_detailed_station_data, participation_rate_2021, seats_total_2021, districts_count_2021, total_votes_2021, leading_party_2021, leading_party_seats_2021, leading_party_pct_2021)
values ('بني يدر', 'قروي', 2377, false, 0.8527, 16, 11, 2034, 'حزب الأصالة والمعاصرة', 10, 0.625)
on conflict (name) do update set
  type = excluded.type,
  registered_voters_est = excluded.registered_voters_est,
  participation_rate_2021 = excluded.participation_rate_2021,
  seats_total_2021 = excluded.seats_total_2021,
  districts_count_2021 = excluded.districts_count_2021,
  total_votes_2021 = excluded.total_votes_2021,
  leading_party_2021 = excluded.leading_party_2021,
  leading_party_seats_2021 = excluded.leading_party_seats_2021,
  leading_party_pct_2021 = excluded.leading_party_pct_2021;

insert into public.communes (name, type, registered_voters_est, has_detailed_station_data, participation_rate_2021, seats_total_2021, districts_count_2021, total_votes_2021, leading_party_2021, leading_party_seats_2021, leading_party_pct_2021)
values ('جبل لحبيب', 'قروي', 1962, false, 0.783, 16, 11, 1538, 'حزب التجمع الوطني للأحرار', 7, 0.4375)
on conflict (name) do update set
  type = excluded.type,
  registered_voters_est = excluded.registered_voters_est,
  participation_rate_2021 = excluded.participation_rate_2021,
  seats_total_2021 = excluded.seats_total_2021,
  districts_count_2021 = excluded.districts_count_2021,
  total_votes_2021 = excluded.total_votes_2021,
  leading_party_2021 = excluded.leading_party_2021,
  leading_party_seats_2021 = excluded.leading_party_seats_2021,
  leading_party_pct_2021 = excluded.leading_party_pct_2021;

insert into public.communes (name, type, registered_voters_est, has_detailed_station_data, participation_rate_2021, seats_total_2021, districts_count_2021, total_votes_2021, leading_party_2021, leading_party_seats_2021, leading_party_pct_2021)
values ('الواد', 'قروي', 4715, false, 0.7512, 18, 13, 3558, 'حزب التجمع الوطني للأحرار', 6, 0.3333)
on conflict (name) do update set
  type = excluded.type,
  registered_voters_est = excluded.registered_voters_est,
  participation_rate_2021 = excluded.participation_rate_2021,
  seats_total_2021 = excluded.seats_total_2021,
  districts_count_2021 = excluded.districts_count_2021,
  total_votes_2021 = excluded.total_votes_2021,
  leading_party_2021 = excluded.leading_party_2021,
  leading_party_seats_2021 = excluded.leading_party_seats_2021,
  leading_party_pct_2021 = excluded.leading_party_pct_2021;

insert into public.communes (name, type, registered_voters_est, has_detailed_station_data, participation_rate_2021, seats_total_2021, districts_count_2021, total_votes_2021, leading_party_2021, leading_party_seats_2021, leading_party_pct_2021)
values ('الزينات', 'قروي', 3403, false, 0.7447, 18, 13, 2543, 'حزب التجمع الوطني للأحرار', 14, 0.7778)
on conflict (name) do update set
  type = excluded.type,
  registered_voters_est = excluded.registered_voters_est,
  participation_rate_2021 = excluded.participation_rate_2021,
  seats_total_2021 = excluded.seats_total_2021,
  districts_count_2021 = excluded.districts_count_2021,
  total_votes_2021 = excluded.total_votes_2021,
  leading_party_2021 = excluded.leading_party_2021,
  leading_party_seats_2021 = excluded.leading_party_seats_2021,
  leading_party_pct_2021 = excluded.leading_party_pct_2021;

insert into public.communes (name, type, registered_voters_est, has_detailed_station_data, participation_rate_2021, seats_total_2021, districts_count_2021, total_votes_2021, leading_party_2021, leading_party_seats_2021, leading_party_pct_2021)
values ('بني حرشن', 'قروي', 3539, false, 0.7365, 16, 11, 2606, 'حزب الأصالة والمعاصرة', 10, 0.625)
on conflict (name) do update set
  type = excluded.type,
  registered_voters_est = excluded.registered_voters_est,
  participation_rate_2021 = excluded.participation_rate_2021,
  seats_total_2021 = excluded.seats_total_2021,
  districts_count_2021 = excluded.districts_count_2021,
  total_votes_2021 = excluded.total_votes_2021,
  leading_party_2021 = excluded.leading_party_2021,
  leading_party_seats_2021 = excluded.leading_party_seats_2021,
  leading_party_pct_2021 = excluded.leading_party_pct_2021;

insert into public.communes (name, type, registered_voters_est, has_detailed_station_data, participation_rate_2021, seats_total_2021, districts_count_2021, total_votes_2021, leading_party_2021, leading_party_seats_2021, leading_party_pct_2021)
values ('بني ليت', 'قروي', 2165, false, 0.7301, 16, 11, 1586, 'حزب العدالة والتنمية', 5, 0.3125)
on conflict (name) do update set
  type = excluded.type,
  registered_voters_est = excluded.registered_voters_est,
  participation_rate_2021 = excluded.participation_rate_2021,
  seats_total_2021 = excluded.seats_total_2021,
  districts_count_2021 = excluded.districts_count_2021,
  total_votes_2021 = excluded.total_votes_2021,
  leading_party_2021 = excluded.leading_party_2021,
  leading_party_seats_2021 = excluded.leading_party_seats_2021,
  leading_party_pct_2021 = excluded.leading_party_pct_2021;

insert into public.communes (name, type, registered_voters_est, has_detailed_station_data, participation_rate_2021, seats_total_2021, districts_count_2021, total_votes_2021, leading_party_2021, leading_party_seats_2021, leading_party_pct_2021)
values ('زاوية سيدي قاسم', 'قروي', 4521, false, 0.7284, 18, 13, 3300, 'حزب الأصالة والمعاصرة', 15, 0.8333)
on conflict (name) do update set
  type = excluded.type,
  registered_voters_est = excluded.registered_voters_est,
  participation_rate_2021 = excluded.participation_rate_2021,
  seats_total_2021 = excluded.seats_total_2021,
  districts_count_2021 = excluded.districts_count_2021,
  total_votes_2021 = excluded.total_votes_2021,
  leading_party_2021 = excluded.leading_party_2021,
  leading_party_seats_2021 = excluded.leading_party_seats_2021,
  leading_party_pct_2021 = excluded.leading_party_pct_2021;

insert into public.communes (name, type, registered_voters_est, has_detailed_station_data, participation_rate_2021, seats_total_2021, districts_count_2021, total_votes_2021, leading_party_2021, leading_party_seats_2021, leading_party_pct_2021)
values ('أولاد علي منصور', 'قروي', 1842, false, 0.728, 16, 11, 1353, 'حزب التجمع الوطني للأحرار', 12, 0.75)
on conflict (name) do update set
  type = excluded.type,
  registered_voters_est = excluded.registered_voters_est,
  participation_rate_2021 = excluded.participation_rate_2021,
  seats_total_2021 = excluded.seats_total_2021,
  districts_count_2021 = excluded.districts_count_2021,
  total_votes_2021 = excluded.total_votes_2021,
  leading_party_2021 = excluded.leading_party_2021,
  leading_party_seats_2021 = excluded.leading_party_seats_2021,
  leading_party_pct_2021 = excluded.leading_party_pct_2021;

insert into public.communes (name, type, registered_voters_est, has_detailed_station_data, participation_rate_2021, seats_total_2021, districts_count_2021, total_votes_2021, leading_party_2021, leading_party_seats_2021, leading_party_pct_2021)
values ('السحتريين', 'قروي', 4029, false, 0.7279, 18, 13, 2936, 'حزب التجمع الوطني للأحرار', 10, 0.5556)
on conflict (name) do update set
  type = excluded.type,
  registered_voters_est = excluded.registered_voters_est,
  participation_rate_2021 = excluded.participation_rate_2021,
  seats_total_2021 = excluded.seats_total_2021,
  districts_count_2021 = excluded.districts_count_2021,
  total_votes_2021 = excluded.total_votes_2021,
  leading_party_2021 = excluded.leading_party_2021,
  leading_party_seats_2021 = excluded.leading_party_seats_2021,
  leading_party_pct_2021 = excluded.leading_party_pct_2021;

insert into public.communes (name, type, registered_voters_est, has_detailed_station_data, participation_rate_2021, seats_total_2021, districts_count_2021, total_votes_2021, leading_party_2021, leading_party_seats_2021, leading_party_pct_2021)
values ('صدينة', 'قروي', 3460, false, 0.7247, 16, 11, 2511, 'حزب الأصالة والمعاصرة', 13, 0.8125)
on conflict (name) do update set
  type = excluded.type,
  registered_voters_est = excluded.registered_voters_est,
  participation_rate_2021 = excluded.participation_rate_2021,
  seats_total_2021 = excluded.seats_total_2021,
  districts_count_2021 = excluded.districts_count_2021,
  total_votes_2021 = excluded.total_votes_2021,
  leading_party_2021 = excluded.leading_party_2021,
  leading_party_seats_2021 = excluded.leading_party_seats_2021,
  leading_party_pct_2021 = excluded.leading_party_pct_2021;

insert into public.communes (name, type, registered_voters_est, has_detailed_station_data, participation_rate_2021, seats_total_2021, districts_count_2021, total_votes_2021, leading_party_2021, leading_party_seats_2021, leading_party_pct_2021)
values ('عين لحصن', 'قروي', 3711, false, 0.7235, 16, 11, 2692, 'حزب الأصالة والمعاصرة', 6, 0.375)
on conflict (name) do update set
  type = excluded.type,
  registered_voters_est = excluded.registered_voters_est,
  participation_rate_2021 = excluded.participation_rate_2021,
  seats_total_2021 = excluded.seats_total_2021,
  districts_count_2021 = excluded.districts_count_2021,
  total_votes_2021 = excluded.total_votes_2021,
  leading_party_2021 = excluded.leading_party_2021,
  leading_party_seats_2021 = excluded.leading_party_seats_2021,
  leading_party_pct_2021 = excluded.leading_party_pct_2021;

insert into public.communes (name, type, registered_voters_est, has_detailed_station_data, participation_rate_2021, seats_total_2021, districts_count_2021, total_votes_2021, leading_party_2021, leading_party_seats_2021, leading_party_pct_2021)
values ('بغاغزة', 'قروي', 3026, false, 0.7167, 16, 11, 2174, 'حزب التجمع الوطني للأحرار', 15, 0.9375)
on conflict (name) do update set
  type = excluded.type,
  registered_voters_est = excluded.registered_voters_est,
  participation_rate_2021 = excluded.participation_rate_2021,
  seats_total_2021 = excluded.seats_total_2021,
  districts_count_2021 = excluded.districts_count_2021,
  total_votes_2021 = excluded.total_votes_2021,
  leading_party_2021 = excluded.leading_party_2021,
  leading_party_seats_2021 = excluded.leading_party_seats_2021,
  leading_party_pct_2021 = excluded.leading_party_pct_2021;

insert into public.communes (name, type, registered_voters_est, has_detailed_station_data, participation_rate_2021, seats_total_2021, districts_count_2021, total_votes_2021, leading_party_2021, leading_party_seats_2021, leading_party_pct_2021)
values ('الخروب', 'قروي', 1322, false, 0.7106, 16, 11, 945, 'حزب الأصالة والمعاصرة', 16, 1)
on conflict (name) do update set
  type = excluded.type,
  registered_voters_est = excluded.registered_voters_est,
  participation_rate_2021 = excluded.participation_rate_2021,
  seats_total_2021 = excluded.seats_total_2021,
  districts_count_2021 = excluded.districts_count_2021,
  total_votes_2021 = excluded.total_votes_2021,
  leading_party_2021 = excluded.leading_party_2021,
  leading_party_seats_2021 = excluded.leading_party_seats_2021,
  leading_party_pct_2021 = excluded.leading_party_pct_2021;

insert into public.communes (name, type, registered_voters_est, has_detailed_station_data, participation_rate_2021, seats_total_2021, districts_count_2021, total_votes_2021, leading_party_2021, leading_party_seats_2021, leading_party_pct_2021)
values ('الملاليين', 'قروي', 4517, false, 0.7095, 18, 13, 3211, 'حزب الأصالة والمعاصرة', 11, 0.6111)
on conflict (name) do update set
  type = excluded.type,
  registered_voters_est = excluded.registered_voters_est,
  participation_rate_2021 = excluded.participation_rate_2021,
  seats_total_2021 = excluded.seats_total_2021,
  districts_count_2021 = excluded.districts_count_2021,
  total_votes_2021 = excluded.total_votes_2021,
  leading_party_2021 = excluded.leading_party_2021,
  leading_party_seats_2021 = excluded.leading_party_seats_2021,
  leading_party_pct_2021 = excluded.leading_party_pct_2021;

insert into public.communes (name, type, registered_voters_est, has_detailed_station_data, participation_rate_2021, seats_total_2021, districts_count_2021, total_votes_2021, leading_party_2021, leading_party_seats_2021, leading_party_pct_2021)
values ('الحمراء', 'قروي', 4476, false, 0.6999, 18, 13, 3142, 'حزب الاستقلال', 8, 0.4444)
on conflict (name) do update set
  type = excluded.type,
  registered_voters_est = excluded.registered_voters_est,
  participation_rate_2021 = excluded.participation_rate_2021,
  seats_total_2021 = excluded.seats_total_2021,
  districts_count_2021 = excluded.districts_count_2021,
  total_votes_2021 = excluded.total_votes_2021,
  leading_party_2021 = excluded.leading_party_2021,
  leading_party_seats_2021 = excluded.leading_party_seats_2021,
  leading_party_pct_2021 = excluded.leading_party_pct_2021;

insert into public.communes (name, type, registered_voters_est, has_detailed_station_data, participation_rate_2021, seats_total_2021, districts_count_2021, total_votes_2021, leading_party_2021, leading_party_seats_2021, leading_party_pct_2021)
values ('سوق القديم', 'قروي', 3912, false, 0.6949, 18, 13, 2729, 'حزب الأصالة والمعاصرة', 15, 0.8333)
on conflict (name) do update set
  type = excluded.type,
  registered_voters_est = excluded.registered_voters_est,
  participation_rate_2021 = excluded.participation_rate_2021,
  seats_total_2021 = excluded.seats_total_2021,
  districts_count_2021 = excluded.districts_count_2021,
  total_votes_2021 = excluded.total_votes_2021,
  leading_party_2021 = excluded.leading_party_2021,
  leading_party_seats_2021 = excluded.leading_party_seats_2021,
  leading_party_pct_2021 = excluded.leading_party_pct_2021;

insert into public.communes (name, type, registered_voters_est, has_detailed_station_data, participation_rate_2021, seats_total_2021, districts_count_2021, total_votes_2021, leading_party_2021, leading_party_seats_2021, leading_party_pct_2021)
values ('بني سعيد', 'قروي', 4239, false, 0.6893, 18, 13, 2926, 'حزب الأصالة والمعاصرة', 10, 0.5556)
on conflict (name) do update set
  type = excluded.type,
  registered_voters_est = excluded.registered_voters_est,
  participation_rate_2021 = excluded.participation_rate_2021,
  seats_total_2021 = excluded.seats_total_2021,
  districts_count_2021 = excluded.districts_count_2021,
  total_votes_2021 = excluded.total_votes_2021,
  leading_party_2021 = excluded.leading_party_2021,
  leading_party_seats_2021 = excluded.leading_party_seats_2021,
  leading_party_pct_2021 = excluded.leading_party_pct_2021;

insert into public.communes (name, type, registered_voters_est, has_detailed_station_data, participation_rate_2021, seats_total_2021, districts_count_2021, total_votes_2021, leading_party_2021, leading_party_seats_2021, leading_party_pct_2021)
values ('أزلا', 'قروي', 8002, false, 0.6887, 28, 23, 5537, 'حزب الأصالة والمعاصرة', 27, 0.9643)
on conflict (name) do update set
  type = excluded.type,
  registered_voters_est = excluded.registered_voters_est,
  participation_rate_2021 = excluded.participation_rate_2021,
  seats_total_2021 = excluded.seats_total_2021,
  districts_count_2021 = excluded.districts_count_2021,
  total_votes_2021 = excluded.total_votes_2021,
  leading_party_2021 = excluded.leading_party_2021,
  leading_party_seats_2021 = excluded.leading_party_seats_2021,
  leading_party_pct_2021 = excluded.leading_party_pct_2021;

insert into public.communes (name, type, registered_voters_est, has_detailed_station_data, participation_rate_2021, seats_total_2021, districts_count_2021, total_votes_2021, leading_party_2021, leading_party_seats_2021, leading_party_pct_2021)
values ('دار بني قريش', 'قروي', 4397, false, 0.6431, 18, 13, 2836, 'حزب التجمع الوطني للأحرار', 10, 0.5556)
on conflict (name) do update set
  type = excluded.type,
  registered_voters_est = excluded.registered_voters_est,
  participation_rate_2021 = excluded.participation_rate_2021,
  seats_total_2021 = excluded.seats_total_2021,
  districts_count_2021 = excluded.districts_count_2021,
  total_votes_2021 = excluded.total_votes_2021,
  leading_party_2021 = excluded.leading_party_2021,
  leading_party_seats_2021 = excluded.leading_party_seats_2021,
  leading_party_pct_2021 = excluded.leading_party_pct_2021;

insert into public.communes (name, type, registered_voters_est, has_detailed_station_data, participation_rate_2021, seats_total_2021, districts_count_2021, total_votes_2021, leading_party_2021, leading_party_seats_2021, leading_party_pct_2021)
values ('الزيتون', 'قروي', 5354, false, 0.6172, 18, 13, 3332, 'حزب الأصالة والمعاصرة', 14, 0.7778)
on conflict (name) do update set
  type = excluded.type,
  registered_voters_est = excluded.registered_voters_est,
  participation_rate_2021 = excluded.participation_rate_2021,
  seats_total_2021 = excluded.seats_total_2021,
  districts_count_2021 = excluded.districts_count_2021,
  total_votes_2021 = excluded.total_votes_2021,
  leading_party_2021 = excluded.leading_party_2021,
  leading_party_seats_2021 = excluded.leading_party_seats_2021,
  leading_party_pct_2021 = excluded.leading_party_pct_2021;

insert into public.communes (name, type, registered_voters_est, has_detailed_station_data, participation_rate_2021, seats_total_2021, districts_count_2021, total_votes_2021, leading_party_2021, leading_party_seats_2021, leading_party_pct_2021)
values ('واد لو', 'حضري', 4707, false, 0.6167, 18, 13, 2911, 'حزب الاتحاد الاشتراكي للقوات الشعبية', 11, 0.6111)
on conflict (name) do update set
  type = excluded.type,
  registered_voters_est = excluded.registered_voters_est,
  participation_rate_2021 = excluded.participation_rate_2021,
  seats_total_2021 = excluded.seats_total_2021,
  districts_count_2021 = excluded.districts_count_2021,
  total_votes_2021 = excluded.total_votes_2021,
  leading_party_2021 = excluded.leading_party_2021,
  leading_party_seats_2021 = excluded.leading_party_seats_2021,
  leading_party_pct_2021 = excluded.leading_party_pct_2021;

insert into public.communes (name, type, registered_voters_est, has_detailed_station_data, participation_rate_2021, seats_total_2021, districts_count_2021, total_votes_2021, leading_party_2021, leading_party_seats_2021, leading_party_pct_2021)
values ('تطوان', 'حضري', 151485, true, 0.1912, 54, 1, 28964, 'حزب التجمع الوطني للأحرار', 16, 0.2963)
on conflict (name) do update set
  type = excluded.type,
  registered_voters_est = excluded.registered_voters_est,
  participation_rate_2021 = excluded.participation_rate_2021,
  seats_total_2021 = excluded.seats_total_2021,
  districts_count_2021 = excluded.districts_count_2021,
  total_votes_2021 = excluded.total_votes_2021,
  leading_party_2021 = excluded.leading_party_2021,
  leading_party_seats_2021 = excluded.leading_party_seats_2021,
  leading_party_pct_2021 = excluded.leading_party_pct_2021;
