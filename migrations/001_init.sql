-- Kids Tracker — schema (Vercel Postgres / Neon)
-- Jalankan sekali lewat Neon SQL editor (atau psql pakai DATABASE_URL dari
-- Vercel Storage tab). Daftar anak & tugas TIDAK disimpan di database —
-- keduanya statis di kode (src/lib/tasks.ts). Tabel ini hanya menyimpan
-- status "sudah dikerjakan / belum" per anak, per tugas, per tanggal.

create table if not exists completions (
  child_id text not null,
  task_id text not null,
  entry_date date not null,
  done boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (child_id, task_id, entry_date)
);

create index if not exists completions_date_idx on completions (entry_date);
