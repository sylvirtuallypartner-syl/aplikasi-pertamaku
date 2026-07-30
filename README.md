# Kids Tracker

Satu layar sederhana untuk daftar tugas harian Sean (11 tahun) dan Gavril
(6 tahun). Tiap anak punya daftar tugasnya sendiri, tugas untuk hari kerja
dan akhir pekan bisa berbeda, dan tiap orang cuma bisa mencentang tugas
miliknya sendiri. Semua orang bisa melihat semua baris tanpa login apa pun.

Tidak ada notifikasi, tidak ada dark mode, tidak ada pengaturan lain — sengaja
dibuat sesederhana mungkin supaya cepat dipakai rutin tiap hari.

## Cara pakai

1. Buka link Vercel dari HP.
2. Pilih nama kamu (Sean atau Gavril) — sekali saja, tersimpan otomatis di HP
   itu. Kalau HP dipakai bergantian, tap **Ganti** di pojok atas untuk pilih
   nama lain.
3. Tap tugas yang sudah selesai. Tugas milikmu bisa ditap, tugas milik anak
   satunya cuma bisa dilihat (abu-abu, tidak bisa ditap dari HP-mu).
4. Tugas yang muncul otomatis menyesuaikan hari ini — tugas khusus hari
   sekolah tidak muncul di weekend, dan sebaliknya.
5. Kalau dua HP dibuka bersamaan, centang di satu HP akan muncul di HP lain
   dalam beberapa detik tanpa perlu refresh manual.

## Struktur teknis

- **Next.js (App Router, TypeScript)** — deploy ke Vercel lewat integrasi
  GitHub (push ke branch ini otomatis ter-deploy).
- **Daftar anak & tugas statis di kode**: `src/lib/tasks.ts`. Tidak ada layar
  untuk menambah/mengedit tugas dari HP — supaya app tetap sesederhana
  mungkin. Untuk mengubah tugas, edit array di file itu lalu push, Vercel
  otomatis deploy ulang.
- **Yang tersimpan di database** hanya status "sudah/belum" per anak, per
  tugas, per tanggal (tabel `completions`).
- **Sinkron antar HP**: setiap HP polling ke server tiap 4 detik + saat layar
  dibuka lagi (mendekati real-time tanpa perlu WebSocket).

## Setup — sekali saja di dashboard Vercel

### 1. Deploy project ke Vercel

Kalau belum pernah di-import: di dashboard Vercel, klik **Add New → Project**,
pilih repo `aplikasi-pertamaku`, klik **Deploy**. Vercel otomatis mendeteksi
Next.js, tidak perlu ubah setting apa pun.

### 2. Sambungkan database (Vercel Postgres via Neon)

1. Buka project ini di dashboard Vercel → tab **Storage**.
2. Klik **Create Database** → pilih **Postgres** (disediakan oleh Neon) →
   **Connect** ke project ini.
3. Vercel otomatis mengisi environment variable `DATABASE_URL` (Production,
   Preview, Development) — kamu tidak perlu isi manual.

### 3. Jalankan migrasi tabel (sekali saja)

1. Di tab **Storage**, klik database yang baru dibuat → buka **Query** /
   **Open in Neon** (SQL editor bawaan Neon).
2. Salin isi file [`migrations/001_init.sql`](migrations/001_init.sql), tempel
   di SQL editor, lalu jalankan (Run). Ini membuat satu tabel `completions`.

Alternatif lewat terminal (kalau punya `psql`):

```bash
vercel env pull .env.local   # ambil DATABASE_URL dari Vercel
psql "$DATABASE_URL" -f migrations/001_init.sql
```

### 4. Selesai

Buka URL deployment dari HP. Tidak ada environment variable lain yang wajib
diisi.

## Development lokal (opsional)

```bash
vercel env pull .env.local   # menarik DATABASE_URL dari Vercel
npm install
npm run dev
```

Buka http://localhost:3000.

## Mengubah daftar tugas

Edit `src/lib/tasks.ts` — tiap tugas berupa:

```ts
{ id: "s5", label: "Beres tas & buku besok", weekdayOnly: true }
```

- `label`: teks tugas (usahakan singkat, di bawah 50 karakter).
- `weekdayOnly: true`: hanya muncul Senin–Jumat.
- `weekendOnly: true`: hanya muncul Sabtu–Minggu.
- Tanpa keduanya: muncul tiap hari.

Setelah edit, commit & push — Vercel otomatis deploy ulang.

## Catatan

"Kamu siapa" cuma disimpan di local storage HP masing-masing, tanpa
password. Ini disengaja (aplikasi keluarga, bukan sistem multi-tenant) —
cukup untuk mencegah salah tap secara tidak sengaja, bukan proteksi
keamanan yang ketat.
