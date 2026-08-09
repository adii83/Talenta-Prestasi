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
- **Tindak lanjut**: Tidak ada

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
