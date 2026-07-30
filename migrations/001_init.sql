-- Misi Harian Kemandirian — schema awal (Vercel Postgres / Neon)
-- Jalankan sekali lewat Neon SQL editor (atau `vercel env pull` + psql / neon cli).

create table if not exists children (
  id text primary key,          -- 'k11' | 'k6'
  name text not null,
  age int not null,
  mode text not null check (mode in ('binary', 'tri'))
);

create table if not exists tasks (
  id text primary key,          -- 'b1'..'b22', 'a1'..'a17'
  child_id text not null references children(id),
  label text not null,
  weekday_only boolean not null default false,
  weekend_only boolean not null default false,
  sort_order int not null
);

create table if not exists entries (
  id bigint generated always as identity primary key,
  child_id text not null references children(id),
  task_id text not null references tasks(id),
  entry_date date not null,
  value int not null default 0,   -- 0/1 untuk k11 (binary), 0/1/2 untuk k6 (tri)
  updated_at timestamptz not null default now(),
  unique (child_id, task_id, entry_date)
);

create index if not exists entries_child_date_idx on entries (child_id, entry_date);

-- ============== SEED: children ==============
insert into children (id, name, age, mode) values
  ('k11', 'Sean', 11, 'binary'),
  ('k6', 'Gavril', 6, 'tri')
on conflict (id) do nothing;

-- ============== SEED: tasks Sean (k11) ==============
insert into tasks (id, child_id, label, weekday_only, weekend_only, sort_order) values
  ('b1', 'k11', 'Bangun pagi tanpa dibangunkan (weekday 05.00-05.30 / weekend 08.00-09.00)', false, false, 1),
  ('b2', 'k11', 'Doa pagi', false, false, 2),
  ('b3', 'k11', 'Minum air putih (pagi)', false, false, 3),
  ('b4', 'k11', 'Beres kasur sendiri', false, false, 4),
  ('b5', 'k11', 'Mandi + sikat gigi sendiri', false, false, 5),
  ('b6', 'k11', 'Siapkan baju sendiri + sisiran', false, false, 6),
  ('b7', 'k11', 'Sarapan habis + minum vitamin', false, false, 7),
  ('b8', 'k11', 'Smartick (belajar mandiri, tanpa diingatkan)', false, false, 8),
  ('b9', 'k11', 'Makan siang / bekal habis', false, false, 9),
  ('b10', 'k11', 'Beres sepatu & sandal setelah dipakai', false, false, 10),
  ('b11', 'k11', 'Beres tas sekolah/les & siapkan buku besok', true, false, 11),
  ('b12', 'k11', 'Les catur / siap-siap sekolah minggu', false, true, 12),
  ('b13', 'k11', 'Minum air cukup (target weekday 1-1,5L / weekend 2L)', false, false, 13),
  ('b14', 'k11', 'Olahraga: pull up, skipping, jumping jack (15-30 menit)', false, false, 14),
  ('b15', 'k11', 'Main/latihan piano (15-30 menit)', false, false, 15),
  ('b16', 'k11', 'Beres mainan setelah main', false, false, 16),
  ('b17', 'k11', 'Atur waktu main gadget sendiri', false, false, 17),
  ('b18', 'k11', 'Rapikan barang setelah dipakai', false, false, 18),
  ('b19', 'k11', 'Baca buku/belajar mandiri (15-30 menit)', false, false, 19),
  ('b20', 'k11', 'Renungan dan doa sebelum tidur', false, false, 20),
  ('b21', 'k11', 'Sikat gigi malam', false, false, 21),
  ('b22', 'k11', 'Tidur jam 7-8 tanpa disuruh', false, false, 22)
on conflict (id) do nothing;

-- ============== SEED: tasks Gavril (k6) ==============
insert into tasks (id, child_id, label, weekday_only, weekend_only, sort_order) values
  ('a1', 'k6', 'Bangun pagi', false, false, 1),
  ('a2', 'k6', 'Doa pagi', false, false, 2),
  ('a3', 'k6', 'Mandi sendiri', false, false, 3),
  ('a4', 'k6', 'Sikat gigi pagi', false, false, 4),
  ('a5', 'k6', 'Siapkan & pakai baju sendiri', false, false, 5),
  ('a6', 'k6', 'Bekal habis', true, false, 6),
  ('a7', 'k6', 'Botol minum habis', true, false, 7),
  ('a8', 'k6', 'Makan malam sampai habis', false, false, 8),
  ('a9', 'k6', 'Minum air cukup', false, false, 9),
  ('a10', 'k6', 'Beres mainan setelah main', false, false, 10),
  ('a11', 'k6', 'Sabar, tidak paksa-paksa', false, false, 11),
  ('a12', 'k6', 'Olahraga: pull up, skipping, jumping jack (15 menit)', false, false, 12),
  ('a13', 'k6', 'Beres sepatu & sandal (kalau habis pergi)', false, false, 13),
  ('a14', 'k6', 'Doa malam', false, false, 14),
  ('a15', 'k6', 'Sikat gigi malam', false, false, 15),
  ('a16', 'k6', 'Tidur sendiri tanpa ditemani (Mandiri) / tanpa disuruh tapi tidak di kamar sendiri (Diingatkan)', false, false, 16),
  ('a17', 'k6', 'Jaga barang, tidak dirusak', false, false, 17)
on conflict (id) do nothing;
