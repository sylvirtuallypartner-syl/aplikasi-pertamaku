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

create table if not exists completions (
  child_id text not null,
  task_id integer not null references tasks(id) on delete cascade,
  entry_date date not null,
  done boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (child_id, task_id, entry_date)
);

create index if not exists completions_date_idx on completions (entry_date);

-- Reward/konsekuensi per anak berdasarkan persentase tugas selesai hari itu.
-- Hanya tampil di tampilan Orang Tua (PIN), tidak pernah dikirim ke tampilan anak.
create table if not exists reward_tiers (
  id integer generated always as identity primary key,
  child_id text not null check (child_id in ('sean', 'gavril')),
  min_percent int not null check (min_percent between 0 and 100),
  label text not null,
  created_at timestamptz not null default now()
);

create index if not exists reward_tiers_child_idx on reward_tiers (child_id, min_percent desc);

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

-- ============== SEED: reward/konsekuensi awal (bisa diedit lewat tampilan Orang Tua) ==============
insert into reward_tiers (child_id, min_percent, label)
select * from (values
  ('sean', 100, 'Semua selesai — Rp25.000 / pilih jajan favorit'),
  ('sean', 80, 'Hampir semua selesai — Rp15.000'),
  ('sean', 50, 'Separuh lebih — Rp5.000'),
  ('sean', 0, 'Belum sampai separuh — evaluasi bareng malam ini'),
  ('gavril', 100, 'Semua selesai — Rp10.000 / pilih jajan favorit'),
  ('gavril', 80, 'Hampir semua selesai — Rp7.000'),
  ('gavril', 50, 'Separuh lebih — Rp3.000'),
  ('gavril', 0, 'Belum sampai separuh — evaluasi bareng malam ini')
) as t(child_id, min_percent, label)
where not exists (select 1 from reward_tiers);
