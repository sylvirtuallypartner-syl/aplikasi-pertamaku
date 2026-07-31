-- Kids Tracker — schema (Vercel Postgres / Neon)
-- Jalankan sekali lewat Neon SQL editor (atau psql pakai DATABASE_URL dari
-- Vercel Storage tab). Aman dijalankan berkali-kali (idempotent) — seed
-- data hanya masuk kalau tabel terkait masih kosong.

-- id pakai "integer" (bukan bigint) supaya driver Postgres mengembalikannya
-- sebagai JS number, bukan string — dipakai langsung sebagai taskId di API.
create table if not exists tasks (
  id integer generated always as identity primary key,
  child_id text not null check (child_id in ('sean', 'gavril')),
  label text not null,
  weekday_only boolean not null default false,
  weekend_only boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- "done" = dilaporkan anak (centang pertama). "approved" = disahkan Ibu
-- lewat tampilan Orang Tua (centang kedua) — reward hanya dihitung dari
-- tugas yang approved.
create table if not exists completions (
  child_id text not null,
  task_id integer not null references tasks(id) on delete cascade,
  entry_date date not null,
  done boolean not null default false,
  approved boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (child_id, task_id, entry_date)
);

create index if not exists completions_date_idx on completions (entry_date);

-- Reward harian = jumlah tugas selesai x tarif per tugas (Rupiah), beda tiap
-- anak. Hanya tampil di tampilan Orang Tua (PIN), tidak pernah dikirim ke
-- tampilan anak. Reward mingguan belum ditentukan — belum ada di schema ini.
drop table if exists reward_tiers;

create table if not exists reward_rates (
  child_id text primary key check (child_id in ('sean', 'gavril')),
  amount_per_task integer not null default 0
);

-- ============== SEED: tugas awal (bisa diedit lewat tampilan Orang Tua) ==============
insert into tasks (child_id, label, weekday_only, weekend_only, sort_order)
select * from (values
  ('sean', 'Rapikan kasur', false, false, 1),
  ('sean', 'Mandi & sikat gigi pagi', false, false, 2),
  ('sean', 'Sarapan habis', false, false, 3),
  ('sean', 'Bekal / makan siang habis', false, false, 4),
  ('sean', 'Beres tas & buku besok', true, false, 5),
  ('sean', 'Belajar mandiri 15-30 menit', false, false, 6),
  ('sean', 'Olahraga 15 menit', false, false, 7),
  ('sean', 'Main piano 15-30 menit', false, false, 8),
  ('sean', 'Beres mainan setelah main', false, false, 9),
  ('sean', 'Les catur', false, true, 10),
  ('sean', 'Sikat gigi malam', false, false, 11),
  ('sean', 'Tidur tepat waktu', false, false, 12),
  ('gavril', 'Bangun pagi', false, false, 1),
  ('gavril', 'Mandi sendiri', false, false, 2),
  ('gavril', 'Sikat gigi pagi', false, false, 3),
  ('gavril', 'Pakai baju sendiri', false, false, 4),
  ('gavril', 'Bekal habis', true, false, 5),
  ('gavril', 'Botol minum habis', true, false, 6),
  ('gavril', 'Makan malam habis', false, false, 7),
  ('gavril', 'Beres mainan setelah main', false, false, 8),
  ('gavril', 'Olahraga 15 menit', false, false, 9),
  ('gavril', 'Sikat gigi malam', false, false, 10),
  ('gavril', 'Tidur sendiri', false, false, 11)
) as t(child_id, label, weekday_only, weekend_only, sort_order)
where not exists (select 1 from tasks);

-- ============== SEED: tarif reward awal (bisa diedit lewat tampilan Orang Tua) ==============
insert into reward_rates (child_id, amount_per_task) values
  ('sean', 1500),
  ('gavril', 1000)
on conflict (child_id) do nothing;
