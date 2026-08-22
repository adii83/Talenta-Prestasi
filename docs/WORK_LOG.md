# Log Kerja Lintas Sesi

Dokumen ini mencatat riwayat aktivitas, keputusan teknis, dan perbaikan file dalam repository Talenta Prestasi secara faktual antar sesi pengembangan.

## Perbedaan dengan `PROGRESS.md`

- **`PROGRESS.md`**: Menjelaskan status fitur/modul secara keseluruhan, checklist item aktif, dan panduan validasi proyek.
- **`docs/WORK_LOG.md`**: Menuliskan catatan rinci per aktivitas/tugas pengembangan yang mengubah berkas (apa yang diminta, keputusan/proses, berkas yang diubah, dan hasil validasi).

## Aturan Pencatatan Log

1. **Faktual**: Catat hanya tindakan dan validasi yang benar-benar telah dijalankan. Jangan mengklaim validasi yang belum dieksekusi.
2. **Tanpa Secret**: Dilarang memasukkan API key, token autentikasi, password, secret key, atau data sensitif lainnya ke dalam log.
3. **Format Konsisten**: Gunakan struktur entri yang seragam untuk setiap tugas.

---

## Riwayat Pekerjaan

### 2026-08-22 — Domain Publik Runtime Provider-Netral

- **Permintaan**: Membuat domain production dapat dikonfigurasi tim client hanya melalui `PUBLIC_BASE_DOMAIN` tanpa mengedit source frontend dan tanpa ketergantungan wajib pada Cloudflare.
- **Proses/Keputusan**: Menambahkan endpoint publik read-only `/api/v1/public/runtime-config`. Frontend memuat domain dari endpoint sebelum request Admin/Public pertama, mempertahankan URL API lokal pada `localhost`, dan tetap mengutamakan hostname kategori yang tersimpan. Cloudflare, Nginx, Caddy, Apache, Traefik, atau proxy lain dapat digunakan selama wildcard DNS/TLS tersedia dan header `Host` asli diteruskan.
- **File**: Public controller backend, runtime config dan API client shared, audit runtime config, package script, panduan setup, serta dokumentasi operasional.
- **Validasi**: E2E endpoint runtime config dan audit frontend dijalankan dengan siklus red-green. Validasi penuh dicatat setelah seluruh suite selesai.
- **Kendala**: Hostname kategori lama di database tidak diubah otomatis; kategori perlu dipublikasikan ulang setelah domain berubah.

### 2026-08-22 — Login Admin Berbasis Username

- **Permintaan**: Mengganti identitas autentikasi Admin dari email menjadi username dan mengganti konfigurasi seed `LOCAL_ADMIN_EMAIL` menjadi `LOCAL_ADMIN_USERNAME`.
- **Proses/Keputusan**: Login hanya menerima `username` dan `password`; field email lama ditolak. Username dinormalisasi menjadi huruf kecil dengan karakter `a-z`, `0-9`, `.`, `_`, `-` sepanjang 3–64 karakter. Migration mempertahankan UUID pengguna, mengambil bagian email sebelum `@`, dan menyelesaikan bentrok secara deterministik berdasarkan ID dengan akhiran `-2`, `-3`, dan seterusnya. JWT tetap memakai UUID sebagai `sub`; username hanya menjadi identitas tampilan. Migration dibuat kompatibel dengan database lama yang masih memiliki kolom `email` dan database baru yang reset schema-nya sudah memiliki kolom `username`.
- **File**: Migration dan reset schema pengguna, entity `User`, controller/service/JWT/decorator autentikasi, session Admin, seed lokal, form login dan dashboard Admin, unit/E2E tests, README backend, panduan setup, serta dokumentasi operasional.
- **Validasi**: Backend unit test 12 suite / 114 test lulus; backend build lulus; E2E autentikasi dan Admin 2 suite / 11 test lulus; `npm run check:js` lulus 46 file; `npm run check:routes` lulus 13 route; Prettier scope lulus.
- **Kendala**: Migration dan seed tidak dijalankan pada database aktif sesuai batasan pekerjaan. Rollback migration menghasilkan alamat lokal `<username>@legacy.local`, bukan memulihkan email asli.
- **Tindak lanjut**: Jalankan migration melalui prosedur operasional pada database target yang sudah dicadangkan, lalu login memakai `LOCAL_ADMIN_USERNAME` dan `LOCAL_ADMIN_PASSWORD`. Commit, push, dan deployment tidak dilakukan.

### 2026-08-21 — Multi-SK Pemenang dan Banner Arsip

- **Permintaan**: Mengubah SK Pemenang tunggal menjadi beberapa SK per Event, dengan label tombol Banner yang dapat dikustom, Banner Arsip otomatis, override label khusus Arsip, dan SK tetap tampil sebagai dokumen biasa pada Dokumen Terkait.
- **Proses/Keputusan**: Mempertahankan `event_documents` sebagai sumber tunggal dengan `document_role = winner_decree`. Menambahkan label default maksimal 40 karakter dan batas maksimal 10 SK per Event. Payload Admin/Public memakai `decrees[]`; Banner Pemenang dan Banner Arsip merender banyak tombol, sedangkan Dokumen Terkait memakai tombol standar `Unduh`. Detail Arsip tidak lagi memilih satu dokumen lewat dropdown; override label Arsip disimpan per dokumen.
- **File**: Migration/entity/service/controller backend, public content service, editor Pemenang, editor Detail Arsip, repository shared, renderer Public, CSS responsif, audit relasi, dan regression tests terkait.
- **Validasi**: Backend unit test 11 suite / 100 test lulus; backend build lulus; Admin E2E 1 suite / 7 test lulus; `npm run check:js` lulus 46 file; audit Pemenang dan Arsip lulus; Prettier scope lulus; `git diff --check` lulus dengan peringatan normal LF/CRLF; Graphify diperbarui.
- **Kendala**: Migration belum dijalankan pada database aktif. Global format check dan acceptance browser penuh tidak dijalankan dalam batch ini.
- **Tindak lanjut**: Jalankan migration pada database target melalui prosedur operasional, lalu lakukan acceptance browser desktop/tablet/mobile untuk upload banyak SK, toggle, override label Arsip, Banner, Preview, dan Dokumen Terkait. Commit/push/deployment tidak dilakukan.

### 2026-08-20 — Optimistic Concurrency Workspace Event

- **Tanggal/Judul**: 2026-08-20 — Optimistic Concurrency Workspace Event
- **Permintaan**: Menambahkan optimistic concurrency control lintas editor Admin Event agar simpan stale, publish, dan discard draft ditolak tanpa auto-merge.
- **Proses/Keputusan**: Menambahkan kolom `event_sites.workspace_revision` dengan default `1` melalui migration. Seluruh writer workspace memakai compare-and-swap atomik `UPDATE ... WHERE workspace_revision=$2 RETURNING`. Revision stale mengembalikan HTTP `409` dengan pesan reload konsisten. Publish/discard mengunci row Event. Respons reader dan writer menyediakan revision untuk rantai simpan frontend; API client mengirimkannya otomatis pada mutasi Event, sedangkan save FAQ dan Unduh dibuat berurutan. E2E memakai revision aktual, bukan nilai hardcode. Investigasi menemukan `EntityManager.query()` TypeORM mengembalikan hasil `UPDATE ... RETURNING` sebagai tuple `[[row], affectedCount]`; helper revision kini mengurai bentuk tersebut agar revision respons tidak hilang.
- **File**:
  - `apps/backend/src/database/migrations/1787270400000-AddWorkspaceRevision.ts`
  - `apps/backend/src/entities/event-site.entity.ts`
  - `apps/backend/src/admin/workspace-revision.ts`
  - `apps/backend/src/admin/workspace-revision.spec.ts`
  - `apps/backend/src/admin/admin.controller.ts`
  - `apps/backend/src/admin/admin.service.ts`
  - `apps/backend/src/admin/admin.service.spec.ts`
  - `apps/backend/src/admin/admin-content.controller.ts`
  - `apps/backend/src/admin/admin-content.service.ts`
  - `apps/backend/src/admin/admin-content.service.spec.ts`
  - `apps/backend/src/admin/event-publication.service.ts`
  - `apps/backend/src/admin/event-publication.service.spec.ts`
  - `apps/backend/test/admin.e2e-spec.ts`
  - `apps/admin/js/core/workspace-revision.js`
  - `packages/shared/js/core/api-client.js`
  - `apps/admin/js/features/faq/api.js`
  - `apps/admin/js/features/downloads/api.js`
  - `apps/admin/js/shell/router.js`
  - `apps/admin/index.html`
  - `docs/WORK_LOG.md`
- **Validasi**: `npm --prefix apps/backend test -- --runInBand` lulus 11 suite / 96 test; `npm --prefix apps/backend run build` lulus; `npm --prefix apps/backend run test:e2e -- --runInBand --no-cache test/admin.e2e-spec.ts` lulus 1 suite / 7 test; syntax JavaScript frontend berubah lulus `node --check`; Graphify diperbarui.
- **Kendala**: E2E awal menerima `workspaceRevision` kosong meski database naik. Penyebab ialah bentuk tuple hasil `EntityManager.query()` TypeORM, bukan cache Jest atau controller route.
- **Tindak lanjut**: Migration belum dijalankan pada database aktif. Commit, push, deployment, dan tindakan destruktif tidak dilakukan.

### 2026-08-20 — Konsistensi Akses Media Admin dan Public Preview

- **Tanggal/Judul**: 2026-08-20 — Konsistensi Akses Media Admin dan Public Preview
- **Permintaan**: Menganalisis dan memperbaiki broken image yang muncul tidak konsisten pada editor Admin dan Lihat Preview untuk seluruh media terkait, bukan hanya halaman Pemenang.
- **Proses/Keputusan**: Pemeriksaan database memastikan referensi utama memiliki row asset aktif, Organization sesuai, dan file storage tersedia; asset published sudah masuk allowlist, sedangkan asset Beranda draft yang belum allowlisted memang harus memakai akses Admin atau token Preview. Foto Pemenang, Highlight, dan preview Global Admin kini memakai `adminPreviewUrl` dengan Event ID eksplisit. Foto baru serta ikon upload Beranda memakai Blob terautentikasi dan mencabut Blob lama. Halaman Pemenang, SK Pemenang, maskot Arsip, dan dokumen Unduh pada Public Preview kini memakai `TalentaPublic.mediaUrl`, yang menambahkan token hanya selama preview dan tetap menghasilkan URL bersih saat published.
- **File**:
  - `apps/admin/js/features/home/editor.js`
  - `apps/admin/js/features/home/winner-highlight-editor.js`
  - `apps/admin/js/features/winners/api.js`
  - `apps/admin/js/features/winners/manager.js`
  - `apps/admin/js/shell/settings-editor.js`
  - `apps/public-site/assets/js/archive-list.js`
  - `apps/public-site/assets/js/download-renderer.js`
  - `apps/public-site/assets/js/winner-renderer.js`
  - `scripts/audit-media-context.mjs`
  - `scripts/audit-winner-relations.mjs`
  - `docs/WORK_LOG.md`
- **Validasi**: TDD — audit media context diamati gagal pada resolver foto Admin sebelum implementasi, lalu lulus. `npm run check:js` lulus 45 file; `npm run test:winner-relations`, `npm run test:event-publication`, dan `npm run test:event-logo` lulus; Prettier memvalidasi sepuluh file media terkait; `git diff --check` lulus dengan peringatan normal konversi LF/CRLF. Puppeteer berhasil membuka frontend, login memakai akun lokal, dan memuat Admin; acceptance browser penuh dihentikan atas permintaan pengguna sebelum navigasi seluruh halaman media.
- **Kendala**: Sweep subagent tambahan gagal karena limit API `429`; audit utama tetap diselesaikan melalui Graphify, pencarian call-site, database read-only, dan suite lokal. Browser sempat mencoba route `portal.html` yang tidak tersedia dan memperoleh 404; route tersebut bukan route aplikasi yang digunakan.
- **Tindak lanjut**: Pengguna dapat melakukan hard refresh lalu acceptance manual pada Pemenang, Highlight Beranda, Arsip, dan Unduh, terutama asset draft sebelum publikasi. Commit, push, dan deployment tidak dilakukan.

### 2026-08-20 — Serialisasi Query Snapshot Publikasi Event

- **Tanggal/Judul**: 2026-08-20 — Serialisasi Query Snapshot Publikasi Event
- **Permintaan**: Menghilangkan `DeprecationWarning` driver `pg` ketika satu client transaksi menerima query baru sebelum query sebelumnya selesai.
- **Proses/Keputusan**: Snapshot publik dan workspace pada transaksi publikasi kini dibuat berurutan. `PublicContentService` membungkus executor snapshot dengan antrean Promise lokal sehingga susunan query agregat tetap ringkas, tetapi pemanggilan aktual ke transaction manager tidak pernah overlap. Dependency `pg` tidak diubah.
- **File**:
  - `apps/backend/src/admin/event-publication.service.ts`
  - `apps/backend/src/admin/event-publication.service.spec.ts`
  - `apps/backend/src/public/public-content.service.ts`
  - `apps/backend/src/public/public-content.service.spec.ts`
  - `docs/WORK_LOG.md`
- **Validasi**: TDD — dua regression test diamati gagal dengan `snapshot overlap` dan `query overlap`, lalu lulus setelah serialisasi. Seluruh unit test backend lulus 10 suite / 87 test; build NestJS lulus; Prettier memvalidasi empat file TypeScript; `git diff --check` lulus dengan peringatan normal konversi LF/CRLF.
- **Kendala**: Reproduksi terminal dengan `--trace-deprecation` tidak dijalankan karena backend aktif milik pengguna tidak dihentikan atau diambil alih.
- **Tindak lanjut**: Restart `npm run start:dev`, lakukan **Publikasikan perubahan**, dan pastikan warning tidak muncul lagi. Commit, push, dan deployment tidak dilakukan.

### 2026-08-20 — Perbaikan Media Logo dan Hero pada Preview Lintas Origin

- **Tanggal/Judul**: 2026-08-20 — Perbaikan Media Logo dan Hero pada Preview Lintas Origin
- **Permintaan**: Memperbaiki respons `404 Media not found` yang kadang muncul pada Logo & Tema, gambar Hero Beranda, Lihat Preview, dan tampilan publik tanpa melakukan perubahan di luar masalah media tersebut.
- **Proses/Keputusan**: Investigasi memastikan row asset aktif dan file fisik tersedia. Logo publik serta gambar Hero publik lama masuk `event_publication_assets`, sedangkan gambar Hero draf terbaru belum masuk allowlist sebelum publikasi. Penyebab Preview lintas origin ialah elemen gambar memakai URL media tanpa token dan bergantung pada cookie preview `SameSite=Lax`, yang tidak selalu dikirim pada permintaan gambar lintas-site. `TalentaPublic.mediaUrl` kini menambahkan `preview_token` hanya pada URL media internal selama preview Event aktif; runtime Logo dan resolver asset Hero memakai helper tersebut. URL publik terbit tetap bersih dan memakai allowlist.
- **File**:
  - `apps/public-site/assets/js/public-api.js`
  - `apps/public-site/assets/js/runtime.js`
  - `apps/public-site/assets/js/home-renderer.js`
  - `scripts/audit-public-preview-scope.mjs`
  - `scripts/audit-event-logo.mjs`
  - `docs/WORK_LOG.md`
