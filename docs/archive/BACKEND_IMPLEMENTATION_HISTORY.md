# Riwayat Implementasi Backend Talenta Prestasi

> **DOKUMEN HISTORIS — bukan sumber status atau arsitektur saat ini. Verifikasi `README.md`, `PROGRESS.md`, dokumentasi aktif, dan source code sebelum menggunakan informasi di dalam dokumen ini.**

## Ruang Lingkup

Dokumen ini mempertahankan rancangan awal, fase implementasi NestJS/PostgreSQL, integrasi API, media lokal, publikasi Event, dan hasil validasi backend pada tanggal terkait.

## Konteks Historis

Catatan awal menempatkan repository di `d:\Kuliah\Magang\Web1`, frontend Vanilla HTML/CSS/JS di `apps/template/` dan `apps/admin/`, serta target backend NestJS, TypeScript, dan PostgreSQL di `apps/backend/`. Rancangan data ketika itu dirujuk melalui `docs/DATABASE_DESIGN.md` yang dicatat sepanjang 742 baris dan memuat ERD, constraint, serta kontrak API. Referensi lain yang dipakai adalah `docs/ARCHITECTURE.md` dan `docs/ADMIN_SPEC.md`.

Keputusan teknis pada periode implementasi menetapkan NestJS dan TypeScript sebagai framework, PostgreSQL sebagai database, TypeORM untuk entity dan migration SQL manual, `apps/backend/` sebagai lokasi backend, serta JWT untuk autentikasi REST API. Catatan kerja pada masa itu juga menekankan kesesuaian tabel dengan rancangan database dan pelaksanaan fase secara berurutan; ketentuan tersebut merupakan konteks proses historis, bukan instruksi aktif.

## Kronologi

### 30 Juli 2026 — Rancangan Database Produksi

- Model tiga lapis Organisasi → Portal Event → Edisi Lomba dirancang agar data multi-tenant, subdomain, dan riwayat lomba tidak bercampur.
- State Pengaturan Global, Beranda, Unduh, Pemenang, Arsip, Detail Arsip, serta FAQ dipetakan ke tabel produksi tanpa menduplikasi dokumen atau pemenang.
- ERD inti, lomba, konten Beranda, FAQ, dan alur data lintas halaman didokumentasikan.
- Rancangan mencakup foreign key lintas owner, constraint satu lomba aktif, soft delete, draft/publish, media object storage, audit log, optimistic locking, keamanan data pemenang, serta API publik dan Admin.
- Roadmap migrasi bertahap, kriteria penerimaan, dan keputusan yang perlu disahkan klien dicatat dalam `docs/DATABASE_DESIGN.md`.

### 1 Agustus 2026 — Analisis Kesesuaian Database dan Frontend

Analisis pada tanggal tersebut mencatat bahwa rancangan `docs/DATABASE_DESIGN.md` memenuhi kebutuhan frontend yang telah teridentifikasi tanpa penambahan tabel, kolom, atau relasi. Pemetaan yang dicatat saat itu adalah:

| Frontend state pada saat itu | Target tabel                                             |
| ---------------------------- | -------------------------------------------------------- |
| `talenta_event_settings_v1`  | `event_sites`, `site_settings`, dan `site_domains`       |
| `talenta_home_editor_v1`     | `home_sections` dan tujuh tabel item                     |
| `talenta_download_editor_v2` | `download_competitions` dan `download_document_settings` |
| `talenta_winner_manager_v1`  | `winner_categories`, `winners`, dan SK melalui dokumen   |
| `talenta_winner_page_v1`     | `winner_page_settings`                                   |
| `talenta_archive_manager_v2` | `competitions`, dokumen, kategori, dan pengaturan detail |
| `talenta_faq_manager_v1`     | `faq_categories` dan `faq_questions`                     |
| `MOCK_ARCHIVE_DATABASE`      | `competitions` beserta relasi bertingkat                 |

Relasi kunci yang diverifikasi dalam analisis itu menetapkan Arsip sebagai pemilik tunggal data historis lomba, sementara Unduh dan Pemenang menjadi konsumen. Unduh menyimpan referensi `competitionId` dan pengaturan visibilitas alih-alih menduplikasi dokumen. Winner terikat ke lomba `current`; SK menunjuk dokumen milik lomba yang sama melalui composite foreign key. FAQ berdiri sendiri tanpa foreign key lomba. `deleted_at` diselaraskan dengan tombstone `removedCompetitionIds`, dan unique partial index membatasi satu lomba `current` per portal.

