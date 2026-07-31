# Kids Tracker

Satu layar sederhana untuk daftar tugas harian Sean (11 tahun) dan Gavril
(6 tahun), plus tampilan Orang Tua (PIN) untuk memantau progres dan reward.

- Tiap anak melihat daftar tugas **kedua anak** di satu layar, tapi cuma bisa
  menandai (tap) barisnya **sendiri** — baris anak lain tetap terlihat tapi
  abu-abu/tidak bisa disentuh dari HP-nya.
- Tugas untuk hari kerja dan akhir pekan bisa berbeda, muncul otomatis sesuai
  hari ini.
- Update tersinkron near-real-time antar HP (polling tiap 4 detik).
- Status tiap tugas punya 2 tahap: anak tap = **dilaporkan** (⬜ → ✅), lalu
  Ibu (lewat tampilan Orang Tua, PIN) tap lagi = **disahkan** (✅ → ✅✅).
- Tampilan **Orang Tua** (dikunci PIN 6 digit) bisa melihat progres kedua
  anak, mengesahkan tugas yang dilaporkan, serta mengedit daftar tugas dan
  tarif reward. Reward dihitung **per tugas yang sudah disahkan Ibu** (mis.
  Sean Rp1.500/tugas, Gavril Rp1.000/tugas) — tugas yang baru dilaporkan
  tapi belum disahkan belum dihitung reward. Reward **sengaja disembunyikan
  dari tampilan anak** — anak hanya melihat status ⬜/✅/✅✅ biasa. Reward
  mingguan belum ditentukan, jadi belum ada di app ini.

Tidak ada notifikasi, tidak ada dark mode, tidak ada pengaturan lain di luar
itu — sengaja dibuat sesederhana mungkin supaya cepat dipakai rutin tiap hari.

## Cara pakai

### Sebagai anak

1. Buka link Vercel dari HP.
2. Pilih nama kamu (Sean atau Gavril) — sekali saja, tersimpan otomatis di HP
   itu. Kalau HP dipakai bergantian, tap **Ganti** di pojok atas untuk pilih
   nama lain.
3. Tap tugas yang sudah selesai — status berubah dari ⬜ jadi ✅. Tugas milik
   anak satunya kelihatan juga di layar yang sama, tapi abu-abu dan tidak
   bisa ditap dari HP-mu.
4. Setelah Ibu mengesahkan lewat tampilan Orang Tua, status berubah jadi ✅✅
   — itu tandanya sudah benar-benar dihitung untuk reward.
5. Tugas yang muncul otomatis menyesuaikan hari ini — tugas khusus hari
   sekolah tidak muncul di weekend, dan sebaliknya.
6. Kalau dua HP dibuka bersamaan, centang di satu HP akan muncul di HP lain
   dalam beberapa detik tanpa perlu refresh manual.

### Sebagai orang tua

1. Di layar pilih nama, tap **Orang Tua**, masukkan PIN (6 digit).
2. Lihat progres hari ini per anak: berapa yang **dilaporkan** (ditap anak)
   dan berapa yang **disetujui Ibu**, plus reward hari ini (dihitung dari
   yang disetujui saja).
3. **Sahkan tugas**: tap baris tugas yang berstatus ✅ (sudah dilaporkan)
   untuk mengesahkannya jadi ✅✅ — tap lagi untuk membatalkan kalau salah
   pencet. Tugas yang masih ⬜ (belum dilaporkan anak) tidak bisa ditap dulu.
4. **Kelola daftar tugas**: tambah, edit teks, ubah weekday/weekend saja, atau
   hapus tugas — per anak.
5. **Ubah tarif reward per tugas**: ganti nominal Rupiah per tugas yang
   disetujui, beda-beda per anak.
6. Tap **Keluar** untuk logout dari mode Orang Tua.

Reward mingguan belum ditentukan — belum ada di app ini, bisa ditambah nanti
kalau sudah diputuskan.

## Struktur teknis

- **Next.js (App Router, TypeScript)** — deploy ke Vercel lewat integrasi
  GitHub (push ke branch ini otomatis ter-deploy).
- **Daftar anak** (nama, umur, emoji, warna) statis di kode:
  `src/lib/children.ts`.
- **Daftar tugas & tarif reward tersimpan di database**, bisa diedit lewat
  tampilan Orang Tua — tidak perlu edit kode untuk mengubahnya.
- **Status harian** (`completions`) juga di database, per anak per tugas per
  tanggal — kolom `done` (dilaporkan anak) dan `approved` (disahkan Ibu)
  terpisah. Anak cuma boleh mengubah `done` (lewat `/api/status`); hanya sesi
  Orang Tua yang boleh mengubah `approved` (lewat `/api/approve`, dan gagal
  kalau `done` masih false). Mengubah `done` jadi false otomatis mengembalikan
  `approved` ke false, supaya tidak ada approval basi menempel di laporan
  yang sudah berubah.
- **Tarif reward** (`reward_rates`, satu baris per anak — jumlah Rupiah per
  tugas yang disetujui) hanya bisa diakses lewat endpoint yang mengecek sesi
  Orang Tua (cookie PIN) — tidak pernah dikirim ke tampilan anak.
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
   `completions`, `reward_rates`, lengkap dengan tugas & tarif reward awal
   (Sean Rp1.500/tugas, Gavril Rp1.000/tugas) yang bisa kamu ubah lagi lewat
   tampilan Orang Tua.
3. Kalau database ini **sudah pernah** kamu setup sebelumnya (sudah ada
   tabel `completions`), jalankan juga [`migrations/002_approval.sql`](migrations/002_approval.sql)
   di SQL editor yang sama — ini menambah kolom `approved` (persetujuan Ibu)
   yang belum ada di setup lama. Aman dijalankan meski kolomnya sudah ada.

Alternatif lewat terminal (kalau punya `psql`):

```bash
vercel env pull .env.local   # ambil DATABASE_URL dari Vercel
psql "$DATABASE_URL" -f migrations/001_init.sql
psql "$DATABASE_URL" -f migrations/002_approval.sql
```

### 4. Set PIN Orang Tua

Di Vercel → Project Settings → Environment Variables, tambahkan:

```
PARENT_PIN=482913
```

**Harus 6 digit angka** (ganti `482913` dengan angka pilihanmu sendiri —
jangan yang gampang ditebak seperti 111111 atau 123456). Redeploy sekali
setelah menambahkan/mengubah variable ini kalau deployment sebelumnya sudah
berjalan duluan.

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
  tanpa password — disengaja (aplikasi keluarga, bukan sistem multi-tenant).
  Server juga menolak tap di baris yang bukan milik "kamu siapa" itu lewat
  tampilan (baris terkunci, tidak ada tombol untuk ditekan), jadi Sean tidak
  bisa mencentang tugas Gavril begitu juga sebaliknya, selama masing-masing
  memilih namanya sendiri di HP-nya.
- Mode Orang Tua dikunci PIN 6 digit (`PARENT_PIN`), diverifikasi di server
  dan disimpan sebagai cookie httpOnly bertanda tangan selama 12 jam. Endpoint
  yang mengubah tugas/tarif reward/persetujuan, dan endpoint yang membaca
  tarif reward, semuanya menolak permintaan tanpa sesi Orang Tua yang valid —
  jadi anak tidak bisa mengesahkan tugasnya sendiri atau mengakses data
  reward lewat DevTools sekalipun.
- Approval (`approved`) cuma bisa diset lewat endpoint yang memvalidasi tugas
  itu sudah `done` (dilaporkan anak) lebih dulu — Ibu tidak bisa mengesahkan
  tugas yang belum ditap anak sama sekali.