- **Validasi**: TDD — regression URL media workspace diamati gagal karena token tidak ada; regression Logo dan Hero masing-masing juga diamati gagal sebelum perubahan production terkait. `npm run test:event-publication`, `npm run test:event-logo`, dan `npm run check:js` lulus. Prettier memvalidasi lima file JavaScript yang berubah. `git diff --check` lulus dengan peringatan normal konversi LF/CRLF.
- **Kendala**: Tidak ada. CORS bukan penyebab respons ini karena permintaan telah mencapai backend dan ditolak oleh aturan akses media.
- **Tindak lanjut**: Acceptance browser dapat mengunggah Logo dan Hero baru, menyimpan draf, lalu membuka Lihat Preview pada hostname berbeda sebelum publikasi. Commit, push, dan deployment tidak dilakukan.

### 2026-08-20 — Dua Mode Tampilan Pemenang

- **Tanggal/Judul**: 2026-08-20 — Dua Mode Tampilan Pemenang
- **Permintaan**: Menambahkan pilihan per pemenang antara desain bawaan existing dan unggahan satu gambar desain final, menyamakan tampilan halaman Pemenang dengan Highlight Beranda, serta menjaga seluruh item persegi dengan layout mobile satu kolom dan tablet/desktop tiga kolom.
- **Proses/Keputusan**: Migration menambahkan `display_mode` dan `design_asset_id` beserta invariant database. Backend menggabungkan PATCH parsial dengan row terkunci lalu menulis final state secara atomik; desain custom divalidasi sebagai JPG/PNG/WebP aktif milik Organization Event maksimal 5 MB. Editor mewajibkan radio untuk item baru, membersihkan referensi mode lama setelah konfirmasi tanpa menghapus asset fisik, dan mempertahankan desain lama sampai replacement upload beserta Blob preview baru berhasil. Delete memadatkan urutan serta hanya mengubah label otomatis exact-match. Halaman Pemenang dan Highlight Beranda memakai renderer item bersama; custom hanya merender fallback peringkat dan gambar full-bleed dengan listener load/error tanpa inline handler. CSS menjaga rasio 1:1, crop tengah, inset responsif, serta grid 1/3/3.
- **File**:
  - `apps/backend/src/database/migrations/1786845600000-AddWinnerDisplayMode.ts`
  - `apps/backend/src/database/migrations/reset-category-event-schema.spec.ts`
  - `apps/backend/src/entities/winner.entity.ts`
  - `apps/backend/src/admin/admin-content.controller.ts`
  - `apps/backend/src/admin/admin-content.service.ts`
  - `apps/backend/src/admin/admin-content.service.spec.ts`
  - `apps/backend/src/public/public-content.service.ts`
  - `apps/backend/src/public/public-content.service.spec.ts`
  - `apps/backend/src/admin/event-publication.service.spec.ts`
  - `apps/backend/src/media/media.service.ts`
  - `apps/backend/src/media/media.service.spec.ts`
  - `apps/admin/js/features/winners/api.js`
  - `apps/admin/js/features/winners/manager.js`
  - `apps/admin/js/features/home/winner-highlight-editor.js`
  - `packages/shared/js/data/repositories/winner-repository.js`
  - `packages/shared/js/data/repositories/home-repository.js`
  - `apps/public-site/assets/js/winner-renderer.js`
  - `apps/public-site/assets/js/home-renderer.js`
  - `apps/public-site/assets/css/main.css`
  - `scripts/audit-winner-relations.mjs`
  - `scripts/browser-winner-layout-audit.mjs`
  - `package.json`
  - `docs/DATA_MODEL.md`
  - `docs/ADMIN_SPEC.md`
  - `docs/TESTING.md`
  - `docs/superpowers/specs/2026-08-20-tampilan-pemenang-desain-sendiri-design.md`
  - `docs/superpowers/plans/2026-08-20-tampilan-pemenang-desain-sendiri.md`
  - `docs/WORK_LOG.md`
- **Validasi**: Lima suite backend terfokus lulus 41 test (`admin-content.service`, `public-content.service`, `event-publication.service`, `media.service`, dan regression migration); build NestJS lulus; `npm run check:js` lulus 45 file; `npm run test:winner-relations` lulus; `npm run test:winner-layout` lulus pada 390, 768, dan 1440 piksel untuk layout 1/3/3, rasio 1:1, crop tengah, fallback gambar, inset, preview Admin, serta overflow; `npm run test:event-publication` lulus setelah assertion audit lama dilonggarkan dari sintaks khusus `JOIN` menjadi kontrak akses `FROM event_publication_assets` yang sesuai query `EXISTS` production.
- **Kendala**: Percobaan menghidupkan static server baru berhenti dengan `EADDRINUSE` karena port 4173 sudah dipakai; audit browser memakai server existing tanpa menghentikan proses tersebut. Assertion full-bleed disesuaikan terhadap content box karena border kartu 1 piksel menghasilkan selisih total 2 piksel. Fixture radio audit dibuat mandiri agar tidak bergantung pada seed atau sesi Admin.
- **Tindak lanjut**: Migration belum dijalankan pada database aktif. Penerapan migration dan acceptance data nyata memerlukan izin operasional terpisah. Commit, push, dan deployment tidak dilakukan.

### 2026-08-19 — Template Event Terbaru pada Pembuatan Periode

- **Tanggal/Judul**: 2026-08-19 — Template Event Terbaru pada Pembuatan Periode
- **Permintaan**: Menambahkan opsi tidak aktif secara default pada form **Buat Event/Periode** untuk memakai konfigurasi dan konten berulang dari Event paling baru dalam kategori yang sama, termasuk Event Persiapan atau Arsip.
- **Proses/Keputusan**: Frontend hanya mengirim boolean `useLatestTemplate`; backend memilih ulang sumber dalam transaksi kategori terkunci memakai urutan `period_year`, gelombang, waktu pembuatan, dan ID. Event target tetap Persiapan, nonaktif, serta belum dipublikasikan. Clone menyalin identitas visual, `site_settings`, Beranda beserta turunannya, FAQ, pengaturan halaman, pengaturan halaman Pemenang, dan struktur kategori pemenang memakai ID baru serta referensi asset organisasi existing. Dokumen, tab Unduh, pemenang, SK/detail Arsip, publikasi, publication assets, dan audit lama tidak disalin. Kegagalan clone membatalkan transaksi. Tidak ada migration karena tidak ada perubahan schema.
- **File**:
  - `apps/backend/src/admin/admin.controller.ts`
  - `apps/backend/src/admin/admin.service.ts`
  - `apps/backend/src/admin/admin.service.spec.ts`
  - `apps/admin/js/shell/portal-dashboard.js`
  - `scripts/audit-category-event-contracts.mjs`
  - `docs/superpowers/specs/2026-08-19-template-event-terbaru-design.md`
  - `docs/superpowers/plans/2026-08-19-template-event-terbaru.md`
  - `docs/WORK_LOG.md`
- **Validasi**: TDD — audit frontend dan unit backend diamati merah sebelum implementasi. Seluruh unit test backend lulus 10 suite / 67 test (`npm --prefix apps/backend test -- --runInBand`); backend build lulus (`npm --prefix apps/backend run build`); `npm run check:js` lulus 45 file; `npm run test:category-events` dan `npm run test:event-period-ux` lulus; `git diff --check` lulus dengan peringatan normal konversi LF/CRLF. E2E tidak dijalankan karena memerlukan PostgreSQL disposable.
- **Kendala**: Entity child Beranda lama tidak sepenuhnya sesuai schema aktif; clone mengikuti migration reset aktif, khususnya `pricing_facilities.package_id`.
- **Tindak lanjut**: Restart/hot reload backend dan refresh Admin cukup untuk acceptance testing pada database sekarang. Commit, push, dan deployment tidak dilakukan.

### 2026-08-19 — Rekonsiliasi Batch/Gelombang Saat Event Dihapus

- **Tanggal/Judul**: 2026-08-19 — Rekonsiliasi Batch/Gelombang Saat Event Dihapus
- **Permintaan**: Saat konversi otomatis membuat gelombang (mis. buat Event 2026 dua kali → Gelombang 1 dan 2), penghapusan salah satu gelombang meninggalkan Event tersisa tetap berlabel gelombang. Menambahkan validasi: bila setelah hapus hanya tersisa satu Event pada tahun yang sama, Event itu kembali menjadi Event tanpa gelombang; bila tersisa lebih dari satu, penomoran gelombang dirapikan ulang berurutan naik (mis. [1,2,3,4,5] hapus 3 → sisa jadi [1,2,3,4]).
- **Proses/Keputusan**: `deleteEvent` diperluas dalam transaksi yang sama. Saat soft delete, `batch_number` dan `batch_label` Event yang dihapus di-`NULL`-kan agar slot nomornya lepas (unique index `uq_event_period_batch` tidak mengecualikan baris terhapus). Jika Event yang dihapus memiliki `period_year` dan `batch_number`, helper `reconcilePeriodBatches` dijalankan: mengambil Event hidup berbatch pada `(category, period_year)` yang sama urut naik; bila tersisa tepat satu → demote menjadi tanpa gelombang (`batch_number`/`batch_label` NULL, slug = tahun); bila tersisa ≥2 → renumber berurutan 1..n dengan slug dibangun ulang. Renumber ascending menjamin bebas kolisi terhadap unique index. Batas draf/publik dipertahankan: perubahan berada di workspace dan baru tampil publik setelah publikasi Event terkait.
- **File**:
  - `apps/backend/src/admin/admin.service.ts`
  - `apps/backend/src/admin/admin.service.spec.ts`
  - `docs/WORK_LOG.md`
- **Validasi**: TDD — 4 test baru diamati merah lebih dulu (fitur belum ada), lalu hijau setelah implementasi. Backend build lulus (`npm run build`); seluruh unit test backend lulus 10 suite / 63 test (`npm test -- --runInBand`); `npm run check:js` lulus 45 file. E2E tidak dijalankan karena memerlukan database disposable dan suite tidak menyentuh `deleteEvent`.
- **Kendala**: Tidak ada.
- **Tindak lanjut**: Acceptance browser dengan data nyata dapat dilakukan pengguna melalui dashboard Event (buat dua/lebih gelombang, hapus salah satu, verifikasi penomoran tersisa). Commit, push, dan deployment menunggu instruksi terpisah.

### 2026-08-19 — Preservasi Parameter Preview Token Media dan Adaptasi SK Banner Mobile

- **Tanggal/Judul**: 2026-08-19 — Preservasi Parameter Preview Token Media dan Adaptasi SK Banner Mobile
- **Permintaan**: Memperbaiki ikon unggahan Arsip yang belum tampil pada Lihat preview halaman Pemenang & Arsip (dan publik bila dipublikasikan) serta memastikan tombol Unduh SK berada di bawah deskripsi khusus mobile saja, sementara tablet dan desktop tetap sejajar.
- **Proses/Keputusan**:
  1. `TalentaMedia.url()` pada client-side kini mendeteksi parameter `preview_token` pada URL halaman dan secara otomatis meneruskannya ke URL media `/api/v1/public/media/:id?preview_token=...` sehingga permintaan gambar preview tetap tersertifikasi authorization token.
  2. `PublicService.winners()` disesuaikan agar passing flag `resolved.preview` ke `archiveSummary()`, memastikan `mascotAssetId` dan `fallbackIcon` draf dari workspace terkirim pada endpoint Pemenang preview.
  3. `main.css` disesuaikan dengan media query `@media (max-width: 639px)` agar tombol SK berada di bawah deskripsi khusus pada layar mobile, sedangkan tablet & desktop (`>= 640px`) tetap sejajar horizontal di sebelah kanan.
- **File**:
  - `packages/shared/js/core/media-client.js`
  - `apps/backend/src/public/public.service.ts`
  - `apps/backend/src/public/public.service.spec.ts`
  - `apps/public-site/assets/css/main.css`
  - `scripts/audit-archive-layout.mjs`
  - `docs/WORK_LOG.md`
- **Validasi**:
  - NestJS Unit Tests: 10 suite / 59 test lulus (`npm test -- --runInBand`).
  - NestJS Build: Berhasil (`npm run build`).
  - Audit Relasi Arsip: Lulus (`node scripts/audit-archive-relations.mjs`).
  - Audit Layout Arsip: Lulus pada 1440px, 768px, 390px, 320px (`node scripts/audit-archive-layout.mjs`).
  - Prettier & Syntax Check: Lulus tanpa error (`npx prettier --check`).
- **Kendala**: Tidak ada.
- **Tindak lanjut**: Pengguna dapat melihat preview ikon unggahan Arsip di halaman Pemenang & Arsip secara langsung saat mode preview aktif, dan pada publik setelah menekan tombol **Publikasikan**.

### 2026-08-19 — Sinkronisasi Ikon Arsip ke Preview dan Publik

- **Tanggal/Judul**: 2026-08-19 — Sinkronisasi Ikon Arsip ke Preview dan Publik
- **Permintaan**: Memperbaiki ikon upload Event Arsip yang hanya terlihat pada editor, tetapi tetap memakai ikon lama pada **Lihat preview** dan Public Site.
- **Proses/Keputusan**: Bukti database menunjukkan `mascot_asset_id` baru sudah tersimpan pada workspace Event Arsip, sedangkan snapshot publik Event Arsip dan allowlist medianya masih memakai nilai lama. Daftar Arsip dengan token preview kini menimpa identitas ikon snapshot menggunakan workspace Event Arsip yang termasuk periode sebelumnya. Endpoint media preview mengizinkan maskot Event lama dalam kategori dan organisasi yang sama. Saat Event aktif dipublikasikan, backend menyegarkan hanya snapshot Event Arsip published yang identitas ikonnya berbeda, beserta allowlist media, sehingga perubahan ikon menjadi publik melalui tombol publikasi existing tanpa membuka draf konten Arsip lain.
- **File**:
  - `apps/backend/src/public/public.service.ts`
  - `apps/backend/src/public/public.service.spec.ts`
  - `apps/backend/src/media/media.service.ts`
  - `apps/backend/src/media/media.service.spec.ts`
  - `apps/backend/src/admin/event-publication.service.ts`
  - `apps/backend/src/admin/event-publication.service.spec.ts`
  - `docs/WORK_LOG.md`
- **Validasi**: Regression daftar preview diamati merah karena respons masih berisi `asset-published`; regression media preview diamati merah karena query belum mengenali maskot Event Arsip; regression publikasi diamati merah karena builder hanya dipanggil untuk Event aktif. Setelah perbaikan, 3 suite/19 test terfokus lulus, audit relasi Arsip lulus, Prettier file scope lulus, dan build backend lulus.
- **Kendala**: Public Site normal tetap memakai snapshot terakhir sampai Admin menekan **Publikasikan**; ini mempertahankan batas draf/publik existing.
- **Tindak lanjut**: Refresh Admin, simpan ikon Arsip, periksa **Lihat preview**, lalu tekan **Publikasikan** agar ikon baru tampil pada Public Site.

### 2026-08-19 — Perbaikan Konteks Auth Editor Detail Arsip

