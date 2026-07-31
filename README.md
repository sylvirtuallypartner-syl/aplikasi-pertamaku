# Kids Tracker

Satu layar sederhana untuk daftar tugas harian Sean (11 tahun) dan Gavril
(6 tahun), plus tampilan Orang Tua (PIN) untuk memantau progres dan reward.

- Tiap anak cuma melihat & mencentang daftar tugasnya sendiri (tidak ada
  daftar anak lain di layarnya).
- Tugas untuk hari kerja dan akhir pekan bisa berbeda, muncul otomatis sesuai
  hari ini.
- Update tersinkron near-real-time antar HP (polling tiap 4 detik).
- Tampilan **Orang Tua** (dikunci PIN) bisa melihat progres kedua anak +
  reward/konsekuensi yang berlaku, serta mengedit daftar tugas dan
  reward/konsekuensi. Reward/konsekuensi **sengaja disembunyikan dari
  tampilan anak** — anak hanya melihat checklist biasa.

Tidak ada notifikasi, tidak ada dark mode, tidak ada pengaturan lain di luar
itu — sengaja dibuat sesederhana mungkin supaya cepat dipakai rutin tiap hari.

## Cara pakai

### Sebagai anak

1. Buka link Vercel dari HP.
2. Pilih nama kamu (Sean atau Gavril) — sekali saja, tersimpan otomatis di HP
   itu. Kalau HP dipakai bergantian, tap **Ganti** di pojok atas untuk pilih
   nama lain.
3. Tap tugas yang sudah selesai — hanya tugas milikmu yang muncul.
4. Tugas yang muncul otomatis menyesuaikan hari ini — tugas khusus hari
   sekolah tidak muncul di weekend, dan sebaliknya.
5. Kalau dua HP dibuka bersamaan, centang di satu HP akan muncul di HP lain
   dalam beberapa detik tanpa perlu refresh manual.

### Sebagai orang tua

1. Di layar pilih nama, tap **Orang Tua**, masukkan PIN.
2. Lihat progres hari ini (jumlah tugas selesai + persentase) dan reward/
   konsekuensi yang berlaku untuk tiap anak.
3. **Kelola daftar tugas**: tambah, edit teks, ubah weekday/weekend saja, atau
   hapus tugas — per anak.
4. **Kelola reward / konsekuensi**: atur ambang persentase + keterangan
   (mis. "≥80% — Rp15.000"), edit atau hapus tier yang ada.
5. Tap **Keluar** untuk logout dari mode Orang Tua.

## Struktur teknis

- **Next.js (App Router, TypeScript)** — deploy ke Vercel lewat integrasi
  GitHub (push ke branch ini otomatis ter-deploy).
- **Daftar anak** (nama, umur, emoji, warna) statis di kode:
  `src/lib/children.ts`.
- **Daftar tugas & reward/konsekuensi tersimpan di database**, bisa diedit
  lewat tampilan Orang Tua — tidak perlu edit kode untuk mengubahnya.
- **Status harian** (`completions`) juga di database, per anak per tugas per
  tanggal.
- **Reward/konsekuensi** (`reward_tiers`) hanya bisa diakses lewat endpoint
  yang mengecek sesi Orang Tua (cookie PIN) — tidak pernah dikirim ke
  tampilan anak.
- **Sinkron antar HP**: polling ke server tiap 4 detik + saat layar dibuka
  lagi (mendekati real-time tanpa perlu WebSocket).

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
   di SQL editor, lalu jalankan (Run). Ini membuat tabel `tasks`,
   `completions`, `reward_tiers`, lengkap dengan tugas & reward awal yang
   bisa kamu edit lagi lewat tampilan Orang Tua.

Alternatif lewat terminal (kalau punya `psql`):

```bash
vercel env pull .env.local   # ambil DATABASE_URL dari Vercel
psql "$DATABASE_URL" -f migrations/001_init.sql
```

### 4. Set PIN Orang Tua

Di Vercel → Project Settings → Environment Variables, tambahkan:

```
PARENT_PIN=1234
```

(bebas berapa digit/angka, ganti sesuai keinginan). Redeploy sekali setelah
menambahkan variable ini kalau deployment sebelumnya sudah berjalan duluan.

### 5. Selesai

Buka URL deployment dari HP.

## Development lokal (opsional)

```bash
vercel env pull .env.local   # menarik DATABASE_URL & PARENT_PIN dari Vercel
npm install
npm run dev
```

Buka http://localhost:3000.

## Catatan keamanan

- "Kamu siapa" (Sean/Gavril) cuma disimpan di local storage HP masing-masing,
  tanpa password — disengaja (aplikasi keluarga, bukan sistem multi-tenant),
  cukup untuk mencegah salah tap secara tidak sengaja.
- Mode Orang Tua dikunci PIN sederhana (`PARENT_PIN`), diverifikasi di server
  dan disimpan sebagai cookie httpOnly bertanda tangan selama 12 jam. Endpoint
  yang mengubah tugas/reward, dan endpoint yang membaca reward/konsekuensi,
  semuanya menolak permintaan tanpa sesi Orang Tua yang valid — jadi anak
  tidak bisa mengakses data reward lewat DevTools sekalipun.
