# Status Aktif Talenta Prestasi

## Status Produk

Implemented / maintenance. Restrukturisasi Kategori Lomba → Event/Periode telah diterapkan pada source code dan database development utama.

## Arsitektur Aktif

```text
Organization
└── CompetitionCategory (kategori lomba + slug/subdomain tetap)
    ├── EventSite aktif (periode yang tampil pada Public Site)
    └── EventSite nonaktif (arsip otomatis)
```

- Satu kategori memiliki paling banyak satu Event aktif.
- Domain, publikasi, logo, favicon, dan identitas penyelenggara dimiliki kategori.
- Tema, navigasi, konten, dokumen, pemenang, FAQ, dan pengaturan halaman dimiliki Event.
- Entity/tabel `competitions` dan relasi sumber arsip manual sudah dihapus.

## Area yang Telah Selesai

- Draf terpadu Event, snapshot publik atomik, preview aman 15 menit, dan allowlist media telah diimplementasikan.
- Identitas periode eksplisit (`period_year`), batch otomatis, aktivasi-time naming, dashboard aktif+arsip, badge status, dan **Urungkan edit** telah diimplementasikan; migration ke-16 sudah diterapkan pada database development lokal.
- Public Site responsif dan CMS Admin dua tingkat: Daftar Kategori → Daftar Event → Editor Event.
- NestJS API, PostgreSQL, autentikasi JWT, tenant/RBAC, audit, dan media lokal.
- CRUD/publikasi Kategori serta CRUD/aktivasi Event.
- Arsip otomatis dari Event nonaktif dalam kategori yang sama.
- Integrasi editor Beranda, Unduh, FAQ, Pemenang, Arsip, Pengaturan, dan renderer publik; seluruh editor memiliki kontrak **Urungkan edit** yang memuat workspace tersimpan tanpa reset template.
- Reset migration Category→Event dan seed lokal idempotent.
- Database development utama `talenta_prestasi` telah memakai schema baru.

## Bug Terbuka

- Simpan editor lintas Admin belum memakai revision workspace seragam; penyimpanan bersamaan pada modul yang sama masih last-write-wins. Publish dan batalkan draf sudah dilindungi checksum serta menolak perubahan aggregate yang stale dengan `409`.
- `npm run format:check` global masih menemukan 51 file lama/di luar scope yang belum mengikuti format Prettier. File Fase 5 yang disentuh telah lulus pemeriksaan format terfokus.

## Pekerjaan Aktif

- Maintenance dan acceptance visual/UX lanjutan oleh client.
- Commit, push, release, dan deployment belum dilakukan.

## Validasi Terakhir

Validasi source dan runtime periode Event terakhir dijalankan pada 13 Agustus 2026.

- **Database:** migration ke-16 `AddEventPeriodIdentity` diterapkan; ledger 16/16. Seed lokal idempotent menghasilkan tahun 2025/2026 eksplisit, satu Event aktif per Kategori aktif, snapshot publik, dan tidak ada identitas periode duplikat.
- **Backend:** build lulus; 9 suite/26 unit test dan 3 suite/13 E2E test lulus 100% pada PostgreSQL lokal testing (`npm test` & `npm run test:e2e`).
- **Frontend:** perbaikan kronologis arsip (tahun/batch lebih tua saja), penamaan terpadu event tahun+batch, perbaikan UUID draf FAQ, pengelompokan otomatis SK Pemenang ke tab dokumen utama, indikator foto pemenang tersimpan, serta penyembunyian navbar disabled `display: none` tervalidasi.
- **Browser:** Puppeteer dan script parity `scripts/browser-home-hero-parity.mjs` membuktikan seluruh section Beranda identik dengan Public Site pada desktop 1440px, tablet 768px, dan mobile 390px.
- **Keamanan:** viewer/tenant guard lulus E2E; upload yang belum direferensikan snapshot tetap `404`; media publik tetap memakai allowlist dan preview terotorisasi.

## Riwayat

- Log kerja lintas sesi: `docs/WORK_LOG.md`.
- Riwayat frontend lama: `docs/archive/FRONTEND_IMPLEMENTATION_HISTORY.md`.
- Riwayat backend lama: `docs/archive/BACKEND_IMPLEMENTATION_HISTORY.md`.