- **Tanggal/Judul**: 2026-08-19 — Perbaikan Konteks Auth Editor Detail Arsip
- **Permintaan**: Memperbaiki error `TalentaAdminAuth is not defined` saat membuka Edit Detail Arsip, langsung pada working tree utama dan tanpa perubahan lintas modul.
- **Proses/Keputusan**: Editor Detail Arsip berjalan sebagai iframe dan sebelumnya membaca `TalentaAdminAuth` dari global iframe, padahal helper autentikasi hanya dimiliki shell Admin parent. Pembacaan kategori diubah mengikuti pola editor lain menjadi optional lookup melalui `window.parent`, sehingga kegagalan konteks tidak menghentikan sinkronisasi form dan pemuatan API.
- **File**:
  - `apps/admin/js/features/archive/detail-editor.js`
  - `scripts/audit-archive-relations.mjs`
  - `docs/WORK_LOG.md`
- **Validasi**: Regression baru diamati gagal tepat karena editor belum membaca `window.parent.TalentaAdminAuth`, kemudian audit relasi Arsip dan pemeriksaan sintaks 45 file JavaScript lulus setelah satu-line fix. Prettier kedua file source lulus. Browser tanpa shell membuktikan tidak ada lagi `ReferenceError`; data fallback dan preview tetap terisi, sedangkan request tanpa sesi secara terpisah menghasilkan `Unauthorized` sesuai kontrak.
- **Kendala**: Acceptance data Admin nyata tetap memerlukan halaman dibuka dari shell Admin dengan sesi login valid.
- **Tindak lanjut**: Refresh Admin, login bila sesi berakhir, lalu buka Edit Detail dari daftar Arsip.

### 2026-08-19 — Migration Lokal, E2E Terisolasi, dan Layout Banner SK

- **Tanggal/Judul**: 2026-08-19 — Migration Lokal, E2E Terisolasi, dan Layout Banner SK
- **Permintaan**: Menjalankan migration database development secara aman, menguji seluruh migration dan E2E pada PostgreSQL terpisah, melakukan acceptance browser dengan data nyata, membiarkan layanan lokal hidup untuk pengujian pengguna, serta memindahkan tombol **Unduh SK** ke bawah deskripsi dengan posisi rata kanan.
- **Proses/Keputusan**: Gate development membuktikan target PostgreSQL berada di loopback, database development adalah `talenta_prestasi`, migration reset destruktif lama sudah tercatat, dan seluruh 19 migration—termasuk logo Event serta nama presentasi Arsip—sudah applied; karena tidak ada migration tertunda, migration development tidak dijalankan ulang. Schema diverifikasi memiliki `event_sites.logo_asset_id` beserta foreign key media, `site_settings.navbar_logo_size` dengan default 36 dan batas 24–44, serta `event_detail_settings.archive_display_name`. E2E diarahkan hanya ke database fresh `talenta_prestasi_e2e_20260819` dan storage `apps/backend/storage/uploads/e2e-20260819`; seluruh migration direplay sebelum suite dijalankan. Banner SK memakai Grid scoped pada Detail Arsip: blok judul/deskripsi mengisi baris pertama, tombol natural-width berada pada baris kedua dan rata kanan tanpa mengubah markup renderer shared.
- **File**:
  - `apps/public-site/assets/css/main.css`
  - `scripts/audit-archive-layout.mjs`
  - `docs/WORK_LOG.md`
- **Validasi**: Audit layout diperluas ke 1440×900, 768×1024, 390×844, dan 320×844. RED sah menunjukkan tombol desktop masih sejajar dengan deskripsi; GREEN membuktikan tombol berada di bawah deskripsi, teks tetap rata kiri, sisi kanan sejajar padding banner, ukuran tombol natural, dan tidak ada overflow. Count development sebelum tindakan tetap `users=41`, `organizations=3`, `competition_categories=7`, `event_sites=16`, `event_publications=10`, `media_assets=25`, serta `event_detail_settings=5`; verifikasi schema dan ledger tidak mengubah record. Database E2E mulai dengan 0 tabel publik, lalu menunjukkan 19/19 migration applied. Full E2E menghasilkan 2 dari 3 suite dan 12 dari 13 test lulus. Build backend lulus; 10 suite/55 unit test backend lulus; audit layout Arsip, relasi Arsip, relasi Pemenang, serta sintaks 45 file JavaScript lulus. Acceptance Public Site langsung memakai API/database nyata pada tiga viewport: endpoint list/detail `oips`/`2026` merespons 200, heading dan SK nyata tampil tanpa fallback, CTA berlabel **Unduh SK** berada di bawah deskripsi dan rata kanan, serta tidak ada overflow horizontal.
- **Kendala**: Satu E2E Admin gagal dengan respons 400 karena fixture PUT settings lama tidak menyertakan field wajib `navbarLogoSize`; API production tidak diubah dan test di luar scope tidak diperbaiki. Browser gateway dari origin `http://127.0.0.1:8080` menampilkan fallback karena backend tidak memberikan header CORS untuk origin tersebut, walaupun route halaman dan proxy API masing-masing merespons 200; konfigurasi CORS di luar scope tidak diubah. Acceptance Admin terautentikasi tidak dilakukan karena login harus dimasukkan manual oleh pengguna. Database E2E menyisakan empat user uji, tanpa Organization/Event/publication/media/detail-setting, serta satu file upload uji.
- **Tindak lanjut**: Database dan storage E2E sengaja dibiarkan untuk inspeksi. Backend PID 30368, static server PID 12536, dan gateway PID 17144 tetap hidup. Admin tersedia di `http://localhost:4173/apps/admin/`; Detail Arsip data nyata tersedia di `http://localhost:4173/apps/public-site/arsip/detail/?site=oips&event=2026`. Perbaiki fixture E2E `navbarLogoSize` dan allowlist CORS gateway hanya melalui scope terpisah.

### 2026-08-19 — Nama Presentasi Arsip dan Ikon Arsip pada Pemenang

- **Tanggal/Judul**: 2026-08-19 — Nama Presentasi Arsip dan Ikon Arsip pada Pemenang
- **Permintaan**: Mengisi Nama lomba pada Edit Detail Arsip dengan default nama Event beserta tahun/batch, tetap membebaskan Admin mengedit atau menghapus tahun, menerapkan hasilnya hanya pada kartu/detail Arsip, serta menyamakan ikon kartu Arsip halaman Pemenang pada preview Admin, Lihat preview, dan Public Site.
- **Proses/Keputusan**: Menambahkan `event_detail_settings.archive_display_name` nullable sebagai nama presentasi scoped; `NULL` memakai formatter periode existing, sedangkan string tersimpan dipakai verbatim tanpa mengubah `event_sites.name`. Endpoint Detail Arsip mempertahankan value existing bila client lama menghilangkan field dan menolak nama yang kosong setelah trimming. Snapshot tetap schema versi 1 dengan field additive dan fallback untuk snapshot lama. Mapper Pemenang menerjemahkan `fallbackIcon`/`mascotAssetId` ke kontrak renderer shared; Admin memakai Blob endpoint Event Arsip, Public Site memakai URL media canonical. **Lihat halaman** dari editor Detail Arsip kini membuat token preview untuk Event Arsip yang sedang diedit, bukan Event aktif; resolver detail memakai workspace token tersebut hanya bila target URL adalah Event yang sama, sedangkan request tanpa token tetap membaca snapshot published.
- **File**:
  - `apps/backend/src/database/migrations/1786759300000-AddArchiveDisplayName.ts`
  - `apps/backend/src/database/migrations/reset-category-event-schema.spec.ts`
  - `apps/backend/src/entities/event-detail-settings.entity.ts`
  - `apps/backend/src/admin/admin-content.controller.ts`
  - `apps/backend/src/admin/admin-content.service.ts`
  - `apps/backend/src/admin/admin-content.service.spec.ts`
  - `apps/backend/src/admin/admin.service.ts`
  - `apps/backend/src/admin/admin.service.spec.ts`
  - `apps/backend/src/public/public-content.service.ts`
  - `apps/backend/src/public/public-content.service.spec.ts`
  - `apps/backend/src/public/public.service.ts`
  - `apps/backend/src/public/public.service.spec.ts`
  - `apps/admin/editors/arsip/detail/index.html`
  - `apps/admin/js/features/archive/detail-api.js`
  - `apps/admin/js/features/archive/detail-editor.js`
  - `apps/admin/js/features/archive/manager.js`
  - `apps/admin/js/features/winners/api.js`
  - `apps/public-site/assets/js/winner-renderer.js`
  - `scripts/audit-archive-relations.mjs`
  - `scripts/audit-winner-relations.mjs`
  - `docs/DATA_MODEL.md`
  - `docs/TESTING.md`
  - `docs/WORK_LOG.md`
- **Validasi**: Regression terfokus awal diamati merah: 8 test backend gagal karena migration/query/resolver belum tersedia; audit Arsip dan Pemenang gagal pada kontrak form/mapper. Setelah implementasi awal, 5 suite/39 test backend terfokus lulus. Regression boundary berikutnya membuktikan nama whitespace-only semula diterima, lalu 1 suite/5 test lulus setelah validasi trimming. Regression **Lihat halaman** membuktikan token Event Arsip semula berakhir `Archive event not found`; setelah resolver dan tautan diperbaiki, 1 suite/9 test Public Service serta audit relasi Arsip lulus. Verifikasi final terbaru: build backend lulus; 10 suite/55 unit test backend lulus; audit relasi Arsip, relasi Pemenang, serta layout mobile Arsip lulus; 45 file JavaScript lulus pemeriksaan sintaks; seluruh file scope tugas lulus Prettier; dan `git diff --check` lulus tanpa error whitespace.
- **Kendala**: Assertion audit awal tidak menerima trailing comma hasil format object JavaScript; regex dilonggarkan tanpa mengurangi kontrak `siteId`. Percobaan pertama menjalankan audit dari direktori yang salah sehingga `package.json` tidak ditemukan; audit diulang dari root repository. Fixture regression whitespace pertama kehabisan mock query dan diperbaiki sebelum RED behavior diamati. `npm run format:check` global sebelumnya gagal pada file existing/lintas scope; pemeriksaan format terfokus dipakai agar tidak memformat massal perubahan di luar tugas. Peringatan line-ending LF→CRLF dari Git tidak merupakan error `diff --check`.
- **Tindak lanjut**: Migration dibuat tetapi tidak dijalankan pada database aktif. Terapkan hanya melalui izin operasional terpisah. Public Site tanpa token baru menerima perubahan draf setelah alur publikasi existing.

### 2026-08-19 — Sinkronisasi Identitas dan Detail Event Arsip

- **Tanggal/Judul**: 2026-08-19 — Sinkronisasi Identitas dan Detail Event Arsip
- **Permintaan**: Menyamakan ikon Event Arsip pada Admin dan Public Site; menyediakan pilih, upload, ganti, serta reset ikon; menghapus field Nama pendek; memilih otomatis SK Pemenang milik Event yang diedit; menyediakan judul/deskripsi banner SK; menyertakan tahun/batch pada nama tampilan; memperbaiki clipping mobile; serta menempatkan tombol Unduh SK dari sisi kanan dengan teks tetap rata kiri.
- **Proses/Keputusan**: Identitas ikon memakai `fallbackIcon` dan `mascotAssetId` existing. PATCH Event dibuat true-partial agar field omitted tidak terhapus, sedangkan `mascotAssetId: null` tetap menjadi reset eksplisit. Asset ikon divalidasi berdasarkan organisasi, status aktif, dan MIME gambar. Preview Admin memakai URL Blob endpoint Admin; Public Site memakai media snapshot. SK diresolusikan hanya dari dokumen Event yang dimuat: ID tersimpan lebih dahulu, lalu dokumen aktif ber-role `winner_decree`; tanpa dokumen, selector tetap `— Tidak ada SK —` dan editor judul/deskripsi dinonaktifkan. Nama tahun/batch hanya format tampilan, bukan perubahan nama dasar Event. Banner mobile memakai tinggi adaptif; tombol tetap natural-width di kanan.
- **File**:
  - `apps/backend/src/admin/admin.controller.ts`
  - `apps/backend/src/admin/admin.service.ts`
  - `apps/backend/src/admin/admin.service.spec.ts`
  - `apps/admin/editors/arsip/detail/index.html`
  - `apps/admin/js/features/archive/api.js`
  - `apps/admin/js/features/archive/detail-api.js`
  - `apps/admin/js/features/archive/detail-editor.js`
  - `apps/admin/js/features/archive/manager.js`
  - `apps/public-site/arsip/index.html`
  - `apps/public-site/assets/js/archive-list.js`
  - `apps/public-site/assets/css/main.css`
  - `packages/shared/js/data/repositories/archive-repository.js`
  - `scripts/audit-archive-relations.mjs`
  - `scripts/audit-archive-layout.mjs`
  - `package.json`
  - `docs/WORK_LOG.md`
- **Validasi**: Regression backend dan audit relasi/layout diamati gagal sebelum implementasi. Setelah perbaikan, build backend lulus; 10 suite/44 test backend lulus; `npm run check:js` memvalidasi 45 file; `npm run test:archive-relations` lulus; dan `npm run test:archive-layout` lulus pada viewport 320, 375, serta 480 px. Pemeriksaan format dan whitespace dijalankan terpisah setelah pencatatan ini.
- **Kendala**: Pilihan mode Upload semula langsung dirender ulang sebagai Pustaka karena mode diturunkan dari `mascotAssetId`; handler diperbaiki agar kontrol upload tetap terbuka sampai file dipilih. Input judul/deskripsi SK semula dapat membuat banner tanpa dokumen; field kini dinonaktifkan sampai SK dipilih.
- **Tindak lanjut**: Publikasikan masing-masing Event Arsip melalui alur publikasi existing agar perubahan draf tampil di Public Site.

### 2026-08-18 — Perapian Layout Sumber Dokumen Event Saat Ini

- **Tanggal/Judul**: 2026-08-18 — Perapian Layout Sumber Dokumen Event Saat Ini
- **Permintaan**: Memanjangkan input Nama tab di halaman Unduh, menempatkan nama Event dan jumlah dokumen di samping judul Dokumen lomba saat ini dengan jarak yang rapi, serta menyejajarkan tombol Tambah dokumen baru di kanan input.
- **Proses/Keputusan**: Heading dan metadata memakai satu baris fleksibel pada desktop. Baris kontrol memakai grid dengan input mengisi ruang tersisa dan tombol berada di kanan sejajar bagian bawah input. Pada layar sempit, heading, metadata, input, dan tombol ditumpuk agar tidak menyebabkan overflow horizontal.
- **File**:
  - `apps/admin/editors/unduh/index.html`
  - `apps/public-site/assets/css/main.css`
  - `scripts/audit-download-editor-layout.mjs`
  - `package.json`
  - `docs/WORK_LOG.md`
- **Validasi**: Browser regression audit terbukti gagal sebelum implementasi karena wrapper layout belum tersedia, kemudian `npm run test:download-layout` lulus pada viewport 1440 px dan 390 px setelah implementasi.
- **Kendala**: `npm run test:theme-browser` berhenti pada pemeriksaan tema existing sebelum mencapai layout karena tema Public Site aktual `#1e4b8c`, bukan fixture audit `#3a8f1f`; layout dipisahkan ke audit browser terfokus agar tidak bergantung pada state tema tersebut.
- **Tindak lanjut**: Tidak ada.