### 1 Agustus 2026 — Fase 1, Fondasi Backend

- Project NestJS dengan TypeScript strict dibuat di `apps/backend/`.
- TypeORM, koneksi PostgreSQL, konfigurasi environment, validasi global, dan autentikasi JWT dasar disiapkan.
- Entity fondasi meliputi `organizations`, `users`, `organization_memberships`, `event_sites`, `site_domains`, `site_settings`, `media_assets`, dan `audit_logs`.
- Initial migration dibuat dan dijalankan pada PostgreSQL 18.3.
- Auth module mencakup service, strategy, guard, dan controller.
- Pemeriksaan `npx tsc --noEmit` dicatat lulus pada fase ini.

### 1 Agustus 2026 — Fase 2, Data Inti Lomba

- Entity `competitions`, `competition_documents`, `winner_categories`, `winners`, `competition_detail_settings`, `archive_category_settings`, dan `archive_document_settings` ditambahkan.
- Composite relation mapping dan foreign key diverifikasi pada PostgreSQL.
- Unique partial index membatasi satu competition `current` per site.
- Snapshot validasi fase ini mencatat 16 tabel, 22 foreign key, satu migration terpasang, serta pemeriksaan TypeScript dan ESLint yang lulus.

### 1 Agustus 2026 — Fase 3, Halaman dan Konfigurasi

- `page_settings` dan `winner_page_settings` ditambahkan; migration `AddPageSettings` dijalankan dan constraint `(event_site_id, page_type)` menolak halaman duplikat.
- `home_sections` beserta `hero_badges`, `hero_actions`, `schedule_items`, `pricing_packages`, `pricing_facilities`, `benefit_items`, dan `partner_items` ditambahkan.
- Migration `AddHomeSections` menambah delapan tabel. Unique section type per portal dan cascade delete child diuji.
- `download_competitions` dan `download_document_settings` ditambahkan melalui migration `AddDownloads`. PostgreSQL menolak competition lintas portal, dokumen lintas competition, dan tab default ganda.
- `faq_categories` dan `faq_questions` ditambahkan melalui migration `AddFaq`. Pertanyaan orphan ditolak dan cascade delete diuji.
- Audit fase ini mencatat lima migration terpasang, tanpa schema drift, serta TypeScript, ESLint, dan Jest yang lulus.

Ringkasan `PROGRESS.md` pada tanggal yang sama juga mencatat penambahan `page_settings`, `winner_page_settings`, `home_sections`, dan tujuh tabel item melalui dua migration setelah skema awal, berikut pengujian duplikasi halaman/section, cascade delete, keberlangsungan partial index, TypeScript, ESLint, dan schema drift.

### 1 Agustus 2026 — Fase 4, API Publik dan Admin

Pada snapshot awal fase ini, label lama masih menyebut pekerjaan sedang berjalan. Checklist historis kemudian mencatat capaian berikut:

