-- Kids Tracker — tabel langganan push notification (reminder harian).
-- Aman dijalankan berkali-kali, tidak menyentuh data yang sudah ada.

create table if not exists push_subscriptions (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