### 2026-08-18 — Nama Tab Dokumen Event Saat Ini

- **Tanggal/Judul**: 2026-08-18 — Nama Tab Dokumen Event Saat Ini
- **Permintaan**: Menambahkan nama tab yang dapat dikustom pada Dokumen lomba saat ini di editor Unduh, seperti sumber Event sebelumnya, dengan default nama Event beserta tahun periodenya.
- **Proses/Keputusan**: Editor memakai field `customTabName` existing tanpa perubahan schema/API. Default Event saat ini mengikuti format nama Event+periode existing, termasuk batch bila ada. Nilai lama yang kosong atau hanya sama dengan nama Event ditingkatkan agar menyertakan tahun, sedangkan nama custom existing dipertahankan. Input langsung memperbarui preview dan dipersistensikan melalui Simpan perubahan.
- **File**:
  - `apps/admin/editors/unduh/index.html`
  - `apps/admin/js/features/downloads/api.js`
  - `apps/admin/js/features/downloads/editor.js`
  - `scripts/audit-download-relations.mjs`
  - `docs/WORK_LOG.md`
- **Validasi**: Regression audit terbukti gagal karena default masih `Olimpiade Sains`, bukan `Olimpiade Sains 2027`, lalu `npm run test:download-relations`, `npm run check:js`, pemeriksaan format file terfokus, dan `git diff --check` lulus setelah implementasi.
- **Kendala**: Tidak ada.
- **Tindak lanjut**: Tidak ada.

### 2026-08-18 — Perbaikan Preview Maskot Hero Admin

- **Tanggal/Judul**: 2026-08-18 — Perbaikan Preview Maskot Hero Admin
- **Permintaan**: Memperbaiki broken image Gambar Utama pada Hero hanya di editor Admin, mengganti nama field menjadi Maskot Event, dan menyamakan hanya teks rekomendasi upload dengan logo Event.
- **Proses/Keputusan**: Editor sebelumnya langsung merender URL `/api/v1/public/media/:assetId`; asset draf belum masuk allowlist publik sehingga endpoint dapat mengembalikan 404. URL publik tetap disimpan untuk data Hero, sedangkan thumbnail dan preview editor kini membaca asset melalui endpoint Admin terautentikasi sebagai Blob/Object URL. Object URL dicabut saat diganti, dihapus, atau halaman dilepas. Sebelum Blob tersedia, thumbnail memakai placeholder agar tidak membentuk gambar kosong. Behavior upload lain tidak disamakan dengan logo.
- **File**:
  - `apps/admin/editors/beranda/index.html`
  - `apps/admin/js/features/home/editor.js`
  - `scripts/audit-theme-sync.mjs`
  - `docs/WORK_LOG.md`
- **Validasi**: Regression audit terbukti gagal sebelum perbaikan karena editor belum menyediakan preview media Admin, lalu lulus setelah implementasi. Audit tambahan terbukti gagal ketika thumbnail membentuk `<img src="">`, lalu lulus setelah placeholder diterapkan. `npm run check:theme`, `npm run check:js`, dan `git diff --check` lulus setelah perubahan production.
- **Kendala**: Tidak ada.
- **Tindak lanjut**: Tidak ada.

### 2026-08-18 — Transparansi Logo Footer dan Diagnosis Loading Publik

- **Tanggal/Judul**: 2026-08-18 — Transparansi Logo Footer dan Diagnosis Loading Publik
- **Permintaan**: Menghilangkan background logo footer saat gambar tersedia agar transparansi PNG dipertahankan seperti navbar, sekaligus mendiagnosis loading hasil publikasi yang terasa lambat tanpa memperluas scope ke optimasi.
- **Proses/Keputusan**: Wrapper footer bergambar kini transparan tanpa radius, sedangkan gambar memakai `object-fit: contain`; fallback inisial tetap mempertahankan background dan radius existing. Pengukuran lokal menunjukkan gateway HTML sekitar 6 ms, API warm sekitar 2–3 ms, dan bootstrap cold sekitar 30–128 ms, sehingga database lokal bukan bottleneck utama yang terukur. Halaman awal mereferensikan 13 asset lokal sekitar 275 KB, termasuk CSS sekitar 192 KB, ditambah resource font dan ikon eksternal. Static dev server memakai `no-cache, no-store` melalui opsi `-c-1`, sehingga asset dimuat ulang; latency hostname/tunnel publik belum diukur karena URL publik aktual tidak tersedia.
- **File**:
  - `apps/public-site/assets/css/main.css`
  - `scripts/audit-event-logo.mjs`
  - `docs/WORK_LOG.md`
- **Validasi**: Regression audit footer terbukti gagal sebelum perubahan CSS dan lulus setelah perubahan melalui `npm run test:event-logo`. Pengukuran lokal dilakukan secara read-only terhadap gateway dan endpoint publik.
- **Kendala**: Chrome DevTools tidak tersedia dan proses `agent-browser` tidak selesai, sehingga trace browser dihentikan. Diagnosis hostname publik memerlukan pengukuran URL publik aktual.
- **Tindak lanjut**: Tidak ada optimasi cache, kompresi, gambar, database, atau tunnel dalam scope ini.

### 2026-08-18 — Stabilitas Tema/Logo Event dan Foto Pemenang

- **Tanggal/Judul**: 2026-08-18 — Stabilitas Tema/Logo Event dan Foto Pemenang
- **Permintaan**: Memperbaiki dua bug tanpa memperluas scope: bootstrap Event aktif kadang tidak menerapkan tema, logo, dan favicon; foto pemenang kadang broken pada Public Site.
- **Proses/Keputusan**: URL logo bootstrap sebelumnya memakai `TalentaConfig.apiBaseUrl` langsung sebagai base `new URL`; nilai relatif `/api/v1` pada gateway membuat handler berhenti sebelum tema/logo/favicon diterapkan. Base kini selalu diresolusikan terhadap `location.origin`. Cabang fallback `photoAssetId` pada Highlight Beranda dan halaman Pemenang sebelumnya menghasilkan URL relatif ke dev server port 4173; keduanya kini diresolusikan ke origin backend/gateway seperti `photoUrl`. Detail Arsip sudah memakai resolusi benar dan tidak diubah.
- **File**:
  - `apps/public-site/assets/js/runtime.js`
  - `apps/public-site/assets/js/home-renderer.js`
  - `apps/public-site/assets/js/winner-renderer.js`
  - `scripts/audit-event-logo.mjs`
  - `scripts/audit-winner-relations.mjs`
  - `docs/WORK_LOG.md`
- **Validasi**: Regression audit kedua bug terbukti gagal sebelum perubahan production. Setelah perbaikan, `npm run test:event-logo` dan `npm run test:winner-relations` lulus.
- **Kendala**: Acceptance database/browser tidak dijalankan karena migration logo belum diizinkan; backend existing tidak dihidupkan agar migration otomatis tidak berjalan.
- **Tindak lanjut**: Tidak ada dalam scope bug ini.

### 2026-08-18 — Logo dan Favicon Per Event

- **Tanggal/Judul**: 2026-08-18 — Logo dan Favicon Per Event
- **Permintaan**: Menambahkan logo eksplisit per Event, memakai asset yang sama sebagai favicon Public Site, serta menyediakan satu pengaturan ukuran logo navbar 24–44 piksel untuk desktop, tablet, dan mobile. Logo harus terpisah dari maskot Event dan field logo/favicon Kategori legacy.
- **Proses/Keputusan**: Menambahkan referensi nullable `event_sites.logo_asset_id` dan `site_settings.navbar_logo_size` dengan default 36. Migration hanya menyiapkan backfill workspace dari maskot Event atau logo Kategori legacy; snapshot publik existing tidak ditulis ulang. Settings Admin memvalidasi asset PNG/JPEG/WebP aktif milik Organization Event. Preview Admin membaca endpoint binary terautentikasi sebagai Blob/Object URL yang hanya hidup di memori dan dicabut saat stale, diganti, dihapus, atau halaman dilepas. Cache browser tetap di-scope per Event dan tidak menyimpan URL `blob:`. Runtime Public Site memakai logo Event untuk navbar, mobile header, footer, dan favicon; slider hanya mengubah navbar serta mobile header. Audit race mencegah operasi asinkron lama menimpa state baru dan memastikan tombol hapus tetap tersedia ketika asset masih tersimpan tetapi preview gagal dimuat. Tidak ditambahkan pemrosesan gambar atau remove-background otomatis.
- **File**:
  - `apps/backend/src/database/migrations/1786759200000-AddEventLogoSettings.ts`
  - `apps/backend/src/database/migrations/reset-category-event-schema.spec.ts`
  - `apps/backend/src/entities/event-site.entity.ts`
  - `apps/backend/src/entities/site-settings.entity.ts`
  - `apps/backend/src/admin/admin.controller.ts`
  - `apps/backend/src/admin/admin.service.ts`
  - `apps/backend/src/admin/admin.service.spec.ts`
  - `apps/backend/src/admin/event-publication.service.spec.ts`
  - `apps/backend/src/media/media.controller.ts`
  - `apps/backend/src/media/media.controller.spec.ts`
  - `apps/backend/src/media/media.service.ts`
  - `apps/backend/src/media/media.service.spec.ts`
  - `apps/backend/src/public/public-content.service.ts`
  - `apps/backend/src/public/public-content.service.spec.ts`
  - `apps/backend/src/public/workspace-snapshot.service.ts`
  - `apps/admin/index.html`
  - `apps/admin/js/shell/settings-editor.js`
  - `apps/public-site/assets/css/main.css`
  - `apps/public-site/assets/js/runtime.js`
  - `packages/shared/js/core/api-client.js`
  - `packages/shared/js/core/media-client.js`
  - `packages/shared/js/data/repositories/settings-repository.js`
  - `scripts/audit-api-client.mjs`
  - `scripts/audit-theme-sync.mjs`
  - `scripts/audit-event-logo.mjs`
  - `package.json`
  - `docs/ARCHITECTURE.md`
  - `docs/ADMIN_SPEC.md`
  - `docs/DATA_MODEL.md`
  - `docs/TESTING.md`
  - `docs/WORK_LOG.md`
  - `docs/superpowers/specs/2026-08-18-event-logo-favicon-design.md`
  - `docs/superpowers/plans/2026-08-18-event-logo-favicon.md`
- **Validasi**: Backend build lulus; 10 suite/39 unit test lulus. Audit publikasi Event, UX periode Event, sinkronisasi tema enam editor, runtime logo/favicon, 13 route canonical, dan sintaks 45 file JavaScript lulus. Regression test race tombol hapus terbukti gagal sebelum perbaikan dan lulus setelah perbaikan. Audit runtime membuktikan pembuatan serta penggantian gambar navbar/mobile, favicon dinamis, fallback ukuran 36, clamp 24–44, dan isolasi ukuran footer.
- **Kendala**: Migration dibuat dan diuji secara source, tetapi tidak dijalankan. Acceptance browser/database tidak dijalankan karena belum ada izin migration; backend juga tidak dihidupkan terhadap database existing karena konfigurasi startup dapat menjalankan migration otomatis.
- **Tindak lanjut**: Jalankan migration dan acceptance browser/database hanya setelah izin operasional terpisah. Commit, push, release, dan deployment tetap memerlukan instruksi terpisah.

### 2026-08-18 — Perbaikan Tema Preview Editor Antar-Event

- **Tanggal/Judul**: 2026-08-18 — Perbaikan Tema Preview Editor Antar-Event
- **Permintaan**: Memperbaiki preview internal editor Admin yang memakai warna tema Event aktif ketika Admin sedang mengelola Event lain; Pengaturan Global, Lihat Preview, dan Public Site sudah menampilkan tema Event yang benar.
- **Proses/Keputusan**: Akar masalah berada pada cache browser settings yang memakai satu key `localStorage` untuk semua Event. Cache settings sekarang di-scope dengan ID Event terpilih. Hasil pemuatan settings API, penyimpanan, dan Urungkan edit menghidrasi cache Event tersebut sehingga enam editor Admin merender tema Event yang sedang dikelola tanpa dipengaruhi Event aktif.
- **File**:
  - `packages/shared/js/data/repositories/settings-repository.js`
  - `apps/admin/js/shell/settings-editor.js`
  - `scripts/audit-theme-sync.mjs`
  - `docs/WORK_LOG.md`
- **Validasi**: Regression test merah membuktikan helper scope Event belum tersedia, lalu hijau setelah perbaikan. `npm run check:js`, `npm run check:theme`, `npm run test:event-period-ux`, dan `npm run test:event-publication` lulus. Puppeteer membuktikan preview editor Event 2026 tetap biru ketika cache global/aktif merah, lalu preview Event 2027 tetap merah ketika cache global/aktif biru. Pemeriksaan format file JavaScript terfokus serta `git diff --check` dijalankan setelah perubahan final.
- **Kendala**: Suite browser tema penuh berhenti pada fixture Unduh yang tidak memiliki `.doc-card`; skenario lintas Event tetap diverifikasi terpisah dengan Puppeteer.
- **Tindak lanjut**: Tidak ada.

### 2026-08-18 — Penyelarasan Dokumentasi Referensi Dokumen Lintas Event

- **Tanggal/Judul**: 2026-08-18 — Penyelarasan Dokumentasi Referensi Dokumen Lintas Event
- **Permintaan**: Menyelaraskan dokumentasi aktif dengan implementasi terbaru yang mengizinkan tab Unduh mereferensikan dokumen dari Event lain dalam Kategori Lomba yang sama.
- **Proses/Keputusan**: Mendokumentasikan bahwa dokumen tetap dimiliki Event sumber, foreign key tab tetap menjaga scope Event pemilik tab, dan service memverifikasi kesamaan Kategori Lomba. Referensi lintas kategori atau tenant tetap ditolak. Aturan ownership SK, Detail Arsip, pemenang, dan media tidak diubah.
- **File**:
  - `docs/ARCHITECTURE.md`
  - `docs/ADMIN_SPEC.md`
  - `docs/DATA_MODEL.md`
  - `docs/TESTING.md`
  - `docs/WORK_LOG.md`
- **Validasi**: Pemeriksaan istilah konflik pada dokumentasi aktif, format Prettier terfokus, dan `git diff --check`.
- **Kendala**: Ruflo `hooks_route` menutup koneksi; pekerjaan dokumentasi dilanjutkan langsung tanpa mengubah konfigurasi Ruflo atau AgentDB Bridge.
- **Tindak lanjut**: Tidak ada.

### 2026-08-13 — Perbaikan Resolusi Absolut URL `photoAssetId` pada Rendering Detail Arsip

