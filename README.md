# Misi Harian Kemandirian

Dashboard misi harian untuk membantu anak membangun kebiasaan baik & mandiri —
Sean (11 tahun) dan Gavril (6 tahun) — dengan progres yang **tersimpan di
database (bukan localStorage)**, jadi bisa diakses dari HP orang tua maupun
anak lewat satu link Vercel yang sama, dan datanya tidak hilang atau terkunci
di satu device.

Tema visual (dark navy, gold/cinnabar, bintang berkelip, ring progress, bar
mingguan) dipertahankan persis dari versi HTML/localStorage sebelumnya.

## Yang baru dibanding versi lama

1. **Data di Postgres (Vercel Postgres / Neon)**, bukan localStorage — buka
   dari device manapun, data yang sama muncul di semua tempat (polling setiap
   ~15 detik + refresh saat tab difokuskan, jadi "hampir real-time").
2. **Mode akses**: **Anak** (default, langsung centang tugas tanpa login) vs
   **Ortu** (dikunci PIN sederhana, untuk lihat rekap bulanan & export CSV).
   PIN diverifikasi di server (route handler), tidak pernah dikirim ke
   frontend dalam bentuk plain.
3. **Rekap bulanan** (selain harian & mingguan yang sudah ada), plus **export
   CSV** per bulan di mode Ortu untuk arsip pribadi.

## Struktur teknis

- **Next.js (App Router, TypeScript)** — di-deploy ke Vercel lewat integrasi
  GitHub yang sudah aktif (push ke branch ini otomatis ter-deploy).
- **Database**: Vercel Postgres (Neon), diakses lewat `@neondatabase/serverless`
  dari Route Handlers di `src/app/api/*` (bukan langsung dari browser, supaya
  connection string tidak pernah terekspos ke client).
- **Task list & logic reward/bonus**: `src/lib/tasks.ts` — daftar tugas Sean &
  Gavril, tier reward harian, bonus mingguan, persis sama dengan versi lama.
- **Agregasi rekap** (harian/mingguan/bulanan, streak): `src/lib/recap.ts`.

## Setup — sekali saja

### 1. Sambungkan Vercel Postgres (Neon)

Di dashboard Vercel, buka project ini → tab **Storage** → **Create Database**
→ pilih **Postgres (Neon)** → sambungkan ke project. Vercel otomatis mengisi
environment variable `DATABASE_URL` untuk Production, Preview, dan
Development.

### 2. Jalankan migrasi schema

Buka **Neon SQL editor** (lewat tab Storage project → klik database → "Open
in Neon" / "Query") dan jalankan isi file [`migrations/001_init.sql`](migrations/001_init.sql).
File ini membuat tabel `children`, `tasks`, `entries`, lengkap dengan seed
data 22 tugas Sean dan 17 tugas Gavril.

Alternatif lewat terminal (butuh `psql`, connection string dari Vercel
Storage tab):

```bash
psql "$DATABASE_URL" -f migrations/001_init.sql
```

### 3. Set PIN mode Ortu

Di Vercel → Project Settings → Environment Variables, tambahkan:

```
PARENT_PIN=1234
```

(bebas berapa digit/angka, ganti sesuai keinginan). Redeploy sekali setelah
menambahkan variable ini kalau deployment sebelumnya sudah berjalan duluan.

### 4. Development lokal (opsional)

```bash
vercel env pull .env.local   # menarik DATABASE_URL & PARENT_PIN dari Vercel
npm install
npm run dev
```

Buka http://localhost:3000.

## Alur pakai sehari-hari

- **Anak**: buka link Vercel, pilih tab nama anak, centang tugas yang sudah
  selesai. Poin, ring capaian, reward harian, dan bar mingguan langsung
  ter-update.
- **Ortu**: klik "🔒 Mode Ortu", masukkan PIN, lihat rekap bulanan & histori,
  atau export CSV untuk arsip.
- Buka link yang sama dari HP lain (anak atau orang tua) — progres yang sudah
  dicentang akan muncul juga di sana (tunggu beberapa detik / refresh halaman).

## Catatan keamanan

PIN Ortu adalah pengaman sederhana di level UI (sesuai kebutuhan aplikasi
keluarga, bukan sistem multi-tenant), diverifikasi di server via
`PARENT_PIN` dan disimpan sebagai cookie httpOnly bertanda tangan HMAC
selama 12 jam. Endpoint export CSV memvalidasi cookie ini di server sebelum
mengirim data.
