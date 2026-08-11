# Panduan Setup Lokal Setelah Clone

Panduan ini ditujukan untuk pengembang atau tester yang baru pertama kali menjalankan Talenta Prestasi dari hasil clone GitHub.

## Hasil Akhir

Setelah semua langkah selesai, layanan lokal tersedia pada:

- Admin: `http://localhost:4173/apps/admin/`
- Public Site: `http://localhost:4173/apps/public-site/`
- Backend API: `http://localhost:3000/api/v1/`

## 1. Prasyarat

Siapkan perangkat berikut:

- Git;
- Node.js 20 LTS atau versi lebih baru yang kompatibel;
- npm;
- PostgreSQL;
- terminal Git Bash, PowerShell, atau terminal bawaan IDE.

Verifikasi instalasi:

```bash
git --version
node --version
npm --version
psql --version
```

## 2. Clone Repository

```bash
git clone <URL_REPOSITORY_GITHUB>
cd Web1
```

Ganti `<URL_REPOSITORY_GITHUB>` dengan URL repository yang diberikan pemilik proyek. Nama direktori hasil clone dapat berbeda; pastikan perintah berikutnya dijalankan dari root repository yang memiliki `package.json` dan folder `apps/`.

## 3. Instal Dependensi

Instal dependensi frontend dari root repository:

```bash
npm install
```

Kemudian instal dependensi backend:

```bash
cd apps/backend
npm install
cd ../..
```

Jangan menjalankan `npm audit fix --force` atau mengubah versi package hanya untuk memulai aplikasi.

## 4. Siapkan Database PostgreSQL

### Rekomendasi untuk testing pertama

Gunakan database lokal baru agar tidak bercampur dengan data percobaan versi lama. Contoh nama:

```text
talenta_prestasi_blackbox
```

Database ini tetap merupakan database development lokal. Jangan arahkan konfigurasi ke database production atau database yang berisi data penting.

### Membuat database melalui psql

Masuk sebagai pengguna PostgreSQL yang memiliki izin membuat database:

```bash
psql -U postgres
```

Di dalam prompt `psql`, jalankan:

```sql
CREATE DATABASE talenta_prestasi_blackbox;
```

Keluar:

```sql
\q
```

Jika database lama hanya berisi data dummy, database baru lebih aman daripada menghapus database lama. Jika data lama perlu dipertahankan, gunakan database lama dan hanya jalankan migration pada langkah berikutnya.

## 5. Buat Environment Backend

Buat file lokal:

```text
apps/backend/.env
```

Isi dengan konfigurasi lokal berikut dan ganti seluruh placeholder:

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=<PASSWORD_POSTGRES_LOKAL>
DB_DATABASE=talenta_prestasi_blackbox

JWT_SECRET=<STRING_ACAK_MINIMAL_32_KARAKTER>
JWT_EXPIRES_IN=7d
PORT=3000
CORS_ORIGINS=http://localhost:4173,http://127.0.0.1:4173
PUBLIC_BASE_DOMAIN=nexaplaymetadata.online