- **Tanggal/Judul**: 2026-08-13 — Perbaikan Resolusi Absolut URL `photoAssetId` pada Rendering Detail Arsip
- **Permintaan**: Menyelesaikan bug di mana gambar foto pemenang di halaman publik Detail Arsip tetap tidak ter-render saat diakses via Vite port 4173 (`http://localhost:4173/apps/public-site/arsip/detail/...`), meskipun foto pada Pemenang Utama dan Highlight Beranda sudah berfungsi dengan baik.
- **Proses/Keputusan**: Evaluasi pada `apps/public-site/assets/js/archive-detail.js` mendapati bahwa konversi URL berbasis `TalentaConfig.apiBaseUrl` hanya diberlakukan untuk kondisi `winner.photoUrl` eksis. Apabila API mengembalikan data via `winner.photoAssetId` (kondisi paling umum), URL yang dibentuk sebelumnya hanya berupa string relatif murni (`/api/v1/public/media/...`) yang membuat tag img mencoba mencari gambar di port dev local `4173` (menghasilkan 404). Perbaikan ini menyuntikkan formasi URL Absolut (menggunakan resolusi dari basis config backend) khusus untuk kondisi `photoAssetId` di parser Arsip Detail.
- **File**:
  - `apps/public-site/assets/js/archive-detail.js`
  - `docs/WORK_LOG.md`
- **Validasi**: Gambar dapat termuat penuh secara absolute terlepas dari port browser dev server, serasi dengan modul Pemenang dan Beranda.

### 2026-08-13 — Perbaikan Rendering Resolusi URL Foto Pemenang Publik & Detail Arsip pada Dev Server (Vite/Static)

- **Tanggal/Judul**: 2026-08-13 — Perbaikan Rendering Resolusi URL Foto Pemenang Publik & Detail Arsip pada Dev Server (Vite/Static)
- **Permintaan**: Memperbaiki foto yang tidak muncul/rusak saat public site diakses lewat dev server independen (contoh: `http://localhost:4173/apps/public-site/...` atau `?site=...`) padahal URL API sudah terselesaikan ke server backend (`:3000`).
- **Proses/Keputusan**: Meskipun renderer template HTML telah dikonversi, pemetaan JSON mentah yang diload melalui API Public NestJS dan diinjeksi ke komponen UI ternyata masih menggunakan resolusi URL string as-is dengan fallback ke origin browser as-is, menyebabkan pemanggilan gambar menuju port dev server `4173` (bukannya port `3000` di NestJS tempat file di-hosting). File UI Javascript, yakni `winner-renderer.js` dan `archive-detail.js`, telah diperbarui untuk menyelaraskan properti path URL `.photo` ke `window.TalentaConfig.apiBaseUrl` backend bila API Base berbentuk URL http, persis seperti penanganan API di Beranda.
- **File**:
  - `apps/public-site/assets/js/archive-detail.js`
  - `apps/public-site/assets/js/winner-renderer.js`
  - `docs/WORK_LOG.md`
- **Validasi**: Gambar dapat termuat penuh secara absolute terlepas dari port browser apa yang digunakan untuk menampilkan UI.

### 2026-08-13 — Perbaikan Dimensi dan Overflow Foto Pemenang (CSS)

- **Tanggal/Judul**: 2026-08-13 — Perbaikan Dimensi dan Overflow Foto Pemenang (CSS)
- **Permintaan**: Memperbaiki foto pemenang yang masih terlihat tumpang tindih, melebihi lingkaran, atau "gepeng" pada tampilan Preview maupun Publik.
- **Proses/Keputusan**: Meskipun URL gambar sudah benar, properti CSS pada wrapper foto (`.champion-card__photo` dan `.winner-card__photo`) sebelumnya tidak memiliki pengaturan batas _overflow_ serta _object-fit_ pada elemen gambarnya. File `main.css` diperbarui untuk menambahkan `overflow: hidden` pada elemen pembungkus dan menetapkan `width: 100%; height: 100%; object-fit: cover;` pada elemen `img` agar foto selalu terpotong melingkar secara proporsional.
- **File**:
  - `apps/public-site/assets/css/main.css`
  - `docs/WORK_LOG.md`
- **Validasi**: Gambar yang bukan persegi secara otomatis dipotong (crop) dengan anggun sesuai lingkaran wadah.

### 2026-08-13 — Perbaikan Rendering Foto Pemenang pada Modul Pemenang Utama

- **Tanggal/Judul**: 2026-08-13 — Perbaikan Rendering Foto Pemenang pada Modul Pemenang Utama
- **Permintaan**: Mengatasi sisa gambar corrupt pada preview halaman Pemenang utama di CMS Admin (fungsi `buildWinnerCardMarkup`).
- **Proses/Keputusan**: Meskipun sebelumnya template kartu pemenang untuk _Beranda_ (`home-repository.js`) dan _Detail Arsip_ (`archive-repository.js`) telah diperbaiki, halaman **Pemenang** utama dikontrol oleh template dari `winner-repository.js`. Template string pada `buildWinnerCardMarkup` kini diperbarui untuk menyuntikkan `TalentaMedia.url(...)` secara langsung agar resolve URL berhasil dalam konteks iframe lokal Admin.
- **File**:
  - `packages/shared/js/data/repositories/winner-repository.js`
  - `docs/WORK_LOG.md`
- **Validasi**: Gambar pemenang dirender dengan URL origin backend yang absolut di lingkungan lokal Admin CMS.

### 2026-08-13 — Perbaikan Lanjutan Rendering Foto Pemenang pada Highlight Beranda & Arsip

- **Tanggal/Judul**: 2026-08-13 — Perbaikan Lanjutan Rendering Foto Pemenang pada Highlight Beranda & Arsip
- **Permintaan**: Mengatasi laporan bahwa foto pemenang masih rusak/corrupt pada Highlight Beranda (Preview Responsif dan Lihat Preview) meskipun foto di editor pemenang dan halaman publik sudah benar.
- **Proses/Keputusan**: Pembentukan markup kartu pemenang didorong oleh fungsi repository bersama (`buildHomeWinnerMarkup` & `buildArchiveWinnerCardMarkup`). Meskipun halaman publik otomatis meresolve `/api/v1/...` menggunakan base tag/relative root, iframe Admin memerlukan URL penuh untuk resolusi asset saat rendering string template.
  `TalentaMedia.url(...)` kini disisipkan di dalam iterasi map untuk rendering foto pemenang pada `packages/shared/js/data/repositories/home-repository.js` dan `archive-repository.js`, memastikan iframe preview me-render path gambar yang valid mengarah ke backend NestJS.
- **File**:
  - `packages/shared/js/data/repositories/home-repository.js`
  - `packages/shared/js/data/repositories/archive-repository.js`
  - `docs/WORK_LOG.md`
- **Validasi**: URL markup yang dicetak dalam log dan DOM kini memuat `http://localhost:3000/api/...` secara eksplisit saat dipanggil dalam konteks lokal yang memiliki `TalentaMedia`, sambil tetap fallback gracefully ke path string murni jika dirender oleh runtime NodeJS SSR.
- **Kendala**: Tidak ada.

### 2026-08-13 — Perbaikan Rendering Foto Pemenang pada Kartu Editor CMS Admin & Resolusi URL Media Relative

- **Tanggal/Judul**: 2026-08-13 — Perbaikan Rendering Foto Pemenang pada Kartu Editor CMS Admin & Resolusi URL Media Relative
- **Permintaan**: Mencatat penyelesaian masalah simpan tab Unduh serta memperbaiki tampilan foto pemenang di kartu editor CMS Admin yang sebelumnya tampak corrupt/broken padahal di halaman publik tampil sempurna.
- **Proses/Keputusan**:
  1. Pada `apps/admin/js/features/winners/manager.js`, elemen thumbnail foto pemenang di kartu editor (`wm-winner-card__photo`) kini me-resolve `w.photo` melalui `TalentaMedia.url(w.photo)`. Ini memastikan URL asset UUID (`/api/v1/public/media/:id`) terkonversi dengan benar menjadi URL absolut terhadap origin browser saat ini (misal `http://localhost:3000/api/v1/public/media/:id`), bukan URL relatif broken di dalam konteks iframe/editor Admin.
  2. Pada `apps/admin/js/features/winners/api.js`, properti `photo` pada pemetaan pemenang memprioritaskan `winner.photoUrl` atau pembentukan URL dari `winner.photoAssetId` melalui `TalentaMedia.url(...)`.
- **File**:
  - `apps/admin/js/features/winners/manager.js`
  - `apps/admin/js/features/winners/api.js`
  - `apps/backend/src/database/migrations/1786672900000-AllowCrossEventDownloadDocuments.ts`
  - `apps/backend/src/entities/download-document-settings.entity.ts`
  - `apps/backend/src/admin/admin.service.ts`
  - `apps/backend/src/database/database.module.ts`
  - `docs/WORK_LOG.md`
- **Validasi**: Menjalankan seluruh pengujian unit backend NestJS (`npm --prefix apps/backend test`). 9 test suites / 26 tests pass secara keseluruhan.
- **Kendala**: Tidak ada.
- **Tindak lanjut**: Tidak ada.

### 2026-08-13 — Perbaikan Foreign Key Download Document Settings Lintas Event (Cross-Event Archive Documents)

- **Tanggal/Judul**: 2026-08-13 — Perbaikan Foreign Key Download Document Settings Lintas Event (Cross-Event Archive Documents)
- **Permintaan**: Memperbaiki masalah dokumen dari event arsip/sebelumnya yang menampilkan status "Belum ada dokumen yang ditampilkan untuk lomba ini" pada tampilan publik & preview, serta mencegah Foreign Key constraint violation saat menyimpan draf tab Unduh yang menyertakan sumber arsip.
- **Proses/Keputusan**:
  1. Membuat migration backend `1786672900000-AllowCrossEventDownloadDocuments.ts` untuk melepas constraint Foreign Key composite `(document_id, event_site_id)` pada `download_document_settings` dan menggantinya dengan FK direct `FOREIGN KEY (document_id) REFERENCES event_documents(id) ON DELETE CASCADE`. Hal ini mengizinkan tab Unduh mereferensikan dokumen dari event arsip mana pun dalam kategori lomba tanpa melanggar constraint database.
  2. Memperbarui entitas TypeORM `DownloadDocumentSettings` (`apps/backend/src/entities/download-document-settings.entity.ts`) agar relasi `@JoinColumn` ke `EventDocument` mengarah langsung ke `document_id`.
- **File**:
  - `apps/backend/src/database/migrations/1786672900000-AllowCrossEventDownloadDocuments.ts`
  - `apps/backend/src/entities/download-document-settings.entity.ts`
  - `docs/WORK_LOG.md`
- **Validasi**: Menjalankan seluruh pengujian unit backend NestJS (`npm --prefix apps/backend test`). 9 test suites / 26 tests pass secara keseluruhan.
- **Kendala**: Tidak ada.
- **Tindak lanjut**: Mengklik tombol **Publikasikan** di Admin CMS setelah menyimpan draf tab Unduh agar snapshot publik terbarui dengan data dokumen arsip terbaru.

### 2026-08-09 — Pembuatan Prompt Sesi AI dan Sistem Work Log

- **Tanggal/Judul**: 2026-08-09 — Pembuatan Prompt Sesi AI dan Sistem Work Log
- **Permintaan**: Membuat dokumen prompt sesi standar (`docs/AI_SESSION_PROMPT.md`), sistem log kerja (`docs/WORK_LOG.md`), dan memperbarui pointer dokumentasi di `README.md`.
- **Proses/Keputusan**: Menyusun prompt orientasi sesi AI berbahasa Indonesia dengan batasan keamanan, hierarki sumber kebenaran, dan instruksi tunggu. Membuat template log kerja serta mendaftarkan kedua dokumen baru pada bagian Urutan Baca Dokumentasi di `README.md`.
- **File**:
  - `docs/AI_SESSION_PROMPT.md`
  - `docs/WORK_LOG.md`
  - `README.md`
- **Validasi**: Menjalankan pengecekan referensi string Node.js, pengecekan section log Node.js, pengecekan format Prettier (`npx prettier --check`), dan `git diff --check`.
- **Kendala**: Tidak ada.

### 2026-08-13 — Perbaikan ReferenceError Unduh Editor & Sinkronisasi Tab Sumber Arsip

- **Tanggal/Judul**: 2026-08-13 — Perbaikan ReferenceError Unduh Editor & Sinkronisasi Tab Sumber Arsip
- **Permintaan**: Memperbaiki runtime error `ReferenceError: available is not defined` saat refresh halaman Editor Unduh Admin, serta memastikan dokumen & tab dari event arsip terdahulu tersimpan dan dimuat secara persisten tanpa terpotong.
- **Proses/Keputusan**: Deklarasi `availableList` (`[source, ...archiveSources]`) dipindahkan ke atas sebelum pemetaan `configs` di `apps/admin/js/features/downloads/api.js` agar variabel sudah tersedia saat iterasi tab. Menyelaraskan pencarian `competitionId` dan daftar dokumen per tab pada fungsi `save()` dan `load()`.
- **File**:
  - `apps/admin/js/features/downloads/api.js`
  - `docs/WORK_LOG.md`
- **Validasi**: Menjalankan pengujian backend NestJS (`npm --prefix apps/backend test`). 9 test suite / 26 test passed.
- **Kendala**: Tidak ada.
- **Tindak lanjut**: Tidak ada

### 2026-08-13 — Perbaikan Komprehensif Sumber Arsip, Dokumen SK Pemenang, & Detail Arsip Publik

- **Tanggal/Judul**: 2026-08-13 — Perbaikan Komprehensif Sumber Arsip, Dokumen SK Pemenang, & Detail Arsip Publik
- **Permintaan**: Menyelesaikan 3 masalah utama: (1) Sumber Arsip dari event sebelumnya selalu minta ditambahkan kembali, (2) Dokumen SK Penetapan Pemenang tidak muncul di publik/preview detail arsip, dan (3) Tampilan halaman detail arsip publik kosong (hanya navbar & footer) saat diakses.
- **Proses/Keputusan**:
  1. Pada `apps/backend/src/admin/admin.service.ts` (`putDownloads`), pengecekan dokumen diperluas dari `event_site_id=$2` menjadi verifikasi kepemilikan kategori lomba (`doc_event.category_id=current_event.category_id`). Hal ini mengizinkan dokumen dari event arsip (seperti event 2026) disimpan dan dimasukkan ke draf tab event 2027 tanpa error Foreign Key.
  2. Pada `apps/admin/js/features/downloads/api.js`, pemetaan `save()` kini menyertakan kembali seluruh dokumen milik tab sumber arsip (`compDocuments`) sehingga metadata dokumen arsip tersimpan utuh di draf backend dan publik.
  3. Di `packages/shared/js/core/runtime-config.js`, `apiBaseUrl` diselaraskan ke relatif `/api/v1` (bukan hardcoded `http://localhost:3000/api/v1`), mencegah error CORS / mixed content saat gambar/preview dibuka dari origin tunnel/iframe.
- **File**:
  - `apps/backend/src/admin/admin.service.ts`
  - `apps/admin/js/features/downloads/api.js`
  - `packages/shared/js/core/runtime-config.js`
  - `apps/backend/src/public/public-content.service.ts`
  - `apps/public-site/assets/js/archive-detail.js`
  - `apps/public-site/assets/js/home-renderer.js`
  - `apps/public-site/assets/js/download-renderer.js`
  - `apps/public-site/assets/js/archive-list.js`
  - `packages/shared/js/core/media-client.js`
  - `docs/WORK_LOG.md`
- **Validasi**: Menjalankan pengujian backend NestJS (`npm --prefix apps/backend test`). 9 test suite / 26 test passed.
- **Kendala**: Tidak ada.

### 2026-08-09 — Pengabaian Artifact Lokal Git

