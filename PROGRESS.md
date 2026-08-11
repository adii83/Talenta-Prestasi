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

- Draf terpadu Event, snapshot publik atomik, preview aman 15 menit, dan allowlist media telah diimplementasikan; migration penambah schema sudah diterapkan pada database development utama.
- Public Site responsif dan CMS Admin dua tingkat: Daftar Kategori → Daftar Event → Editor Event.
- NestJS API, PostgreSQL, autentikasi JWT, tenant/RBAC, audit, dan media lokal.
- CRUD/publikasi Kategori serta CRUD/aktivasi Event.
- Arsip otomatis dari Event nonaktif dalam kategori yang sama.
- Integrasi editor Beranda, Unduh, FAQ, Pemenang, Arsip, Pengaturan, dan renderer publik.
- Reset migration Category→Event dan seed lokal idempotent.
- Database development utama `talenta_prestasi` telah memakai schema baru.

## Bug Terbuka

- Simpan editor lintas Admin belum memakai revision workspace seragam; penyimpanan bersamaan pada modul yang sama masih last-write-wins. Publish dan batalkan draf sudah dilindungi checksum serta menolak perubahan aggregate yang stale dengan `409`.
- `npm run format:check` global masih menemukan 51 file lama/di luar scope yang belum mengikuti format Prettier. File Fase 5 yang disentuh telah lulus pemeriksaan format terfokus.

## Pekerjaan Aktif

- Siapkan database disposable lalu jalankan suite E2E Jest draf-preview-publish tanpa memengaruhi database development utama.
- Maintenance dan acceptance visual/UX oleh client.
- Commit, push, release, dan deployment belum dilakukan.

## Validasi Terakhir

Validasi source dan runtime draf/preview/publikasi terakhir dijalankan pada 11 Agustus 2026.

- **Database:** migration ke-15 non-destruktif telah diterapkan pada `talenta_prestasi`; ledger 15/15, tabel `event_publications` serta `event_publication_assets` aktif, data existing tidak direset, dan Event aktif memiliki snapshot versi 1 dengan tiga asset publik terdaftar.
- **Backend:** build lulus; 9 suite/24 unit test lulus. Suite E2E Jest belum dijalankan karena environment hanya menunjuk database development utama, bukan database disposable.
- **Frontend:** 13 canonical route dan 45 file JavaScript valid; sinkronisasi tema 6 editor Admin + 6 halaman publik lulus; audit dialog, Category→Event, Unduh, Pemenang, Arsip, FAQ, serta kontrak draf/publikasi lulus.
- **Browser:** Puppeteer membuktikan login Admin, kategori unpublished tetap `404` untuk pengunjung, preview draf memakai workspace Event yang tepat, fragment token dibersihkan, banner preview tampil, publish membuat snapshot, perubahan berikutnya berstatus draf, dan discard memulihkan workspace clean. Parity Beranda tiga viewport dan smoke tema 12 target juga lulus dari receipt sebelumnya.
- **Keamanan:** viewer ditolak pada mutasi konten; tenant lain ditolak; media memakai allowlist snapshot/otorisasi preview; resolver publik hanya memilih Event aktif dan operasional.

## Riwayat

- Log kerja lintas sesi: `docs/WORK_LOG.md`.
- Riwayat frontend lama: `docs/archive/FRONTEND_IMPLEMENTATION_HISTORY.md`.
- Riwayat backend lama: `docs/archive/BACKEND_IMPLEMENTATION_HISTORY.md`.
