# Kids Tracker

Aplikasi khusus **Orang Tua** untuk mencatat tugas harian Sean (11 tahun)
dan Gavril (6 tahun) dan menghitung reward-nya. Tidak ada layar/login
terpisah untuk anak — Ibu yang langsung mencentang tugas begitu tugasnya
selesai dikerjakan.

- Satu layar, dikunci **PIN 6 digit** — begitu buka link, langsung diminta
  PIN, tidak ada langkah lain sebelumnya.
- Kedua anak tampil di layar yang sama. Tap tugas = langsung dianggap
  selesai (⬜ → ✅). Tap lagi untuk membatalkan kalau salah pencet.
- Tugas untuk hari kerja dan akhir pekan bisa berbeda, muncul otomatis
  sesuai hari ini.
- **Dropdown tanggal** (14 hari terakhir) untuk melihat/mencatat hari
  sebelumnya — berguna kalau ada yang lupa dicentang pas harinya.
- **Reward harian (uang)**: dihitung otomatis dari jumlah tugas selesai ×
  tarif per tugas (mis. Sean Rp1.500/tugas, Gavril Rp1.000/tugas), beda
  tarif per anak, bisa diubah kapan saja.
- **Rekap mingguan (Senin–Minggu)**: total reward uang minggu itu,
  persentase tugas yang selesai, rincian per hari, dan navigasi ke
  minggu-minggu sebelumnya.
- **Reward mingguan non-uang otomatis**, berdasarkan persentase tugas
  selesai minggu itu — default: **≥85% boleh download 1 game**, **≥95%
  boleh makanan favorit**. Ambang & keterangannya bisa diubah/ditambah,
  beda-beda per anak.
- Urutan tugas di **Kelola daftar tugas** bisa diubah pakai tombol ▲/▼, jadi
  tugas baru tidak harus nyangkut di paling bawah.

Tidak ada notifikasi, tidak ada dark mode, tidak ada pengaturan lain di luar
itu — sengaja dibuat sesederhana mungkin supaya cepat dipakai rutin tiap hari.

## Cara pakai

1. Buka link Vercel, masukkan PIN (6 digit).
2. Kedua anak (Sean & Gavril) langsung tampil di satu layar dengan daftar
   tugas hari ini masing-masing.
3. Tap tugas begitu selesai dikerjakan — status berubah ⬜ → ✅, dan reward
   hari ini otomatis ikut terhitung. Tap lagi untuk membatalkan.
4. Lupa mencatat kemarin? Buka dropdown tanggal di atas, pilih harinya, tap
   tugas yang ketinggalan, lalu pilih **Hari ini** lagi untuk balik.
5. **Rekap mingguan**: di bawah daftar tugas tiap anak, ada ringkasan
   Senin–Minggu — total reward uang minggu itu, persentase tugas selesai,
   reward non-uang yang tercapai (kalau ada), dan rincian 7 hari. Tombol
   ‹ › untuk pindah ke minggu lain.
6. **Kelola daftar tugas**: tambah, edit teks, ubah weekday/weekend saja,
   hapus tugas, atau ubah urutannya pakai tombol ▲/▼ — per anak.
7. **Ubah tarif reward per tugas**: ganti nominal Rupiah per tugas selesai,
   beda-beda per anak.
8. **Kelola reward mingguan (non-uang)**: atur ambang persentase +
   keterangan reward-nya (default ≥85% download 1 game, ≥95% makanan
   favorit) — tambah, edit, atau hapus tier, per anak. Kalau minggu itu
   mencapai lebih dari satu ambang, yang dipakai cuma yang tertinggi
   (tidak menumpuk).
9. Tap **Keluar** untuk logout.

## Struktur teknis

- **Next.js (App Router, TypeScript)** — deploy ke Vercel lewat integrasi
  GitHub (push ke branch ini otomatis ter-deploy).
- **Daftar anak** (nama, umur, emoji, warna) statis di kode:
  `src/lib/children.ts`.
- **Daftar tugas & tarif reward tersimpan di database**, bisa diedit lewat
  aplikasi — tidak perlu edit kode untuk mengubahnya.
