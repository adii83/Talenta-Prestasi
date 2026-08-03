# Progress Implementasi Backend — Talenta Prestasi

> File ini mencatat seluruh progress implementasi backend NestJS + TypeScript +
> PostgreSQL. AI selanjutnya **wajib membaca file ini** sebelum melanjutkan
> pekerjaan.

## Konteks Project

- **Repository**: `d:\Kuliah\Magang\Web1`
- **Frontend**: Vanilla HTML/CSS/JS (sudah selesai, di `apps/template/` dan `apps/admin/`)
- **Backend target**: `apps/backend/` (NestJS + TypeScript + PostgreSQL)
- **Rancangan database**: `docs/DATABASE_DESIGN.md` (742 baris, lengkap dengan ERD, constraint, dan API contract)
- **Arsitektur frontend**: `docs/ARCHITECTURE.md`
- **Spesifikasi admin**: `docs/ADMIN_SPEC.md`

## Hasil Analisis (1 Agustus 2026)

### Database Design vs Frontend Code: ✅ SESUAI 100%

Rancangan `DATABASE_DESIGN.md` sudah mencocokkan **seluruh** kebutuhan frontend
tanpa ada gap. Tidak diperlukan penambahan tabel, kolom, atau relasi. Detail:

| Frontend State Key                      | Target Database Tables                                    | Status |
| --------------------------------------- | --------------------------------------------------------- | ------ |
| `talenta_event_settings_v1`             | `event_sites` + `site_settings` + `site_domains`          | ✅     |
| `talenta_home_editor_v1`                | `home_sections` + 7 item tables                           | ✅     |
| `talenta_download_editor_v2`            | `download_competitions` + `download_document_settings`    | ✅     |
| `talenta_winner_manager_v1`             | `winner_categories` + `winners` + SK via dokumen          | ✅     |
| `talenta_winner_page_v1`                | `winner_page_settings`                                    | ✅     |
| `talenta_archive_manager_v2`            | `competitions` + documents + categories + detail settings | ✅     |
| `talenta_faq_manager_v1`                | `faq_categories` + `faq_questions`                        | ✅     |
| Mock database (`MOCK_ARCHIVE_DATABASE`) | `competitions` + nested relations                         | ✅     |

### Relasi Kunci yang Diverifikasi

1. **Arsip = owner tunggal** data historis lomba → Unduh dan Pemenang hanya consumer
2. **Unduh tidak menduplikasi dokumen** → hanya menyimpan reference (`competitionId` + visibility settings)
3. **Winner terikat lomba aktif** → `competitionId` divalidasi terhadap lomba `current`
4. **SK = referensi ke dokumen milik lomba yang sama** → composite FK
5. **FAQ mandiri** tanpa FK ke lomba
6. **Soft delete** via `deleted_at` = `removedCompetitionIds` tombstone di frontend
7. **Hanya 1 lomba `current` per portal** → unique partial index

## Rencana Implementasi

### Fase 1 — Fondasi (SELESAI)

- [x] Scaffold NestJS project di `apps/backend/`
- [x] Konfigurasi TypeORM + PostgreSQL connection
- [x] Entity: `organizations`, `users`, `organization_memberships`
- [x] Entity: `event_sites`, `site_domains`, `site_settings`
- [x] Entity: `media_assets`, `audit_logs`
- [x] TypeScript build verified (`npx tsc --noEmit` pass)
- [x] Initial migration dibuat dan dijalankan pada PostgreSQL 18.3
- [x] Auth module (JWT) — service, strategy, guard, controller

### Fase 2 — Data Inti Lomba (SELESAI)

- [x] Entity: `competitions` (lifecycle + publication_status)
- [x] Entity: `competition_documents`
- [x] Entity: `winner_categories`, `winners`
- [x] Entity: `competition_detail_settings` (1:1)
- [x] Entity: `archive_category_settings`, `archive_document_settings`
- [x] Composite relation mapping dan FK terverifikasi di PostgreSQL
- [x] Unique partial index: 1 current competition per site
- [x] TypeScript dan ESLint verified
- [x] Schema terverifikasi: 16 tabel, 22 foreign key, 1 migration applied

### Fase 3 — Halaman & Konfigurasi (SELESAI)

- [x] Entity: `page_settings`
- [x] Entity: `winner_page_settings` (1:1 portal)
- [x] Migration `AddPageSettings` dijalankan dan diverifikasi
- [x] Constraint `(event_site_id, page_type)` menolak halaman duplikat
- [x] Partial index lomba aktif dipertahankan pada metadata dan database
- [x] Entity: `home_sections` + item tables (`hero_badges`, `hero_actions`, `schedule_items`, `pricing_packages`, `pricing_facilities`, `benefit_items`, `partner_items`)
- [x] Migration `AddHomeSections` dijalankan; 8 tabel terverifikasi
- [x] Unique section type per portal dan cascade delete child teruji
- [x] Entity: `download_competitions`, `download_document_settings`
- [x] Migration `AddDownloads` dijalankan dan diverifikasi
- [x] Cross-portal competition, cross-competition document, dan default tab ganda ditolak PostgreSQL
- [x] Entity: `faq_categories`, `faq_questions`
- [x] Migration `AddFaq` dijalankan; orphan question ditolak dan cascade delete teruji
- [x] Final audit: 5 migration applied, schema drift nihil, TypeScript/ESLint/Jest lulus

