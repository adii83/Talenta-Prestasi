# Talenta Prestasi

## Status Proyek

Talenta Prestasi adalah platform website kategori lomba multi-periode. Public Site, CMS Admin, backend NestJS, dan PostgreSQL telah memakai hierarki Organization → Kategori Lomba → Event/Periode. Satu kategori memiliki satu slug/subdomain tetap, satu Event aktif, dan Event nonaktif sebagai arsip otomatis. Setiap Event memiliki satu workspace draf terpadu; pengunjung membaca snapshot publik terakhir, sedangkan Admin dapat memeriksa draf melalui preview aman sebelum memublikasikan seluruh perubahan Event secara atomik.

## Tujuan Produk

Proyek ini menyediakan platform kategori lomba multi-periode. Identitas publik dan subdomain dimiliki kategori, sedangkan tema serta konten setiap periode dikelola sebagai Event melalui CMS Admin.

## Aplikasi

- **Public Site**: Website informasi publik kompetisi bagi pengunjung (`apps/public-site/`).
- **CMS Admin**: Panel pengelolaan event, konten publik, dan media (`apps/admin/`).
- **Backend**: API NestJS, autentikasi, otorisasi RBAC/tenant, dan manajemen media (`apps/backend/`).
- **Shared Contract**: Kontrak route, helper storage, dan utilitas bersama (`packages/shared/`).

Pendaftaran dan dashboard peserta dikelola melalui website eksternal terpisah.

## Struktur Repository

```text
.
├── apps/
│   ├── admin/          # CMS Admin pengelola data dan media event
│   ├── backend/        # NestJS API, TypeORM, PostgreSQL, autentikasi & media
│   └── public-site/    # Public Site tampilan informasi publik
├── docs/               # Dokumentasi arsitektur, spesifikasi, dan panduan
├── packages/
│   └── shared/         # Kontrak route, helper storage, dan utilitas bersama
├── PROGRESS.md         # Status implementasi dan receipt validasi terakhir
└── README.md           # Orientasi utama repository
```

## Menjalankan Secara Singkat

Untuk instalasi pertama setelah clone—termasuk PostgreSQL, `.env`, migration, seed, dan login Admin—ikuti [Setup Lokal](docs/SETUP_LOKAL.md). Untuk command development harian dan validasi environment, gunakan [Development Setup](docs/DEVELOPMENT_SETUP.md).

Setelah setup pertama selesai:

1. Jalankan backend:

```bash
cd apps/backend
npm run start:dev
```

2. Dari terminal lain pada root proyek, jalankan frontend statis:

```bash
npm run dev
```

3. Jika perlu menguji routing berbasis hostname seperti production, jalankan gateway lokal:

```bash
npm run gateway
```

## URL Development dan Gateway

- Workspace Public Site: `http://localhost:4173/apps/public-site/`
- Workspace Admin: `http://localhost:4173/apps/admin/`
- Gateway production-like: `http://127.0.0.1:8080/`

Deployment VPS tidak memakai server development tersebut. Ikuti [Production Setup](docs/PRODUCTION_SETUP.md) untuk PostgreSQL, migration, PM2, Nginx, HTTPS, wildcard DNS, media, backup, dan update release.

## Urutan Baca Dokumentasi

1. [docs/DEVELOPMENT_SETUP.md](docs/DEVELOPMENT_SETUP.md) — Ringkasan setup dan command development harian.
2. [docs/SETUP_LOKAL.md](docs/SETUP_LOKAL.md) — Setup lokal pertama setelah clone hingga aplikasi dapat digunakan.
3. [docs/PRODUCTION_SETUP.md](docs/PRODUCTION_SETUP.md) — Deployment production pada VPS dengan PostgreSQL, Nginx, PM2, DNS, HTTPS, dan rollback release.
4. [PROGRESS.md](PROGRESS.md) — Status produk dan area yang telah selesai.
5. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Arsitektur sistem dan batas antar komponen.
6. [docs/DATA_MODEL.md](docs/DATA_MODEL.md) — Skema basis data NestJS dan TypeORM.
7. [docs/ADMIN_SPEC.md](docs/ADMIN_SPEC.md) — Spesifikasi pengoperasian CMS Admin.
8. [docs/OPERATIONS.md](docs/OPERATIONS.md) — Operasional development, gateway, dan Cloudflare Tunnel untuk testing.
9. [docs/TESTING.md](docs/TESTING.md) — Prosedur pengujian otomatis dan manual.
10. [docs/WORK_LOG.md](docs/WORK_LOG.md) — Riwayat pekerjaan lintas sesi.
11. [apps/backend/README.md](apps/backend/README.md) — Ringkasan API backend, autentikasi, RBAC, dan command NestJS.

## Validasi

Jalankan pemeriksaan statis route, JavaScript, sinkronisasi tema, dan format frontend dari root proyek:

```bash
npm run check
```

Jalankan build, unit test, dan E2E backend secara terpisah:

```bash
cd apps/backend
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

## Batas Scope Produk

- Scope aktif meliputi Public Site (`apps/public-site/`), CMS Admin (`apps/admin/`), REST API (`apps/backend/`), kategori lomba, Event/periode, dan kontennya.
- Pendaftaran dan dashboard peserta berada pada website eksternal di luar repository ini.
- Restrukturisasi Category→Event telah diterapkan; pekerjaan berikutnya adalah maintenance dan acceptance client.
