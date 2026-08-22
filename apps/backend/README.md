# Backend Talenta Prestasi

## Tanggung Jawab

`apps/backend` adalah REST API NestJS untuk:

- autentikasi JWT, tenant, dan RBAC;
- pengelolaan Organization, Kategori Lomba, Event/Periode, konten, serta publikasi;
- API Admin dan DTO Public Site;
- persistensi TypeORM/PostgreSQL;
- penyimpanan file media lokal dan delivery melalui endpoint media publik.

Prefix API adalah `/api/v1`.

## Prasyarat

Siapkan Node.js, npm, PostgreSQL aktif, dan database yang dapat dipakai aplikasi. Jalankan command pada dokumen ini dari direktori `apps/backend`.

## Environment Variable

Variabel wajib:

- `DB_HOST`: host PostgreSQL;
- `DB_PORT`: port PostgreSQL;
- `DB_USERNAME`: pengguna PostgreSQL;
- `DB_PASSWORD`: kata sandi PostgreSQL;
- `DB_DATABASE`: nama database;
- `JWT_SECRET`: kunci penandatanganan JWT, minimal 32 karakter.

Variabel opsional:

- `PORT`: port HTTP backend;
- `CORS_ORIGINS`: daftar origin browser yang diizinkan, dipisahkan koma;
- `PUBLIC_BASE_DOMAIN`: domain dasar hostname Kategori Lomba publik.

Variabel seed lokal:

- `LOCAL_ADMIN_USERNAME`: username akun Admin lokal;
- `LOCAL_ADMIN_PASSWORD`: kata sandi akun Admin lokal, minimal 12 karakter.

Simpan nilai lokal di environment atau `apps/backend/.env`; jangan masukkan credential ke Git.

## Instalasi

```bash
npm install
```

## Migration dan Seed Lokal

Terapkan migration pada database yang dikonfigurasi. Migration `ResetCategoryEventSchema` bersifat destruktif untuk database schema lama dan ditujukan bagi reset development; backup atau gunakan database disposable sebelum menjalankannya pada data yang perlu dipertahankan:

```bash
npx typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts
```

Setelah mengisi variabel seed, buat atau perbarui data demonstrasi lokal bila diperlukan:

```bash
npm run seed:local
```

Seed bukan bagian startup harian.

## Menjalankan Backend

```bash
npm run start:dev
```

Port default backend adalah `3000` dan dapat diubah melalui `PORT`.

## Build dan Test

```bash
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

E2E memerlukan seluruh environment backend wajib, PostgreSQL test yang dapat ditulis, dan schema migration terbaru. Jangan arahkan E2E ke database berisi data penting karena test membuat serta menghapus record uji.

## Dokumentasi Terkait

- [Arsitektur](../../docs/ARCHITECTURE.md)
- [Model Data](../../docs/DATA_MODEL.md)
- [Operasional](../../docs/OPERATIONS.md)
- [Pengujian](../../docs/TESTING.md)
