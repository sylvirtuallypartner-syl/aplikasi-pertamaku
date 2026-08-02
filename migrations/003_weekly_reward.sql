-- Kids Tracker — reward mingguan non-uang (tier berdasarkan % disetujui)
-- Jalankan sekali lewat Neon SQL editor (setelah 001 & 002). Aman
-- dijalankan berkali-kali (idempotent).

create table if not exists weekly_reward_tiers (
  id integer generated always as identity primary key,
  child_id text not null check (child_id in ('sean', 'gavril')),
  min_percent int not null check (min_percent between 0 and 100),
  label text not null
);

create index if not exists weekly_reward_tiers_child_idx on weekly_reward_tiers (child_id, min_percent desc);

insert into weekly_reward_tiers (child_id, min_percent, label)
select * from (values
  ('sean', 95, 'Boleh makanan favorit'),
  ('sean', 85, 'Boleh download 1 game'),
  ('gavril', 95, 'Boleh makanan favorit'),
  ('gavril', 85, 'Boleh download 1 game')
) as t(child_id, min_percent, label)
where not exists (select 1 from weekly_reward_tiers);