- Audit `organization.entity.ts` dan `competition.entity.ts` menemukan compiler, ESLint, dan metadata migration bersih; diagnostic merah IDE dinilai stale pada saat itu.
- `LoginDto` memvalidasi email/password dan kompatibel dengan whitelist pipe.
- JWT memverifikasi user aktif ke database tanpa fallback secret lemah.
- `OrganizationGuard` memverifikasi membership tenant untuk Admin API.
- Field request asing ditolak, CORS dibatasi melalui environment, dan header Express disembunyikan.
- E2E keamanan untuk versioned route, login malformed, dan unknown field dicatat lulus 3/3.
- Endpoint publik mencakup Bootstrap, Home, Downloads, Winners, Archives, Archive detail, dan FAQ. Resolver portal berbasis hostname, filter publication/active/tenant, serta validasi hostname dan slug diterapkan.
- Session Admin mengembalikan organisasi dan event yang dapat diakses. Pembuatan Event cukup memakai nama; backend membuat slug sementara yang dapat diubah melalui editor.
- `event_site_archive_sources` memungkinkan Arsip, dokumen, dan pemenang event terdahulu diwariskan tanpa duplikasi.
- Soft delete serta Publish/Unpublish Event tersedia bagi owner/admin; publish mewajibkan slug final dan mengelola hostname primer.
- Site detail dan daftar competition dibatasi tenant. Competition mendukung create, update, soft-delete, publish, audit log, dan optimistic locking melalui `version` serta `If-Match`.
- Documents CRUD memvalidasi kepemilikan media organisasi. Winner categories dan winners CRUD memakai composite ownership constraint. Page settings memakai GET/PUT dengan unique upsert per portal/page.
- Role viewer ditolak saat menulis dan organisasi lain ditolak saat membaca.
- Metadata `media_assets` serta attachment dokumen dummy diuji. Pada snapshot ini, presigned URL untuk file fisik belum dibuat karena masih menunggu pilihan provider S3, MinIO, atau R2.
- Full-flow E2E mencakup event → media dummy → document → category → winner → page → publish → public → update/delete.
- Gate pada catatan fase ini mencatat TypeScript, unit test, E2E 16/16, seluruh migration, tidak adanya fixture test tersisa, dan tidak adanya schema drift sebagai hasil pengujian pada saat itu.

Ringkasan terpisah pada `PROGRESS.md` untuk tanggal yang sama mencatat enam migration, sembilan E2E PostgreSQL, TypeScript, ESLint, unit test, dan audit dependency yang lulus, termasuk kasus cross-tenant, role, stale version, dan publish. Perbedaan hitungan tersebut dipertahankan sebagai snapshot pengujian dengan cakupan atau waktu pencatatan yang berbeda, bukan sebagai receipt kondisi sekarang.

### 3 Agustus 2026 — Integrasi Frontend dan Backend

- Seluruh state/data yang tersedia melalui UI Admin—autentikasi/session, Competition, Detail Arsip, Pemenang, Unduh, FAQ, Beranda, dan Pengaturan Global—dicatat telah memakai API PostgreSQL.
- Template publik untuk bootstrap global, Beranda, Unduh, FAQ, Pemenang, Arsip, dan Detail Arsip dicatat telah memakai public API berdasarkan `siteSlug`.
- `localStorage` pada renderer/editor dipertahankan ketika itu hanya sebagai baseline, fallback, atau kompatibilitas preview setelah API berhasil dimuat, bukan sumber persistensi utama.
- Public API memakai slug competition pada tautan Detail Arsip. Heading, active state, visibilitas metadata, kategori, dokumen, tab, footer, dan tema berasal dari database.
- Media yang masih berbentuk Data URL pada editor Home pada snapshot integrasi awal disimpan lossless di JSONB; object storage produksi belum dipilih pada tahap tersebut.

Catatan integrasi final di `PROGRESS.md` menegaskan bahwa session/auth, global settings, Beranda, Arsip list/detail, Pemenang, Unduh, dan FAQ telah dihubungkan ke NestJS/PostgreSQL tanpa perubahan desain. Hasil yang dicatat saat itu meliputi frontend check, audit relasi/parity, backend TypeScript/lint/unit/E2E 10/10, audit dependency produksi dengan 0 vulnerability, serta kontrak HTTP public API yang lulus. Demonstrasi browser black-box interaktif ditunda sesuai arahan pengguna ketika catatan dibuat.

### 3 Agustus 2026 — Media Lokal Menjadi Sumber Utama

- Modul media NestJS ditambahkan untuk upload multipart terautentikasi dan delivery publik.
- File disimpan lokal per organisasi, sedangkan metadata, checksum, creator, status, dan referensi disimpan di PostgreSQL.
- Logo global, maskot Competition, ikon Home, foto pemenang, dan PDF dihubungkan ke alur media.
- Upload base64/FileReader Admin diganti dengan shared client `TalentaMedia`.
- Listener `localStorage` dan event state Admin dihapus dari Template publik.
- E2E media meliputi JWT, role, signature palsu, upload valid, delivery, dan header `nosniff`.
- Regression pada saat itu mencatat 11/11 backend E2E, 0 vulnerability produksi, serta audit struktural/parity/relasi/dialog frontend yang lulus.