- **Tanggal/Judul**: 2026-08-09 — Pengabaian Artifact Lokal Git
- **Permintaan**: Menambahkan artifact lokal Claude/Ruflo/swarm, konfigurasi MCP lokal, environment lokal, serta database/cache lokal ke `.gitignore` tanpa mengabaikan `CLAUDE.md` dan `.env.example`.
- **Proses/Keputusan**: Menambahkan pola direktori tooling yang spesifik, memakai `*.db` untuk mencakup `ruvector.db`, serta menambahkan pengecualian `.env.example` pada root dan subdirektori. Tidak ada file yang dihapus atau diubah status tracking-nya.
- **File**:
  - `.gitignore`
  - `docs/WORK_LOG.md`
- **Validasi**: Menjalankan `git check-ignore` untuk artifact yang harus diabaikan dan file bersama yang harus tetap terlihat; menjalankan Prettier serta `git diff --check`.
- **Kendala**: Tidak ada.
- **Tindak lanjut**: Tidak ada.

### 2026-08-10 — Restrukturisasi Kategori Lomba, Event, dan Arsip Otomatis

- **Tanggal/Judul**: 2026-08-10 — Restrukturisasi Kategori Lomba, Event, dan Arsip Otomatis
- **Permintaan**: Mengubah hierarki lama Organization → EventSite → Competition menjadi Organization → Kategori Lomba → Event/Periode; satu subdomain tetap per kategori, satu Event aktif, Event nonaktif sebagai arsip otomatis, serta menghapus Competition dan sumber arsip manual.
- **Proses/Keputusan**: Menerapkan pekerjaan bertahap dalam lima fase. Menambahkan `competition_categories`; mengubah `event_sites` menjadi Event/Periode; memindahkan ownership domain ke kategori dan ownership dokumen/pemenang/Unduh/SK ke Event; mengganti API Admin/Public dan flow Admin dua tingkat; memperbarui Public Site serta seed; mempertahankan settings visual per Event. Migration reset mempertahankan ledger TypeORM dan discovery migration dibatasi ke file bernama angka. Selama regression test ditemukan dan diperbaiki akses tulis viewer pada Home/Unduh, route media lama, serta resolver publik yang belum memfilter status Event.
- **File**:
  - `apps/backend/src/entities/` dan `apps/backend/src/database/`
  - `apps/backend/src/admin/`, `apps/backend/src/public/`, dan `apps/backend/src/media/`
  - `apps/backend/test/`
  - `apps/admin/`
  - `apps/public-site/`
  - `packages/shared/`
  - `scripts/` dan `package.json`
- **Validasi**: Backend build lulus; 6 suite/13 unit test dan 3 suite/13 E2E test lulus; migration/seed diuji pada database terisolasi; audit route, JavaScript, tema, dialog, Category→Event, Unduh, Pemenang, Arsip, dan FAQ lulus; parity Beranda tiga viewport serta smoke tema 12 target lulus.
- **Kendala**: Ruflo MCP terkonfigurasi tetapi eksekusi retrieval/routing sesi mengalami koneksi tertutup dan kegagalan alokasi native model embedding. Reviewer subagent eksternal gagal karena autentikasi provider `403`; validasi lokal tetap dijalankan. `format:check` global masih memuat baseline file di luar scope yang belum diformat.
- **Tindak lanjut**: Acceptance visual/UX client dan operasi Git/deployment dilakukan terpisah.

### 2026-08-10 — Penerapan Schema Category→Event pada Database Development Utama

- **Tanggal/Judul**: 2026-08-10 — Penerapan Schema Category→Event pada Database Development Utama
- **Permintaan**: Setelah izin destruktif diberikan, menerapkan migration reset dan seed yang telah diuji ke database development utama karena data lama hanya data uji mekanisme sebelum revisi client.
- **Proses/Keputusan**: Menjalankan migration ke-14 pada `talenta_prestasi`; tabel aplikasi lama direset tanpa menghapus ledger `migrations`; menjalankan seed Category→Event dua kali untuk memverifikasi idempotensi; tidak menghapus database E2E, tidak commit, tidak push, dan tidak release.
- **File**: Tidak ada file source baru pada langkah operasional ini; migration dan seed yang digunakan berada di `apps/backend/src/database/`.
- **Validasi**: Database utama memiliki `competition_categories`, `event_sites.category_id`, constraint satu Event aktif, dan tidak lagi memiliki tabel `competitions`; seed menghasilkan satu kategori published, satu Event aktif, satu Event arsip, dan satu domain kategori. Migration kedua melaporkan tidak ada migration tertunda. Backend build, 13 unit test, 13 E2E test, seluruh audit frontend, parity tiga viewport, dan smoke tema 12 target lulus setelah penerapan.
- **Kendala**: Tidak ada kegagalan implementasi. Database E2E terisolasi sengaja tidak dihapus karena penghapusan database tidak diminta.
- **Tindak lanjut**: Commit/push/release/deployment memerlukan instruksi terpisah.

### 2026-08-10 — Sinkronisasi Dokumentasi Aktif Category→Event

- **Tanggal/Judul**: 2026-08-10 — Sinkronisasi Dokumentasi Aktif Category→Event
- **Permintaan**: Memperbaiki dokumentasi arsitektur lama dan memastikan seluruh progres restrukturisasi dicatat sesuai aturan prompt orientasi sesi.
- **Proses/Keputusan**: Mengaudit dokumentasi aktif terhadap entity, controller, migration, seed, Admin, Public Site, dan receipt pengujian terbaru. Mengganti penjelasan Organization → EventSite → Competition dengan Organization → CompetitionCategory → EventSite; mendokumentasikan satu subdomain per kategori, satu Event aktif, arsip otomatis, ownership settings/konten, endpoint baru, migration reset, serta batas role. Dokumen historis di `docs/archive/` dan rencana lama di `docs/superpowers/` tidak diubah agar tetap menjadi rekam sejarah.
- **File**:
  - `README.md`
  - `PROGRESS.md`
  - `apps/backend/README.md`
  - `docs/ARCHITECTURE.md`
  - `docs/DATA_MODEL.md`
  - `docs/ADMIN_SPEC.md`
  - `docs/TESTING.md`
  - `docs/OPERATIONS.md`
  - `docs/WORK_LOG.md`
- **Validasi**: Audit istilah/endpoint/tabel lama pada dokumentasi aktif tidak menemukan klaim aktif yang tertinggal; 10 dokumen aktif lulus Prettier; seluruh link Markdown lokal valid; pemeriksaan pola secret pada Work Log bersih; `git diff --check` lulus.
- **Kendala**: Auditor subagent eksternal gagal karena autentikasi provider `403`; audit lokal langsung tetap diselesaikan.
- **Tindak lanjut**: Pertahankan `PROGRESS.md` sebagai status/receipt dan tambahkan setiap tugas pengubah file ke `docs/WORK_LOG.md` pada sesi berikutnya.

### 2026-08-10 — Perapian Pengelolaan Dokumen Unduh dan Sinkronisasi Preview Tema

- **Tanggal/Judul**: 2026-08-10 — Perapian Pengelolaan Dokumen Unduh dan Sinkronisasi Preview Tema
- **Permintaan**: Menyamakan fallback Hero/Pemenang pada preview Identitas & Tema dengan Beranda serta menyederhanakan alur tambah dan daftar dokumen pada editor Unduh.
- **Proses/Keputusan**: Preview tema memakai baseline Beranda ketika data API belum tersedia. Form dokumen baru dipisahkan dari daftar dan ditampilkan melalui tombol tambah. Dokumen tersimpan memakai pola visual `repeat-row` Beranda: grip, judul dan banner dalam satu baris, tautan PDF di bawahnya, toggle tanpa pembungkus tambahan, dan ikon hapus. Konflik CSS antara layout grid lama `.download-current-document` dan flex `.repeat-row` dihilangkan dengan modifier khusus `.download-document-row`; toggle disambungkan ke endpoint pembaruan dokumen yang tersedia. Preview Unduh diperbaiki dengan memakai ID Event asli sebagai `competitionId`; ID sintetis `<event-id>:<index>` sebelumnya membuat resolver gagal menemukan sumber dokumen meskipun daftar Admin sudah terisi.
- **File**:
  - `apps/admin/editors/unduh/index.html`
  - `apps/admin/js/features/downloads/api.js`
  - `apps/admin/js/features/downloads/editor.js`
  - `apps/admin/js/shell/settings-editor.js`
  - `apps/public-site/assets/css/main.css`
  - `scripts/audit-download-relations.mjs`
  - `docs/WORK_LOG.md`
- **Validasi**: `npm run test:download-relations`, `npm run check:js`, dan `git diff --check` lulus. Inspeksi browser pada `http://localhost:4173/apps/admin/editors/unduh/` membuktikan row memakai flex, konten rata kiri, judul/banner sejajar, toggle tanpa border, tombol hapus berukuran konsisten, dan preview merender kartu dokumen dari sumber Event aktif.
- **Kendala**: Verifikasi browser memakai data fallback karena sesi autentikasi Admin backend tidak tersedia pada browser otomasi; struktur dan computed style row tetap tervalidasi.
- **Tindak lanjut**: Drag-and-drop urutan dokumen belum diaktifkan; tambahkan hanya jika persistensi urutan diminta secara eksplisit.

### 2026-08-10 — Perapian Empty State Kategori FAQ Admin

- **Tanggal/Judul**: 2026-08-10 — Perapian Empty State Kategori FAQ Admin
- **Permintaan**: Merapikan tampilan kondisi kosong kategori FAQ agar ikon, judul, deskripsi, spacing, dan hierarki visual tampil jelas serta elegan.
- **Proses/Keputusan**: Akar masalah ditemukan pada markup `.editor-empty` yang tidak memiliki aturan CSS. Empty state diberi class khusus, status semantik, pembungkus ikon dekoratif, dan styling terpusat yang membatasi ukuran ikon serta memisahkan judul dan deskripsi tanpa dekorasi berlebihan.
- **File**:
  - `apps/admin/js/features/faq/manager.js`
  - `apps/public-site/assets/css/main.css`
  - `scripts/audit-faq-relations.mjs`
  - `docs/WORK_LOG.md`
- **Validasi**: `npm run test:faq-relations`, `npm run check:js`, Prettier untuk file FAQ yang diubah, dan `git diff --check` lulus. Inspeksi browser pada editor FAQ dengan kategori kosong membuktikan layout grid terpusat, ikon 22×22 piksel dalam pembungkus 46×46 piksel, serta judul dan deskripsi berada pada baris terpisah.
- **Kendala**: Data fallback lokal berisi kategori default sehingga kondisi kosong disimulasikan pada DOM browser untuk inspeksi visual tanpa mengubah data aplikasi.
- **Tindak lanjut**: Tidak ada.

### 2026-08-10 — Pengaktifan Reorder Dokumen Unduh dan Akses Draf Publik Tanpa Syarat Published

- **Tanggal/Judul**: 2026-08-10 — Pengaktifan Reorder Dokumen Unduh dan Akses Draf Publik Tanpa Syarat Published
- **Permintaan**: Mengaktifkan fitur drag-and-drop / reorder dokumen pada editor Unduh Admin, menghubungkan renderer publik ke database backend, serta memastikan hasil pengeditan dan unggahan dokumen langsung tertampil pada halaman publik/preview tanpa harus dipublikasikan (_published_) terlebih dahulu.
- **Proses/Keputusan**:
  1. Mengimplementasikan Pointer Events (`setPointerCapture` dengan `touch-action: none`) pada grip dokumen editor Unduh Admin (`apps/admin/js/features/downloads/editor.js`), dilengkapi tombol **Naikkan / Turunkan** accessible dan navigasi keyboard `ArrowUp` / `ArrowDown`.
  2. Menambahkan `restoreDocumentOrder` pada `apps/admin/js/features/downloads/api.js` untuk memulihkan dan mempersistensikan urutan dokumen melalui endpoint `PUT /admin/events/:id/downloads`.
  3. Mengganti data static dummy OSN pada `apps/public-site/unduh/index.html` dan menyesuaikan `download-renderer.js` agar memuat data real-time via `TalentaPublic.load('download')`, dengan fallback otomatis ke data preview lokal jika koneksi API backend belum merespons.
  4. Mengatur `apps/admin/js/shell/router.js` agar routing tombol _Lihat halaman_ mengarah ke domain terverifikasi.
  5. Memperbarui `SITE_WHERE` pada `apps/backend/src/public/public.service.ts` dengan melepaskan syarat `category.publication_status = 'published'`, sehingga data draf pengeditan dokumen/kategori dari Admin langsung tertampil instan pada halaman publik/preview.
- **File**:
  - `apps/admin/editors/unduh/index.html`
  - `apps/admin/js/features/downloads/api.js`
  - `apps/admin/js/features/downloads/editor.js`
  - `apps/admin/js/shell/router.js`
  - `apps/backend/src/public/public.service.ts`
  - `apps/public-site/assets/css/main.css`
  - `apps/public-site/assets/js/download-renderer.js`
  - `apps/public-site/assets/js/public-api.js`
  - `apps/public-site/unduh/index.html`
  - `scripts/audit-download-relations.mjs`
  - `docs/WORK_LOG.md`
- **Validasi**: `npm run test:download-relations`, `npm run check:routes`, `npm run check:js`, `npm --prefix apps/backend run build`, Prettier format check, dan `git diff --check` lulus 100%. Screenshot Puppeteer dan verifikasi browser mengonfirmasi reorder grip interaktif dan rendering dokumen publik berjalan responsif.
- **Kendala**: Tidak ada.
- **Tindak lanjut**: Pekerjaan fitur Unduh dan sinkronisasi preview draf publik telah selesai seluruhnya.

### 2026-08-11 — Draf Terpadu, Preview Aman, dan Publikasi Atomik Event

- **Tanggal/Judul**: 2026-08-11 — Draf Terpadu, Preview Aman, dan Publikasi Atomik Event
- **Permintaan**: Memungkinkan Admin mengedit Event aktif tanpa unpublish, menyimpan satu draf untuk seluruh modul, melihat Public Site asli secara aman, lalu memublikasikan semua perubahan sekaligus.
- **Proses/Keputusan**: Tabel relasional existing dipertahankan sebagai workspace draf. Ditambahkan snapshot publik per Event, snapshot workspace untuk batalkan draf, allowlist media, token preview read-only 15 menit, cookie HttpOnly khusus media preview yang mendeteksi HTTPS langsung maupun reverse proxy, resolver publik berbasis snapshot, publish transaksi `REPEATABLE READ`, status/preview/publish/discard pada shell Admin, dan guard aktivasi Event/kategori. Seed source membangun ulang allowlist media dari snapshot tetapi seed tidak dijalankan. Publish/batalkan draf memakai konflik checksum; revision seragam untuk setiap endpoint simpan editor dinyatakan di luar initial scope sehingga penyimpanan bersamaan pada modul yang sama masih last-write-wins. Perubahan existing `docs/AI_SESSION_PROMPT.md` tidak disentuh. Setelah persetujuan operasional terpisah, migration non-destruktif ke-15 diterapkan pada database development utama tanpa menjalankan seed atau reset.
- **File**:
  - `apps/backend/src/entities/`, `apps/backend/src/database/`, `apps/backend/src/admin/`, `apps/backend/src/public/`, dan `apps/backend/src/media/`
  - `apps/backend/test/`
  - `apps/admin/`, `apps/public-site/`, dan `packages/shared/js/core/api-client.js`
  - `scripts/audit-event-publication.mjs`, `package.json`, `PROGRESS.md`, dan dokumentasi aktif terkait
  - `docs/superpowers/specs/2026-08-11-event-draft-preview-publication-design.md`
  - `docs/superpowers/plans/2026-08-11-event-draft-preview-publication.md`
