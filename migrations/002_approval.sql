-- Kids Tracker — tambah approval Ibu per tugas
-- Jalankan sekali lewat Neon SQL editor (setelah 001_init.sql). Aman
-- dijalankan berkali-kali.

alter table completions add column if not exists approved boolean not null default false;