Perubahan media lokal ini terjadi setelah snapshot integrasi awal yang masih mencatat Data URL JSONB dan belum memilih object storage. Karena itu, kedua fakta dipertahankan sebagai tahapan berurutan, bukan sebagai dua klaim keadaan yang berlaku bersamaan sekarang.

### 3 Agustus 2026 — Gate Validasi yang Dicatat

Gate pada `docs/BACKEND_PROGRESS.md` mencatat hasil berikut untuk saat pelaksanaannya:

- Backend TypeScript dan lint lulus.
- Backend unit test 1/1 dan E2E 10/10 lulus.
- Audit dependency produksi mencatat 0 vulnerability.
- Pemeriksaan route/asset/ID frontend, sintaks 42 file JavaScript, sinkronisasi tema, dan Prettier lulus.
- Paritas Home desktop/tablet/mobile lulus.
- Audit relasi Archive, Downloads, Winners, FAQ, dan dialog Admin lulus.
- HTTP smoke seluruh endpoint publik lulus.
- Browser black-box interaktif ditunda atas arahan pengguna pada waktu itu.

Hasil tersebut adalah rekaman validasi historis dan tidak menyatakan keadaan checkout saat ini.

### 4 Agustus 2026 — Dashboard Event dan Pewarisan Arsip

- Dashboard Daftar Event ditambahkan setelah login, dengan aksi Kelola Event dan Hapus Event.
- Pembuatan Event disederhanakan menjadi satu input nama; slug/subdomain dikelola dari editor Event.
- Migration `event_site_archive_sources` memungkinkan event baru mewarisi daftar Arsip, dokumen, dan pemenang event sebelumnya tanpa menggandakan record.
- Soft delete Event dan pembaruan slug/subdomain tenant-scoped ditambahkan pada Pengaturan Event.
- Pengujian pada saat itu mencatat TypeScript backend, 14/14 E2E PostgreSQL, relasi Arsip lintas-event, sintaks frontend, dan alur browser yang lulus.

### 4 Agustus 2026 — Publikasi Event dan Gateway Domain Lokal

- Status publikasi Event `draft`, `published`, dan `unpublished`, beserta waktu publikasi, ditambahkan melalui migration kesembilan.
- Daftar Event memperoleh aksi Publikasikan/Nonaktifkan, badge Draft/Aktif/Nonaktif, validasi slug final, dan hostname `slug.nexaplaymetadata.online`.
- Resolver publik ditutup ketika Event tidak aktif tanpa menghapus konten atau relasi Arsip.
- Gateway lokal port `8080` menyatukan Template dan backend `/api`; contoh wildcard Cloudflare Tunnel juga ditambahkan.
- Catatan pengujian pada tanggal tersebut menyebut migration, lint/build backend, 16/16 E2E PostgreSQL, frontend check, serta HTTP gateway untuk halaman, aset, dan API sebagai lulus pada saat dijalankan.

### 4 Agustus 2026 — Penyempurnaan Relasi Event, Dokumen, dan Pemenang

- Dokumen Competition aktif dapat diunggah serta dikelola langsung dari editor Unduh; PDF dibatasi maksimal 10 MB.
- Sumber tambahan Unduh dibatasi pada Competition published dari Event terdahulu yang diwariskan. Competition aktif dipisahkan dari pemilih sumber.
- Pemenang Sebelumnya hanya berasal dari Arsip nyata yang memiliki pemenang aktif; fallback data dummy dihapus sehingga Event pertama dapat menampilkan keadaan kosong.
- Field Kecamatan dihapus dari kontrak UI/public dan form/tampilan; Kabupaten serta Provinsi dipersistensikan melalui API.
- Batas seluruh upload gambar, logo, maskot, ikon, dan foto diseragamkan menjadi maksimal 5 MB.

### 4 Agustus 2026 — Relasi File SK Pemenang

- Input URL SK diganti dengan upload PDF maksimal 10 MB pada Manajemen Pemenang.
- Judul dan deskripsi default SK disimpan per Competition, sementara satu dokumen ditunjuk melalui `decree_document_id`.
- Dokumen dengan role `winner_decree` dan kategori `SK Pemenang` di-upsert serta otomatis dimasukkan ke Unduh.
- Dokumen yang sama dipakai pada Pemenang publik dan Detail Arsip, sehingga Event berikutnya mewarisi SK tanpa duplikasi file.
