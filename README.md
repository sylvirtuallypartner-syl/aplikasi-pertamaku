# Kids Tracker

Satu layar sederhana untuk daftar tugas harian Sean (11 tahun) dan Gavril
(6 tahun), plus tampilan Orang Tua (PIN) untuk memantau progres dan reward.

- Tiap anak cuma melihat & mencentang daftar tugasnya sendiri (tidak ada
  daftar anak lain di layarnya) — mencegah Sean dan Gavril saling
  mencentang tugas satu sama lain.
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
  dari tampilan anak** — anak hanya melihat status ⬜/✅/✅✅ biasa.
- Ada dropdown tanggal (14 hari terakhir) di layar anak maupun Orang Tua,
  jadi kalau ada yang lupa centang, bisa dibuka lagi hari sebelumnya dan
  dibetulkan — tidak harus hari ini terus.
- Tampilan Orang Tua juga punya **rekap mingguan (Senin–Minggu)**: total
  reward uang minggu itu, dan persentase tugas yang disetujui untuk jadi
  bahan menentukan reward non-uang. Bisa navigasi ke minggu-minggu
  sebelumnya juga.
- Urutan tugas di **Kelola daftar tugas** bisa diubah pakai tombol ▲/▼, jadi
  tugas baru tidak harus nyangkut di paling bawah.

Tidak ada notifikasi, tidak ada dark mode, tidak ada pengaturan lain di luar
itu — sengaja dibuat sesederhana mungkin supaya cepat dipakai rutin tiap hari.

## Cara pakai

### Sebagai anak

1. Buka link Vercel dari HP.
2. Pilih nama kamu (Sean atau Gavril) — sekali saja, tersimpan otomatis di HP
   itu. Kalau HP dipakai bergantian, tap **Ganti** di pojok atas untuk pilih
   nama lain.
3. Tap tugas yang sudah selesai — status berubah dari ⬜ jadi ✅. Hanya tugas
   milikmu yang muncul di layar.
4. Setelah Ibu mengesahkan lewat tampilan Orang Tua, status berubah jadi ✅✅
   — itu tandanya sudah benar-benar dihitung untuk reward.
5. Tugas yang muncul otomatis menyesuaikan hari ini — tugas khusus hari
   sekolah tidak muncul di weekend, dan sebaliknya.
6. Lupa centang kemarin? Buka dropdown tanggal di atas, pilih harinya, tap
   tugas yang ketinggalan, lalu tap **Kembali ke hari ini** untuk balik lagi.
7. Kalau dua HP dibuka bersamaan, centang di satu HP akan muncul di HP lain
   dalam beberapa detik tanpa perlu refresh manual.

### Sebagai orang tua

1. Di layar pilih nama, tap **Orang Tua**, masukkan PIN (6 digit).
2. Lihat progres hari ini per anak: berapa yang **dilaporkan** (ditap anak)
   dan berapa yang **disetujui Ibu**, plus reward hari ini (dihitung dari
   yang disetujui saja).
3. **Sahkan tugas**: tap baris tugas yang berstatus ✅ (sudah dilaporkan)
   untuk mengesahkannya jadi ✅✅ — tap lagi untuk membatalkan kalau salah
   pencet. Tugas yang masih ⬜ (belum dilaporkan anak) tidak bisa ditap dulu.
4. **Ganti tanggal**: pakai dropdown di atas untuk lihat/sahkan tugas hari
   sebelumnya (14 hari terakhir) — berguna kalau ada yang lupa disahkan atau
   dicentang.
5. **Rekap mingguan**: di bawah daftar tugas tiap anak, ada ringkasan
   Senin–Minggu — total reward uang minggu itu, persentase tugas yang
   disetujui (buat bahan reward non-uang), dan rincian 7 hari. Tombol ‹ ›
   untuk pindah ke minggu lain.
6. **Kelola daftar tugas**: tambah, edit teks, ubah weekday/weekend saja,
   hapus tugas, atau ubah urutannya pakai tombol ▲/▼ — per anak.
7. **Ubah tarif reward per tugas**: ganti nominal Rupiah per tugas yang
   disetujui, beda-beda per anak.
8. Tap **Keluar** untuk logout dari mode Orang Tua.

Reward mingguan dalam bentuk **uang** otomatis dihitung dari rekap di atas
(jumlah tugas disetujui minggu itu × tarif). Reward mingguan dalam bentuk
**non-uang** (misal jalan-jalan, waktu main tambahan) masih diputuskan manual
oleh orang tua berdasarkan persentase di rekap — app ini cuma menyediakan
angkanya, keputusan rewardnya sendiri belum diotomatisasi.

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
- **Rekap mingguan** dihitung dari `GET /api/status/range` (parent-only),
  mengambil status 7 hari sekaligus lalu diagregasi di klien memakai daftar
  tugas & tarif reward **saat ini** (bukan snapshot historis — kalau tugas
  atau tarif diubah, rekap minggu lalu ikut memakai angka yang baru).
- **Urutan tugas** (`tasks.sort_order`) bisa diubah lewat `PATCH
  /api/tasks/:id` — tombol ▲/▼ di Kelola daftar tugas menukar `sort_order`
  dua tugas bertetangga.

### Kenapa tanggal "hari ini" bisa salah?

Aplikasi ini tidak punya jam server sendiri untuk tanggal — setiap HP
menentukan "hari ini" dari jam & zona waktu perangkatnya masing-masing (data
per tugas per hari sendiri-sendiri di database, jadi hari baru **selalu**
mulai kosong — sudah diverifikasi langsung, tidak ada tugas yang
"ke-bawa" dari hari sebelumnya). Kalau suatu HP jam/zona waktunya salah
setel, tugas yang dicentang malam hari bisa "salah tanggal" (misal tercatat
untuk besok), sehingga besoknya kelihatan seperti "sudah tercentang
semua" padahal itu sebenarnya centangan tadi malam yang salah tanggal.
Kalau ini terjadi: cek pengaturan jam & zona waktu (harus WIB/Asia-Jakarta,
idealnya "atur otomatis") di HP yang dipakai, dan pakai dropdown tanggal
untuk mengecek tugas itu sebenarnya tersimpan di tanggal berapa.

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
  Layar anak cuma menampilkan tugas milik identitas yang sedang dipilih di
  HP itu, jadi Sean tidak akan melihat/mencentang tugas Gavril begitu juga
  sebaliknya, selama masing-masing memilih namanya sendiri.
- Mode Orang Tua dikunci PIN 6 digit (`PARENT_PIN`), diverifikasi di server
  dan disimpan sebagai cookie httpOnly bertanda tangan selama 12 jam. Endpoint
  yang mengubah tugas/tarif reward/persetujuan, dan endpoint yang membaca
  tarif reward, semuanya menolak permintaan tanpa sesi Orang Tua yang valid —
  jadi anak tidak bisa mengesahkan tugasnya sendiri atau mengakses data
  reward lewat DevTools sekalipun.
- Approval (`approved`) cuma bisa diset lewat endpoint yang memvalidasi tugas
  itu sudah `done` (dilaporkan anak) lebih dulu — Ibu tidak bisa mengesahkan
  tugas yang belum ditap anak sama sekali.