- **Validasi**: Backend build lulus; 9 suite/24 unit test lulus; audit draf/publikasi, route, JavaScript, tema, dialog, Category→Event, Unduh, Pemenang, Arsip, dan FAQ lulus; `git diff --check` dan format file scope dijalankan. Ledger database development terverifikasi 15/15. Uji browser Puppeteer membuktikan login Admin, public `404` untuk kategori unpublished, preview workspace valid dengan fragment dibersihkan dan banner draf, publish snapshot versi 1, allowlist tiga media, deteksi modul Pengaturan berubah, serta discard mengembalikan workspace ke kondisi clean.
- **Kendala**: Suite E2E Jest tetap tidak dijalankan karena environment hanya menunjuk database development utama `talenta_prestasi`, sedangkan suite tersebut mensyaratkan database disposable. Tiga subagent read-only gagal karena provider eksternal `403/429`; implementasi dan validasi lokal dilanjutkan di main session.
- **Tindak lanjut**: Siapkan database E2E disposable untuk menjalankan suite Jest draf-preview-publish tanpa memengaruhi data development utama.

### 2026-08-13 — Perbaikan Logika Kronologis Arsip, Pemenang Sebelumnya, dan Error Draf FAQ

- **Tanggal/Judul**: 2026-08-13 — Perbaikan Logika Kronologis Arsip, Pemenang Sebelumnya, dan Error Draf FAQ
- **Permintaan**:
  1. Memperbaiki aturan arsip agar event tahun/batch lebih tinggi (misal 2027) tidak menjadi arsip bagi event tahun/batch lebih rendah (misal 2026).
  2. Menerapkan penamaan event terpadu (`Nama Kategori + Tahun + Batch`) secara konsisten di seluruh kartu dan detail arsip & pemenang.
  3. Memastikan Pemenang Sebelumnya di CMS Admin dan Public Site diambil dari Event terdahulu secara kronologis.
  4. Menyembunyikan deskripsi di kartu daftar arsip halaman depan (`/arsip/`).
  5. Memperbaiki error simpan draf FAQ (`categories.0.id must be a UUID`) dan memberikan ID UUID v4 serta pesan error yang ramah.
  6. Mengotomatiskan pengelompokan SK Pemenang ke tab dokumen utama di halaman Unduh dan menambahkan indikator foto pemenang tersimpan di Admin.
  7. Memastikan item navbar publik dengan status `active: false` benar-benar disembunyikan (`display: none`).
- **Proses/Keputusan**:
  - Mengubah query SQL `archiveSnapshots` di `public.service.ts` dan filter frontend di `archive/api.js` serta `winners/api.js` dengan perbandingan kronologis ketat: `(event.period_year < current.period_year OR (event.period_year = current.period_year AND event.batch_number < current.batch_number))`.
  - Menerapkan helper `eventDisplayName` (`formatArchiveDisplayName`) pada `archive/manager.js` dan repository shared.
  - Memperbaiki `faq-repository.js` dengan `crypto.randomUUID()` dan memfilter ID non-UUID pada `faq/api.js`.
  - Memperbaiki `admin-content.service.ts` agar SK Pemenang otomatis menggunakan tab dokumen default/aktif.
  - Menambahkan tombol hapus foto dan indikator "Foto tersimpan" pada `winners/manager.js`.
  - Menambahkan `element.style.display = isHidden ? "none" : ""` pada `runtime.js` untuk menu navbar.
- **File**:
  - `apps/backend/src/public/public.service.ts`
  - `apps/backend/src/public/public.service.spec.ts`
  - `apps/backend/src/admin/admin-content.service.ts`
  - `apps/admin/js/features/archive/api.js`
  - `apps/admin/js/features/archive/manager.js`
  - `apps/admin/js/features/winners/api.js`
  - `apps/admin/js/features/winners/manager.js`
  - `apps/admin/js/features/faq/api.js`
  - `packages/shared/js/data/repositories/faq-repository.js`
  - `packages/shared/js/data/repositories/archive-repository.js`
  - `apps/public-site/assets/js/runtime.js`
  - `docs/WORK_LOG.md`
- **Validasi**:
  - Backend unit test: 9 suite / 26 test lulus (`npm test -- --runInBand`).
  - Backend E2E test: 3 suite / 13 test lulus (`npm run test:e2e -- --runInBand`).
  - Static checks: `npm run check:routes`, `npm run check:js`, `npm run check:theme`, `npm run test:event-publication` seluruhnya PASS.
  - Prettier formatting check lulus 100%.
  - Script browser parity `scripts/browser-home-hero-parity.mjs` PASS.
- **Kendala**: Tidak ada.
- **Tindak lanjut**: Pekerjaan perbaikan kronologi arsip, pemenang, FAQ, dan navbar telah tuntas dan tervalidasi.

  - `docs/SETUP_LOKAL.md`
  - `README.md`
  - `docs/WORK_LOG.md`

- **Validasi**: Memeriksa perintah terhadap script aktif, format Prettier, tautan Markdown lokal, pola credential/secret, dan `git diff --check`.
- **Kendala**: Tidak ada.
- **Tindak lanjut**: Rekan pengguna mengisi `.env` lokal sendiri dan tidak membagikan credential tersebut melalui Git atau laporan testing.

### 2026-08-11 — Pengamanan Artifact Lokal Pra-Push

- **Tanggal/Judul**: 2026-08-11 — Pengamanan Artifact Lokal Pra-Push
- **Permintaan**: Memastikan implementasi baru siap di-commit/push dan credential, database lokal, private key, dump, serta unggahan media tidak ikut Git.
- **Proses/Keputusan**: Mengaudit seluruh path tracked/untracked/ignored dan pola credential tanpa menampilkan nilainya. Aturan existing sudah melindungi `.env`, database Ruflo, dan cache lokal. Menambahkan ignore untuk SQLite/dump/backup, private key, dan isi `apps/backend/storage/uploads/`, sambil mempertahankan `.gitkeep` agar struktur direktori tetap tersedia setelah clone.
- **File**:
  - `.gitignore`
  - `docs/WORK_LOG.md`
- **Validasi**: Scan signature credential dan hardcoded secret pada file calon commit tidak menemukan secret nyata; tidak ada database/dump/private key untracked; tidak ada file di atas 5 MB; backend build, 9 suite/24 unit test, audit publikasi Event, dan `git diff --check` lulus. File implementasi baru terkonfirmasi masih untracked sehingga harus dimasukkan saat staging sebelum commit.
- **Kendala**: Tidak ada file yang di-stage, commit, atau push pada audit ini.
- **Tindak lanjut**: Review `git diff --staged` setelah staging dan sebelum commit/push.

### 2026-08-11 — Perbaikan URL Preview Admin pada Development Lokal

- **Tanggal/Judul**: 2026-08-11 — Perbaikan URL Preview Admin pada Development Lokal
- **Permintaan**: Mendiagnosis kegagalan **Lihat preview** saat Admin dijalankan secara lokal dan menentukan apakah tunnel Cloudflare wajib diaktifkan.
- **Proses/Keputusan**: Akar masalah berada pada pembentuk URL preview yang selalu memprioritaskan hostname kategori, termasuk ketika Admin dibuka melalui `localhost` atau `127.0.0.1`. Routing diperbaiki agar kedua hostname development tersebut tetap membuka Public Site pada origin lokal dengan query `site`; token preview tetap dikirim melalui fragment. Admin pada hostname nonlokal tetap memakai hostname kategori HTTPS yang telah divalidasi. Cloudflare tidak diperlukan untuk preview development lokal dan hanya diperlukan ketika sengaja menguji hostname publik.
- **File**:
  - `apps/admin/js/shell/router.js`
  - `scripts/audit-event-publication.mjs`
  - `docs/WORK_LOG.md`
- **Validasi**: Regresi audit publikasi terbukti gagal sebelum perbaikan lalu lulus setelah perbaikan. `npm run test:event-publication`, `npm run check:js`, `npm run check:routes`, build backend, dan `git diff --check` lulus. Uji browser melalui tombol **Lihat preview** membuktikan `localhost` serta `127.0.0.1` mempertahankan origin lokal, menambahkan `?site=osn`, dan membawa token pada fragment; simulasi hostname Admin nonlokal tetap memilih hostname kategori HTTPS. Public Site membersihkan fragment segera dan menampilkan pesan sesi berakhir ketika token uji sengaja tidak valid.
- **Kendala**: Chrome DevTools MCP tidak dapat terhubung karena browser tidak menyediakan `DevToolsActivePort`; verifikasi browser dilanjutkan dengan Puppeteer. Uji klik memakai token stub tanpa credential agar tidak mengungkap data sensitif; alur token nyata sebelumnya telah tervalidasi pada acceptance draf-preview-publish.
- **Tindak lanjut**: Tidak ada. Tunnel Cloudflare dijalankan hanya untuk pengujian domain publik, bukan untuk preview lokal.

### 2026-08-12 — Identitas Periode/Batch dan Siklus Draf Admin

- **Tanggal/Judul**: 2026-08-12 — Identitas Periode/Batch dan Siklus Draf Admin
- **Permintaan**: Mengganti periode berbasis slug acak, menyederhanakan pembuatan Event tahunan/batch, meredesain daftar Event dan badge, serta mengganti Reset template dengan **Urungkan edit**; menerapkan schema ke PostgreSQL lokal testing dan menguji UI seperti pengguna.
- **Proses/Keputusan**: Menambahkan `period_year`, batch server-allocated, catatan internal, dan `activated_at`; nama ajang Event mengikuti Kategori. Konflik Event kedua mengubah existing menjadi Gelombang 1 dan Event baru Gelombang 2 dalam transaksi setelah konfirmasi. Snapshot konten tetap immutable; resolver meng-overlay identitas operasional ketika batch berikutnya pernah diaktifkan. Dashboard memakai kartu aktif utama, grid arsip/persiapan, dan tiga badge. Action bar memisahkan revert/preview dari save/discard/publish; Pengaturan memuat ulang workspace tersimpan tanpa menyimpan template bawaan.
- **File**:
  - `apps/backend/src/database/migrations/1786672800000-AddEventPeriodIdentity.ts`, entity, Admin/Public service/controller, seed, unit test, dan E2E fixture
  - `apps/admin/index.html`, `apps/admin/js/shell/portal-dashboard.js`, `router.js`, `settings-editor.js`
  - `apps/public-site/assets/css/main.css`, `scripts/audit-admin-event-period-ux.mjs`, dan `package.json`
  - dokumentasi aktif, spesifikasi, rencana, `PROGRESS.md`, dan log ini
- **Validasi**: Migration database lokal lulus 16/16; seed idempotent dijalankan; backend build, 9 suite/26 unit test, 3 suite/13 E2E test, audit UX periode/publikasi/Category→Event, route, JavaScript, tema, serta `git diff --check` lulus. Puppeteer menguji create Event, batal/setuju konflik, publikasi/aktivasi, nama publik sebelum/sesudah aktivasi, detail arsip, Urungkan edit, badge, dan viewport 1440/768/390. Bug topbar terpotong, overlap mobile, dan slug arsip stale diperbaiki lalu diuji ulang.
- **Kendala**: Ruflo CLI gagal memuat metadata versi npm dan dua subagent read-only gagal autentikasi provider `403`; validasi lokal dilanjutkan. Seed/E2E masih menampilkan deprecation warning `pg` query bersamaan tanpa kegagalan test. Chrome DevTools tidak menemukan `DevToolsActivePort`; Puppeteer digunakan.
- **Tindak lanjut**: Commit, push, release, dan deployment tetap menunggu instruksi terpisah.

### 2026-08-12 — Penyelarasan Urungkan Edit pada Seluruh Editor

- **Tanggal/Judul**: 2026-08-12 — Penyelarasan Urungkan Edit pada Seluruh Editor
- **Permintaan**: Menuntaskan perilaku **Urungkan edit** agar konsisten pada Beranda, Unduh, FAQ, Pemenang, Arsip, Detail Arsip, dan Pengaturan tanpa memulihkan template atau menulis database.
- **Proses/Keputusan**: Setiap editor iframe sekarang mengekspos kontrak `window.TalentaEditor` untuk `save` dan `revert`. Revert memuat ulang modul aktif dari workspace backend tersimpan. Tombol Reset mandiri diganti menjadi **Urungkan edit** dan handler reset template dihapus dari editor. Audit source diperluas untuk mewajibkan kontrak setiap editor dan menolak pemanggilan helper reset template.
- **File**:
  - `apps/admin/index.html` dan enam halaman `apps/admin/editors/`
  - `apps/admin/js/features/home/editor.js`, `downloads/editor.js`, `faq/manager.js`, `winners/manager.js`, `archive/manager.js`, dan `archive/detail-editor.js`
  - `scripts/audit-admin-event-period-ux.mjs`
  - `docs/WORK_LOG.md`
- **Validasi**: Audit UX periode dan pemeriksaan sintaks 45 file JavaScript lulus. Browser Puppeteer membuktikan kontrak FAQ iframe tersedia, perubahan form yang belum disimpan kembali ke workspace tersimpan setelah konfirmasi **Urungkan edit**, dan **Batalkan draf** mengembalikan perubahan FAQ tersimpan ke snapshot publik. Viewport 768×1024 tidak memiliki overflow atau tombol action bar yang tumpang tindih.
- **Kendala**: Chrome DevTools tidak menemukan `DevToolsActivePort`; Puppeteer digunakan. Data tambahan dari acceptance periode sebelumnya tetap berada pada database lokal testing dan tidak dihapus.
- **Tindak lanjut**: Commit, push, release, dan deployment tetap menunggu instruksi terpisah.

### 2026-08-12 — Perapian Kartu Dashboard Event

- **Tanggal/Judul**: 2026-08-12 — Perapian Kartu Dashboard Event
- **Permintaan**: Memperbaiki kartu Event aktif yang memanjang ke bawah dan membuat daftar Event terlihat lebih ringkas serta profesional sesuai desain yang disetujui.
- **Proses/Keputusan**: Akar masalah berada pada container grid utama yang membagi kartu aktif, judul bagian, dan grid arsip sebagai item kolom terpisah. Ketiganya sekarang memakai lebar penuh. Kartu aktif memakai ringkasan horizontal dengan aksi di kanan pada desktop/tablet; kartu lain menghapus tinggi minimum berlebih; badge tetap membungkus mendatar. Pada mobile, ringkasan menumpuk secara terkontrol dan aksi tetap dalam satu baris tanpa overflow.
- **File**:
  - `apps/admin/js/shell/portal-dashboard.js`
  - `scripts/audit-admin-event-period-ux.mjs`
  - `docs/WORK_LOG.md`