- **Status harian** (`completions`) juga di database, per anak per tugas
  per tanggal. Skema tabelnya masih punya kolom `done` dan `approved`
  peninggalan versi lama (waktu anak & orang tua punya tampilan terpisah),
  tapi sekarang satu tap Orang Tua langsung mengisi keduanya sekaligus —
  jadi tidak ada lagi tahap "menunggu disahkan". Data lama dari sebelum
  perubahan ini (kalau ada baris yang `done` tapi belum `approved`) tetap
  tersimpan apa adanya, cuma tampil sebagai belum selesai.
- **Semua endpoint API sekarang parent-only** (mengecek cookie sesi PIN) —
  termasuk yang dulunya publik untuk tampilan anak (`GET/POST /api/status`,
  `GET /api/tasks`), karena sekarang tidak ada lagi akses anak sama sekali.
- **Tarif reward** (`reward_rates`, satu baris per anak — jumlah Rupiah per
  tugas selesai) dan **reward mingguan non-uang** (`weekly_reward_tiers`,
  bisa banyak tier per anak) sama-sama parent-only.
- **Rekap mingguan** dihitung dari `GET /api/status/range` (parent-only),
  mengambil status 7 hari sekaligus lalu diagregasi di klien memakai daftar
  tugas & tarif reward **saat ini** (bukan snapshot historis — kalau tugas
  atau tarif diubah, rekap minggu lalu ikut memakai angka yang baru).
- **Urutan tugas** (`tasks.sort_order`) bisa diubah lewat `PATCH
  /api/tasks/:id` — tombol ▲/▼ di Kelola daftar tugas menukar `sort_order`
  dua tugas bertetangga.
- **Sinkron antar HP**: polling ke server tiap 4 detik + saat layar dibuka
  lagi, dan langsung memuat ulang begitu ganti tanggal dari dropdown
  (tidak menunggu jadwal polling berikutnya).

### Kenapa tanggal "hari ini" bisa salah?

Aplikasi ini tidak punya jam server sendiri untuk tanggal — HP yang dipakai
menentukan "hari ini" dari jam & zona waktu perangkatnya sendiri (data
tersimpan per tanggal sendiri-sendiri di database, jadi hari baru **selalu**
mulai kosong). Kalau jam/zona waktu HP salah setel, tugas yang dicentang
malam hari bisa "salah tanggal". Kalau ini terjadi: cek pengaturan jam &
zona waktu (harus WIB/Asia-Jakarta, idealnya "atur otomatis"), dan pakai
dropdown tanggal untuk mengecek tugas itu sebenarnya tersimpan di tanggal
berapa.

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
   `completions`, `reward_rates`, `weekly_reward_tiers`, lengkap dengan
   tugas, tarif reward, dan tier reward mingguan awal yang bisa kamu ubah
   lagi lewat aplikasi.
3. Kalau database ini **sudah pernah** kamu setup sebelumnya (sudah ada
   tabel `completions`), jalankan juga
   [`migrations/002_approval.sql`](migrations/002_approval.sql) (kolom
   `approved`) dan [`migrations/003_weekly_reward.sql`](migrations/003_weekly_reward.sql)
   (tabel `weekly_reward_tiers`) di SQL editor yang sama. Keduanya aman
   dijalankan berkali-kali, dan **tidak menghapus data tugas yang sudah
   tercatat** — hanya menambah struktur yang belum ada.

Alternatif lewat terminal (kalau punya `psql`):

```bash
vercel env pull .env.local   # ambil DATABASE_URL dari Vercel
psql "$DATABASE_URL" -f migrations/001_init.sql
psql "$DATABASE_URL" -f migrations/002_approval.sql
psql "$DATABASE_URL" -f migrations/003_weekly_reward.sql
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

Buka URL deployment — langsung diminta PIN.

## Development lokal (opsional)

```bash
vercel env pull .env.local   # menarik DATABASE_URL & PARENT_PIN dari Vercel
npm install
npm run dev
```

Buka http://localhost:3000.

## Catatan keamanan

- Aplikasi ini sepenuhnya dikunci PIN 6 digit (`PARENT_PIN`) sejak layar
  pertama — tidak ada bagian mana pun yang bisa diakses tanpa PIN.
- PIN diverifikasi di server dan disimpan sebagai cookie httpOnly bertanda
  tangan selama 12 jam. Semua endpoint API (baca maupun tulis) menolak
  permintaan tanpa sesi yang valid.