LOCAL_ADMIN_EMAIL=<EMAIL_ADMIN_LOKAL>
LOCAL_ADMIN_PASSWORD=<PASSWORD_ADMIN_LOKAL_MINIMAL_12_KARAKTER>
```

Aturan keamanan:

- jangan memakai credential production;
- jangan mengirim isi `.env` melalui chat atau commit Git;
- gunakan `JWT_SECRET` acak minimal 32 karakter;
- gunakan password Admin lokal minimal 12 karakter;
- `apps/backend/.env` sudah diabaikan oleh `.gitignore`.

## 6. Jalankan Migration

Migration membuat seluruh schema PostgreSQL sampai versi terbaru, termasuk Category → Event dan snapshot publikasi Event.

```bash
cd apps/backend
./node_modules/.bin/typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts
```

Pada Windows PowerShell, jika binary Unix tidak dapat dipanggil, gunakan:

```powershell
npx typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts
```

Verifikasi semua migration sudah aktif:

```bash
./node_modules/.bin/typeorm-ts-node-commonjs migration:show -d src/database/data-source.ts
```

Hasil yang benar menampilkan seluruh migration bertanda `[X]`, termasuk:

```text
[X] AddEventDraftPublications1786586400000
```

Jika migration gagal, jangan menjalankan reset atau menghapus database secara acak. Periksa kembali koneksi PostgreSQL dan nilai `DB_*` di `.env`.

## 7. Isi Data Demonstrasi Lokal

Untuk database baru yang kosong, jalankan seed satu kali:

```bash
npm run seed:local
```

Seed menggunakan `LOCAL_ADMIN_EMAIL` dan `LOCAL_ADMIN_PASSWORD` dari `.env`, lalu membuat atau memperbarui data demonstrasi lokal secara idempotent.

Jangan menjalankan seed pada database berisi data penting tanpa memahami dampaknya.

Kembali ke root repository:

```bash
cd ../..
```

## 8. Jalankan Aplikasi

Gunakan dua terminal.

### Terminal 1 — Backend

Dari root repository:

```bash
cd apps/backend
npm run start:dev
```

Tunggu sampai muncul pesan bahwa aplikasi Nest berhasil dimulai pada port `3000`.

### Terminal 2 — Frontend

Dari root repository:

```bash
npm run dev
```

Frontend statis berjalan pada port `4173`.

## 9. Login Admin

Buka:

```text
http://localhost:4173/apps/admin/
```

Login menggunakan nilai berikut dari `.env` lokal:

- email: `LOCAL_ADMIN_EMAIL`;
- password: `LOCAL_ADMIN_PASSWORD`.

Jangan membagikan credential lokal tersebut melalui screenshot atau laporan testing.

## 10. Pemeriksaan Awal

Buka Public Site:

```text
http://localhost:4173/apps/public-site/
```

Jika kategori masih unpublished atau Event belum memiliki snapshot publik, Public Site dapat menampilkan `404`. Itu bukan kerusakan. Dari Admin:

1. pilih Kategori dan Event;
2. buka **Lihat preview** untuk memeriksa draf;
3. tekan **Publikasikan perubahan** untuk membuat snapshot Event;
4. publikasikan Kategori jika website memang akan dibuka bagi pengunjung lokal.

Empat tindakan berikut berbeda:

- **Simpan draf**: menyimpan workspace tanpa mengubah website publik;
- **Lihat preview**: membuka workspace melalui Public Site dengan akses sementara;
- **Publikasikan perubahan**: membuat snapshot publik Event;
- **Publikasikan kategori**: membuka kategori kepada pengunjung jika Event aktif sudah memiliki snapshot.

## 11. Validasi Source

Dari root repository:

```bash
npm run test:event-publication
npm run check:routes
npm run check:js
npm run check:theme
```

Build dan unit test backend:

```bash
cd apps/backend
npm run build
npm test -- --runInBand
```

Suite E2E membuat dan mengubah data uji. Jalankan hanya pada database khusus testing/disposable, bukan pada database berisi data penting.

## 12. Smoke Test Black-Box

Gunakan checklist minimum berikut:

1. Admin dapat login.
2. Kategori dan Event dapat dipilih.
3. Perubahan dapat disimpan sebagai draf.
4. **Lihat preview** menampilkan draf terbaru dan banner preview.
5. Pengunjung biasa tetap melihat snapshot lama atau `404` saat kategori unpublished.
6. **Publikasikan perubahan** membuat status kembali bersih.
7. Perubahan berikutnya kembali ditandai sebagai draf.
8. **Batalkan draf** mengembalikan workspace ke snapshot terakhir.
9. Event baru dapat dipreview dan dipublikasikan sebelum diaktifkan.
10. Event lama menjadi arsip ketika Event lain diaktifkan.

Checklist lengkap tersedia di [TESTING.md](TESTING.md).

## 13. Menghentikan Aplikasi

Tekan `Ctrl+C` pada terminal frontend dan backend.

Menghentikan server tidak menghapus database PostgreSQL atau data media lokal.

## Troubleshooting

### Backend tidak dapat terhubung ke PostgreSQL

- pastikan service PostgreSQL aktif;
- periksa `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, dan `DB_DATABASE`;
- pastikan database sudah dibuat;
- uji koneksi dengan `psql`.

### Backend menolak `JWT_SECRET`

Gunakan string acak dengan panjang minimal 32 karakter.

### Admin terkena CORS

Pastikan `.env` memiliki:

```dotenv
CORS_ORIGINS=http://localhost:4173,http://127.0.0.1:4173
```

Restart backend setelah mengubah `.env`.

### Public Site menampilkan `404`

Periksa bahwa:

- kategori sudah dipublikasikan;
- terdapat Event aktif dan berstatus operasional;
- Event tersebut sudah pernah menjalankan **Publikasikan perubahan**.

Admin tetap dapat memeriksa Event unpublished melalui **Lihat preview**.

### Port sudah dipakai

Port default:

- backend: `3000`;
- frontend: `4173`;
- gateway opsional: `8080`.

Hentikan proses lama yang benar atau ubah konfigurasi lokal. Jangan force-kill proses yang tidak dikenal.

### Migration database lama gagal

Jika database hanya berisi data dummy versi lama, buat database development baru lalu jalankan seluruh migration dan seed. Jika terdapat data penting, jangan menghapus database; buat backup dan koordinasikan migration terlebih dahulu.

## Catatan Keamanan

File berikut tidak boleh dimasukkan ke GitHub:

- `apps/backend/.env`;
- database/dump lokal;
- isi `apps/backend/storage/uploads/`;
- private key atau credential Cloudflare;
- token login atau token preview;
- screenshot yang menampilkan password.

Sebelum commit, periksa:

```bash
git status
git diff --check
git diff --staged --check
```