- **Validasi**: Audit source menolak layout lama sebelum perbaikan. Audit UX periode, pemeriksaan JavaScript/route/tema, `git diff --check`, serta acceptance browser 1440×900, 768×1024, dan 390×844 dijalankan setelah perubahan.

### 2026-08-12 — Pengembalian Alignment Tombol Kelola Event pada Kartu Event

- **Tanggal/Judul**: 2026-08-12 — Pengembalian Alignment Tombol Kelola Event pada Kartu Event
- **Permintaan**: Mengembalikan posisi dan letak tombol "Kelola Event" serta opsi pada kartu Event (aktif dan periode sebelumnya) ke posisi semula (centered/stretch alignment), membatasi penyesuaian hanya untuk kartu Kategori Lomba.
- **Proses/Keputusan**:
  1. Mengubah `align-items: flex-end` kembali menjadi `align-items: center` pada `.event-card--active` dan `.event-card--compact` di `apps/admin/js/shell/portal-dashboard.js`.
  2. Mengubah `align-self: flex-end` pada `.event-card__buttons` kembali menjadi `align-self: stretch` sehingga posisi tombol "Kelola Event" dan menu opsi `•••` pada daftar Event kembali presisi dan simetris seperti semula.
- **File**:
  - `apps/admin/js/shell/portal-dashboard.js`
  - `docs/WORK_LOG.md`
- **Validasi**: Menjalankan `npm run test:event-period-ux`, `npm run check:routes`, `npm run check:js`, `npm run check:theme`, dan `npm run test:event-publication` (semua lulus 100%).
- **Kendala**: Tidak ada.
- **Tindak lanjut**: Commit, push, release, dan deployment tetap menunggu instruksi terpisah.

- **Kendala**: Chrome DevTools tidak menemukan `DevToolsActivePort`; acceptance browser menggunakan Puppeteer.
- **Tindak lanjut**: Commit, push, release, dan deployment tetap menunggu instruksi terpisah.

### 2026-08-12 — Penyesuaian Layout Header Action Buttons Portal Dashboard Admin

- **Tanggal/Judul**: 2026-08-12 — Penyesuaian Layout Header Action Buttons Portal Dashboard Admin
- **Permintaan**: Memisahkan posisi tombol "← Kembali ke Kategori" dan "+ Buat Event" dari flex container sejajar judul/deskripsi kategori, lalu meletakkannya di bawah blok judul dan deskripsi dengan tetap mempertahankan posisi rata kanan yang rapi.
- **Proses/Keputusan**: Mengubah `.event-dashboard__intro` di `apps/admin/js/shell/portal-dashboard.js` dari layout flex horizontal (`space-between`, `align-items: end`) menjadi layout flex vertical (`flex-direction: column`, `gap: 16px`), dan mengatur `.event-dashboard__intro-actions` agar menggunakan `justify-content: flex-end` sehingga tombol aksi berada di baris baru di bawah deskripsi dan rata ke sisi kanan.
- **File**:
  - `apps/admin/js/shell/portal-dashboard.js`
  - `docs/WORK_LOG.md`
- **Validasi**: Menjalankan `node scripts/audit-admin-event-period-ux.mjs`, `node scripts/validate-routes.mjs`, `node scripts/check-js.mjs`, `node scripts/audit-theme-sync.mjs`, dan `node scripts/audit-event-publication.mjs` (seluruhnya lulus 100%).
- **Kendala**: Tidak ada.
- **Tindak lanjut**: Commit, push, release, dan deployment tetap menunggu instruksi terpisah.

### 2026-08-12 — Optimasi Proporsi dan Ruang Kosong Kartu Kategori Portal Dashboard

- **Tanggal/Judul**: 2026-08-12 — Optimasi Proporsi dan Ruang Kosong Kartu Kategori Portal Dashboard
- **Permintaan**: Mengatasi ruang kosong (empty whitespace) vertikal berlebih pada kartu kategori/event yang memiliki perbedaan panjang deskripsi atau teks agar terlihat proporsional, rapi, dan profesional.
- **Proses/Keputusan**: Mengubah aturan `.event-card` pada file `apps/admin/js/shell/portal-dashboard.js` dengan menghapus constraint `min-height: 170px` yang kaku, menyesuaikan padding menjadi `22px 24px`, serta mengoptimalkan margin bottom pada heading & domain link (`margin-bottom: 10px` & `18px`). Dengan ini, tinggi kartu menyesuaikan isi konten secara natural tanpa menyisakan lubang/jarak kosong yang terlalu besar ketika teks deskripsi singkat, serta menambahkan efek hover halus (`border-color` & `box-shadow`) untuk kesan visual modern.
- **File**:
  - `apps/admin/js/shell/portal-dashboard.js`
  - `docs/WORK_LOG.md`
- **Validasi**: Menjalankan skrip validasi `node scripts/audit-admin-event-period-ux.mjs`, `node scripts/validate-routes.mjs`, `node scripts/check-js.mjs`, `node scripts/audit-theme-sync.mjs`, dan `node scripts/audit-event-publication.mjs` (seluruhnya PASS 100%).
- **Kendala**: Tidak ada.
- **Tindak lanjut**: Commit dan push lokal/remote tidak dilakukan sesuai batasan keamanan tanpa perintah langsung pengguna.

### 2026-08-12 — Redesign Kartu Kategori dan Area Aksi Dashboard

- **Tanggal/Judul**: 2026-08-12 — Redesign Kartu Kategori dan Area Aksi Dashboard
- **Permintaan**: Menghilangkan ruang kosong tidak seimbang pada kartu kategori dan menjaga tombol "Kembali ke Kategori" serta "Buat Event" tetap proporsional ketika judul kategori panjang.
- **Proses/Keputusan**: Daftar kategori diubah menjadi satu kolom dengan kartu horizontal adaptif: identitas kategori berada di kiri dan kelompok aksi mandiri berada di kanan. Aksi utama "Kelola Event" tetap terlihat, sedangkan publikasi/nonaktifkan dan hapus dipindahkan ke menu sekunder agar hierarki lebih bersih. Area aksi halaman diberi pemisah, dapat membungkus, dan tombol tidak menyusut atau berebut ruang dengan judul. Pada viewport sempit, kartu dan kelompok aksi kembali bertumpuk agar tidak overflow.
- **File**:
  - `apps/admin/js/shell/portal-dashboard.js`
  - `docs/WORK_LOG.md`
- **Validasi**: `node scripts/audit-admin-event-period-ux.mjs`, `node scripts/validate-routes.mjs`, `node scripts/check-js.mjs`, `node scripts/audit-theme-sync.mjs`, dan `node scripts/audit-event-publication.mjs` seluruhnya lulus. Inspeksi visual browser belum dijalankan karena Chrome DevTools tidak terhubung.
- **Kendala**: `git diff --check` awal menemukan trailing whitespace lama pada entri log baris 245; whitespace tersebut dibersihkan. Chrome DevTools tidak menemukan sesi Chrome aktif.
- **Tindak lanjut**: Commit, push, release, dan deployment tidak dilakukan tanpa instruksi langsung pengguna.

### 2026-08-12 — Pengembalian Kartu Dua Kolom dan Aksi Sejajar Judul

- **Tanggal/Judul**: 2026-08-12 — Pengembalian Kartu Dua Kolom dan Aksi Sejajar Judul
- **Permintaan**: Mengembalikan kartu Kategori Lomba menjadi dua kartu per baris tanpa badge, serta menempatkan tombol pembuatan dan navigasi di sisi kanan judul tanpa membiarkan tombol menyempit ketika judul panjang.
- **Proses/Keputusan**: Kartu kategori dikembalikan ke susunan dua kolom dan bentuk vertikal sebelumnya, termasuk tiga aksi langsung tanpa menu tambahan. Badge status pada kartu kategori dihapus. Header memakai baris khusus berisi area judul fleksibel dan kelompok tombol berukuran tetap; judul menggunakan pembungkusan teks sehingga judul yang turun baris, bukan tombol yang menyempit. Deskripsi tetap berada pada baris berikutnya. Pada layar hingga 560px, baris judul dan aksi ditumpuk agar tetap terbaca.
- **File**:
  - `apps/admin/js/shell/portal-dashboard.js`
  - `docs/WORK_LOG.md`
- **Validasi**: `node scripts/audit-admin-event-period-ux.mjs`, `node scripts/validate-routes.mjs`, `node scripts/check-js.mjs`, `node scripts/audit-theme-sync.mjs`, dan `node scripts/audit-event-publication.mjs` seluruhnya lulus setelah perubahan inti. Pemeriksaan final dijalankan kembali setelah penyelarasan struktur judul.
- **Kendala**: Inspeksi visual browser tidak dilakukan karena Chrome DevTools tidak terhubung.
- **Tindak lanjut**: Commit, push, release, dan deployment tidak dilakukan tanpa instruksi langsung pengguna.

### 2026-08-12 — Penyederhanaan Badge Kategori dan Jarak Eksternal Kartu Event

- **Tanggal/Judul**: 2026-08-12 — Penyederhanaan Badge Kategori dan Jarak Eksternal Kartu Event
- **Permintaan**: Mengembalikan badge pada kartu kategori dengan hanya dua istilah yang mudah dipahami serta memperbaiki jarak antara daftar kartu Event dan bagian di atasnya tanpa mengubah ruang isi kartu.
- **Proses/Keputusan**: Status kategori yang dipublikasikan ditampilkan sebagai badge "Dipublikasikan"; seluruh status internal selain itu dipetakan secara visual menjadi "Nonaktif" tanpa mengubah nilai atau alur backend. Elemen status dashboard yang kosong tidak lagi memiliki tinggi minimum maupun margin sehingga tidak menciptakan ruang vertikal semu sebelum grid kartu Event. Padding dan jarak konten di dalam kartu tidak diubah.
- **File**:
  - `apps/admin/js/shell/portal-dashboard.js`
  - `docs/WORK_LOG.md`
- **Validasi**: Audit UX, route, sintaks JavaScript, sinkronisasi tema, publikasi Event, dan format diff dijalankan setelah perubahan.
- **Kendala**: Inspeksi visual browser tidak dilakukan karena Chrome DevTools tidak terhubung.
- **Tindak lanjut**: Commit, push, release, dan deployment tidak dilakukan tanpa instruksi langsung pengguna.

### 2026-08-13 — Pengembalian Hierarki Visual Kartu Event

- **Tanggal/Judul**: 2026-08-13 — Pengembalian Hierarki Visual Kartu Event
- **Permintaan**: Mengembalikan kerapian kartu Event seperti tampilan sebelumnya, terutama kedekatan badge dengan tombol "Kelola Event" serta jarak judul, periode, dan catatan.
- **Proses/Keputusan**: Struktur kartu Event dipisahkan menjadi area konten di kiri dan area samping di kanan. Pada desktop, area samping menempatkan badge di sebelah kiri tombol aksi dalam satu baris dengan jarak 18 px seperti referensi visual, sedangkan area konten menetapkan jarak 6 px antara judul, periode, dan catatan. Aturan ini hanya diterapkan pada kartu Event sehingga kartu Kategori, badge Kategori, dan header aksi tidak berubah. Pada layar sempit, area samping menumpuk di bawah konten dan tetap rata kiri.
- **File**:
  - `apps/admin/js/shell/portal-dashboard.js`
  - `scripts/audit-admin-event-period-ux.mjs`
  - `docs/WORK_LOG.md`
- **Validasi**: Audit UX periode, route, sintaks JavaScript, sinkronisasi tema, dan publikasi Event lulus. Acceptance browser dengan data kartu representatif memastikan badge berada di kiri tombol aksi dengan jarak 18 px pada desktop, jarak antarbagian konten 6 px, dan tidak ada overflow horizontal. Pada viewport 390×844, badge dan aksi menumpuk dengan jarak 10 px. Audit UX diperluas untuk menjaga struktur area konten/samping kartu Event.
- **Kendala**: Chrome DevTools tetap tidak menemukan `DevToolsActivePort`; acceptance visual menggunakan Puppeteer pada server lokal yang sudah aktif di port 4173.
- **Tindak lanjut**: Commit, push, release, dan deployment tidak dilakukan tanpa instruksi langsung pengguna.

### 2026-08-13 — Perapian Identitas Kartu Arsip Otomatis

- **Tanggal/Judul**: 2026-08-13 — Perapian Identitas Kartu Arsip Otomatis
- **Permintaan**: Merapikan nama dan periode pada kartu Arsip agar tidak terasa menyatu dengan ikon serta menghapus keterangan "Event nonaktif" yang redundan karena kartu sudah berstatus Arsip.
- **Proses/Keputusan**: Ikon, identitas, dan aksi kini memakai tiga kolom yang jelas dengan jarak 16 px pada desktop. Nama dan periode dibungkus dalam blok identitas khusus; metadata memakai `periodYear`, `batchLabel`, dan `batchNumber` dari API sehingga contoh slug `2027-gelombang-1` tampil sebagai "Periode 2027 · Gelombang 1", dengan fallback ke slug untuk data lama. Badge "Arsip otomatis" dipertahankan sebagai satu-satunya penanda status. Empty state dan penjelasan editor menggunakan istilah "Event lama" agar tidak mengulang status teknis.
- **File**:
  - `apps/admin/editors/arsip/index.html`
  - `apps/admin/js/features/archive/manager.js`
  - `apps/public-site/assets/css/main.css`
  - `scripts/audit-admin-event-period-ux.mjs`
  - `docs/WORK_LOG.md`
- **Validasi**: Audit UX periode/Event, route, sintaks 45 file JavaScript, sinkronisasi tema, publikasi Event, dan `git diff --check` lulus. Acceptance Puppeteer pada desktop memastikan jarak ikon–identitas dan identitas–aksi masing-masing 16 px tanpa overflow. Pada viewport 390×844, layout memakai dua kolom 48 px dan `minmax(0, 1fr)`, jarak ikon–identitas 12 px, aksi menumpuk di bawah identitas, serta tidak terjadi overflow horizontal.
- **Kendala**: Chrome DevTools tidak menemukan `DevToolsActivePort`; acceptance visual dilakukan dengan Puppeteer pada server lokal yang sudah aktif di port 4173.
- **Tindak lanjut**: Commit, push, release, dan deployment tidak dilakukan tanpa instruksi langsung pengguna.

### 2026-08-10 — Standarisasi Styling Checkbox `.editor-check` Admin

- **Tanggal/Judul**: 2026-08-10 — Standarisasi Styling Checkbox `.editor-check` Admin
- **Permintaan**: Menyeragamkan seluruh tampilan checkbox bertipe `.editor-check` di Admin Panel (seperti _Tandai sebagai paket unggulan_, _Buka tautan di tab baru_, dll.) agar presisi dengan ukuran kotak 16×16px, font-size 13px, gap 8px rapat, dan tidak lagi terpisah oleh alignment global.
- **Proses/Keputusan**: Memperbarui aturan CSS `.editor-check` global di `apps/public-site/assets/css/main.css` menggunakan `inline-flex`, `justify-content: flex-start`, `align-items: center`, gap 8px, dan input checkbox 16×16px.
- **File**:
  - `apps/public-site/assets/css/main.css`
  - `docs/WORK_LOG.md`
- **Validasi**: Audit route, JS, Prettier format check, dan git diff check lulus 100%.
- **Kendala**: Tidak ada.
- **Tindak lanjut**: Tidak ada.