### Fase 4 — API Endpoints (SEDANG BERJALAN)

- [x] Audit `organization.entity.ts` dan `competition.entity.ts`: compiler, ESLint, migration metadata bersih; merah IDE adalah diagnostic stale
- [x] Perbaikan `LoginDto`: email/password tervalidasi dan kompatibel dengan whitelist pipe
- [x] JWT memverifikasi user aktif ke database dan tidak memakai fallback secret lemah
- [x] `OrganizationGuard` memverifikasi membership tenant untuk Admin API
- [x] Request field asing ditolak, CORS dibatasi via environment, header Express disembunyikan
- [x] Security E2E: versioned route, malformed login, dan unknown field lulus (3/3)
- [x] Public endpoints
  - [x] Resolver portal aman berdasarkan hostname verified
  - [x] Bootstrap, Home, Downloads, Winners, Archives, Archive detail, FAQ
  - [x] Publication/active/tenant filtering diterapkan pada seluruh query publik
  - [x] Parameter hostname dan slug tervalidasi
- [x] Admin CRUD endpoints
  - [x] Site detail dan daftar competition tenant-scoped
  - [x] Create, update, soft-delete, dan publish competition
  - [x] Documents CRUD dengan validasi ownership media organisasi
  - [x] Winner categories dan winners CRUD dengan composite ownership constraint
  - [x] Page settings GET/PUT dengan unique upsert per portal/page
  - [x] Role viewer ditolak menulis; organisasi lain ditolak membaca
- [ ] Media upload presigned URL fisik (menunggu provider object storage S3/MinIO/R2)
  - [x] Metadata `media_assets` dan attachment dokumen dummy teruji
- [x] Publish workflow + audit log untuk competition dan content CRUD
- [x] Optimistic locking competition (`version` + `If-Match`)
- [x] Full-flow E2E: event → media dummy → document → category → winner → page → publish → public → update/delete
- [x] Final gate: TypeScript, ESLint, unit 1/1, E2E 10/10, detectOpenHandles, npm audit 0, 6/6 migration
- [x] Cleanup terverifikasi: 0 fixture test tersisa; schema drift nihil

## Keputusan Teknis

| Keputusan      | Nilai               | Alasan                                                     |
| -------------- | ------------------- | ---------------------------------------------------------- |
| Framework      | NestJS + TypeScript | Satu ekosistem JS, modular, type-safe                      |
| Database       | PostgreSQL          | Sesuai DATABASE_DESIGN.md                                  |
| ORM            | TypeORM             | Dipakai oleh implementasi backend dan migration SQL manual |
| Lokasi backend | `apps/backend/`     | Sejajar dengan template dan admin                          |
| Auth           | JWT                 | Standard untuk REST API                                    |

## Untuk AI Selanjutnya

1. **Baca file ini dulu** untuk tahu status terkini
2. **Baca `docs/DATABASE_DESIGN.md`** untuk ERD dan constraint lengkap
3. **Jangan mengubah frontend** (`apps/template/`, `apps/admin/`, `packages/shared/`)
4. **Ikuti urutan fase** — jangan loncat
5. **Update file ini** setelah menyelesaikan setiap task
6. **Tabel database harus persis** sesuai DATABASE_DESIGN.md — tidak menambah, tidak mengurangi

## Integrasi Frontend�Backend (3 Agustus 2026)

Status: **selesai untuk seluruh state/data aplikasi yang tersedia di UI**.

- Admin: autentikasi/session, Competition, Detail Arsip, Pemenang, Unduh, FAQ, Beranda, dan Pengaturan Global sudah memakai API PostgreSQL.
- Template publik: bootstrap global, Beranda, Unduh, FAQ, Pemenang, Arsip, dan Detail Arsip sudah memakai public API berdasarkan `siteSlug`.
- `localStorage` pada renderer/editor dipertahankan hanya sebagai baseline/fallback/preview compatibility, bukan sumber persistensi utama setelah API berhasil dimuat.
- Public API memakai slug competition untuk tautan Detail Arsip; konfigurasi heading, active state, metadata visibility, kategori, dokumen, tab, dan footer/theme ikut berasal dari database.
- Media yang sudah berbentuk Data URL pada editor Home tetap tersimpan lossless di JSONB. Penyimpanan file fisik/object storage production belum dipilih dan tidak dibuat tanpa kebutuhan/infrastruktur deployment.

### Gate final

- Backend TypeScript: lulus.
- Backend lint: lulus.
- Backend unit: 1/1 lulus.
- Backend E2E: 10/10 lulus.
- Backend production dependency audit: 0 vulnerability.
- Frontend route/asset/ID, syntax 42 JS, theme sync, dan Prettier: lulus.
- Home parity desktop/tablet/mobile: lulus.
- Audit relasi Archive, Downloads, Winners, FAQ, dan dialog Admin: lulus.
- HTTP smoke seluruh endpoint public: lulus.
- Browser black-box interaktif ditunda atas arahan pengguna.
