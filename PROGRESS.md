# Progres Platform Ajang Talenta

> **WAJIB DIBACA:** AI/developer harus membaca `README.md` dan dokumen ini sebelum mengubah proyek. Setelah bekerja, perbarui status, riwayat perubahan, berkas terkait, hasil pengujian, dan langkah berikutnya.

## Tujuan Akhir
Satu platform kompetisi multi-event. Setiap event memiliki subdomain, identitas, tema, konten, dan modul publik sendiri, tetapi dikelola melalui satu CMS.

## Pembagian Area
1. **Website publik:** informasi event.
2. **Dashboard kontingen:** `dashboard.html`, untuk sekolah/kontingen.
3. **Panel admin:** `admin.html`, untuk pengelola event dan konten.

Dashboard kontingen dan panel admin tidak boleh dicampur.

## Keputusan Tetap
- Data pemenang hanya melalui form, tanpa impor Excel.
- Form pemenang mendukung unggah foto.
- CMS dibagi menjadi Pengaturan Global dan Kelola Halaman.
- Editor halaman mengikuti urutan konten publik dari atas ke bawah.
- Modul/section/menu, tombol, badge, dan satu kartu data dapat dinonaktifkan tanpa menghapus data.
- Admin mengubah konten melalui komponen terstruktur, bukan CSS bebas, agar responsif.
- Penghapusan permanen adalah tindakan terpisah dan meminta konfirmasi.
- `localStorage` hanya untuk demonstrasi, bukan penyimpanan produksi.

## Status Saat Ini
### Selesai
- Template publik responsif dan dashboard kontingen statis.
- Fondasi dokumentasi proyek.
- Prototipe Pengaturan Event, toggle modul, dan pratinjau tema berbasis `localStorage`.

### Belum Dibuat
- Backend, database, autentikasi, API, dan subdomain nyata.
- CRUD konten, dokumen, pemenang, FAQ, dan arsip.
- Form pemenang dan penyimpanan foto.
- Integrasi konfigurasi admin ke halaman publik.

## Urutan Pekerjaan
1. Pengaturan event dan toggle modul.
2. Konten beranda.
3. Jadwal dan benefit.
4. Dokumen.
5. Pemenang melalui form dan unggah foto.
6. FAQ dan kontak.
7. Arsip.
8. Backend/database/subdomain.

## Riwayat Perubahan
### 25 Juli 2026 — Fondasi Admin
- Menetapkan dokumentasi permanen dan pemisahan tiga area.
- Menghapus rencana impor Excel pemenang.
- Membuat prototipe pengaturan identitas, tema, dan toggle modul.
- Berkas: `README.md`, `PROGRESS.md`, `ADMIN_SPEC.md`, `admin.html`, `css/style.css`, `js/admin.js`.

### 25 Juli 2026 — Arsitektur Editor Per Halaman
- Membagi pengaturan menjadi Global dan Kelola Halaman.
- Menetapkan editor Beranda berurutan dari Hero sampai Mitra.
- Membuat editor Hero lengkap dengan badge, tombol, gambar, toggle, dan preview.
- Berkas: `ADMIN_SPEC.md`, `PROGRESS.md`, `admin.html`, `admin-beranda.html`, `css/style.css`, `js/home-editor.js`.


### 25 Juli 2026 — Penyelarasan Preview Hero
- Preview Hero memakai gradasi dinamis dan pola ornamen putih yang sama dengan template publik.
- Default tema disamakan dengan token template: primary `#1E4B8C`, accent `#C89B3C`, navy `#10233F`.
- Preview Hero membaca warna tersimpan dari Pengaturan Global.
- Menambahkan mode pratinjau Tablet di antara Desktop dan Mobile.
- Menyamakan warna label Hero menjadi putih 80% seperti template publik, bukan warna aksen.
- Berkas: `admin-beranda.html`, `js/home-editor.js`, `css/style.css`.


### 25 Juli 2026 — Editor Jadwal dan Ikon Kustom
- Membuat editor Jadwal lengkap untuk heading, kartu, status, dan deskripsi opsional.
- Menambahkan ikon Lucide atau upload PNG/JPG/WebP/SVG pada kartu Jadwal.
- Menambahkan sistem ikon upload yang sama pada kedua tombol Hero.
- Menambahkan preview Jadwal desktop, tablet, dan mobile.
- Menambahkan migrasi konfigurasi Hero lama ke struktur Hero dan Jadwal baru.
- Berkas: `admin-beranda.html`, `js/home-editor.js`, `css/style.css`, `ADMIN_SPEC.md`, `PROGRESS.md`.


### 25 Juli 2026 — Editor Biaya Pendaftaran
- Membuat editor Biaya dengan varian Fokus Tunggal dan Paket Harga.
- Menambahkan CRUD paket, promo, harga lama, paket unggulan, fasilitas, dan tombol opsional.
- Menggunakan sistem ikon library/upload yang sama.
- Preview mengambil navy, primary, dan accent dari tema global serta mempertahankan ornamen template.
- Menambahkan preview desktop, tablet, dan mobile.
- Berkas: `admin-beranda.html`, `js/pricing-editor.js`, `js/home-editor.js`, `css/style.css`, `ADMIN_SPEC.md`, `PROGRESS.md`.


### 25 Juli 2026 — Editor Benefit
- Membuat editor heading dan kartu Benefit dinamis.
- Menambahkan background putih/soft, alignment heading, dan tiga varian kartu.
- Menambahkan label, unggulan, URL opsional, serta ikon library/upload per kartu.
- Menambahkan preview desktop, tablet, dan mobile yang mengikuti tema global.
- Menyamakan grid Benefit mobile menjadi dua kolom (2:2) seperti template publik.
- Berkas: `admin-beranda.html`, `js/benefit-editor.js`, `js/home-editor.js`, `css/style.css`, `ADMIN_SPEC.md`, `PROGRESS.md`.


### 25 Juli 2026 — Editor Highlight Pemenang
- Membuat editor Highlight dengan default nonaktif.
- Menambahkan simulasi mode otomatis/manual, filter kategori, jumlah, dan metadata.
- Menambahkan background navy/soft, kartu standard/compact, foto fallback inisial, dan tombol berkustom ikon.
- Preview memakai Data Demo sementara; produksi akan mengambil data dari Manajemen Pemenang.
- Berkas: `admin-beranda.html`, `js/winner-highlight-editor.js`, `js/home-editor.js`, `css/style.css`, `ADMIN_SPEC.md`, `PROGRESS.md`.


### 25 Juli 2026 — Editor Mitra & Partner
- Membuat editor section Mitra sebagai section terakhir Beranda.
- Menambahkan CRUD, upload logo, fallback nama, kategori, label, URL, dan status.
- Menambahkan varian sederhana/kartu/monokrom dan preset ukuran logo.
- Preview responsif: desktop maksimal lima, tablet tiga, mobile dua logo per baris.
- Seluruh enam section Beranda kini memiliki editor terstruktur.
- Berkas: `admin-beranda.html`, `js/partner-editor.js`, `js/home-editor.js`, `css/style.css`, `ADMIN_SPEC.md`, `PROGRESS.md`.


### 26 Juli 2026 — Editor Unduh Tahap 1
- Membuat `admin-unduh.html` dan menambahkan tautan Unduh pada sidebar admin.
- Membuat editor Header halaman dan CRUD periode/tab.
- Menambahkan status, tab default tunggal, reorder naik/turun, dan delete dengan konfirmasi.
- Menambahkan preview interaktif desktop/tablet/mobile dengan warna primary global.
- State demo terpisah pada `talenta_download_editor_v1`; dokumen masih data preview Tahap 1.
- Berkas: `admin-unduh.html`, `js/download-editor.js`, `admin.html`, `admin-beranda.html`, `css/style.css`, `ADMIN_SPEC.md`, `PROGRESS.md`.


### 26 Juli 2026 — Koreksi Konsep Editor Unduh
- Mengoreksi tab Unduh menjadi lomba dari database Arsip, bukan periode/filter bebas.
- Membuat `mock-archive-database.js` sebagai sumber statis lomba dan dokumen terkait.
- Editor menyimpan referensi lomba, nama tab custom, status, urutan, default, visibilitas, dan override nama dokumen.
- Menghapus rencana pencarian/filter/upload file dari editor Unduh; file dikelola di Detail Arsip.
- Memperbaiki blank preview akibat variabel dibaca sebelum inisialisasi dan memakai state baru `talenta_download_editor_v2`.
- Menyamakan struktur sidebar admin Beranda dan Unduh.
- Berkas: `admin.html`, `admin-beranda.html`, `admin-unduh.html`, `js/mock-archive-database.js`, `js/download-editor.js`, `css/style.css`, `ADMIN_SPEC.md`, `PROGRESS.md`.


### 26 Juli 2026 — Penyelarasan Preview Unduh
- Menghapus background segmented-control dan bayangan tab preview yang tidak ada di template publik.
- Mengembalikan tab berbentuk pill individual: putih ber-border dan primary untuk tab aktif.
- Menyamakan jarak tab dengan `.unduh-tabs` publik dan memastikan heading mode kiri benar-benar rata kiri.
- Berkas: `css/style.css`, `PROGRESS.md`.


### 26 Juli 2026 — Stabilitas Navigasi Admin
- Menyamakan markup sidebar Beranda dan Unduh termasuk footer akun.
- Menghapus atribut `class` ganda pada menu aktif.
- Menyamakan wrapper `page-editor-layout` agar lebar konten tidak meloncat.
- Menstabilkan dimensi shell admin dan scrollbar sidebar saat navigasi penuh antar-HTML.
- Berkas: `admin-beranda.html`, `admin-unduh.html`, `css/style.css`, `PROGRESS.md`.


### 26 Juli 2026 — Router Panel Admin Persisten
- Memulihkan sidebar Beranda yang sempat terganti teks path lokal akibat kegagalan variabel PowerShell `$HOME`.
- Mengubah `admin.html` menjadi shell persisten dengan route `?page=settings|home|download`.
- Sidebar/topbar tidak dimuat ulang; editor halaman berjalan dalam embedded view dengan shell anak disembunyikan.
- Menambahkan History API, Back/Forward, direct URL, active menu, title, breadcrumb, dan public link dinamis.
- Berkas: `admin.html`, `admin-beranda.html`, `admin-unduh.html`, `js/admin-router.js`, `css/style.css`, `PROGRESS.md`.


### 26 Juli 2026 — Perluasan Database Dummy Bersama
- Menambahkan lomba aktif `osn-2026` dengan status `active` beserta 5 dokumen dan 6 pemenang.
- Menambahkan `winnerCategories`, `skDocument`, `icon`, dan `description` pada seluruh lomba.
- Menambahkan pemenang dummy pada lomba arsip `osn-2025`, `osn-2024`, dan `matematika-2023`.
- Menambahkan helper `getActiveCompetition`, `getArchivedCompetitions`, `getCompetitionById`, `getAllWinners`.
- Memastikan kompatibilitas mundur: editor Unduh tetap membaca field yang sama.
- Database sekarang berisi 5 lomba, 14 dokumen, dan 17 pemenang.
- Berkas: `js/mock-archive-database.js`, `PROGRESS.md`.


### 26 Juli 2026 — Manajemen Pemenang (Tahap 2)
- Membuat `admin-pemenang.html` dengan sidebar konsisten, embedded mode, dan outline struktur.
- Membuat `js/winner-manager.js`: CRUD kategori juara, CRUD pemenang, upload foto max 2MB, label rank custom, reorder, toggle aktif/nonaktif, SK editor, preview responsif.
- Menambahkan CSS editor dan preview pemenang.
- Menambahkan route `winners` ke `admin-router.js`.
- Mengaktifkan link Pemenang di sidebar seluruh halaman admin.
- State disimpan pada `talenta_winner_manager_v1`.
- Berkas: `admin-pemenang.html`, `js/winner-manager.js`, `js/admin-router.js`, `css/style.css`, `admin.html`, `admin-beranda.html`, `admin-unduh.html`, `PROGRESS.md`.


### 26 Juli 2026 — Koreksi Preview Manajemen Pemenang
- Mengganti markup preview buatan dengan class template publik asli: `section__header`, `sk-banner`, `winner-group`, `champion-grid`, dan `champion-card`.
- Memperbaiki metadata yang sebelumnya berdempetan dengan line layout tersendiri.
- Menyamakan aksen card, foto, tipografi, banner SK, dan heading dengan `pemenang.html`.
- Preview tablet menjadi 2 kolom; mobile tetap 2 kolom sesuai pola responsif template.
- Berkas: `js/winner-manager.js`, `css/style.css`, `PROGRESS.md`.


### 26 Juli 2026 — Koreksi Responsif Preview Pemenang berdasarkan Template
- Menemukan kesalahan analisis selector: `.winner-group__grid` bukan grid yang dipakai `pemenang.html`; template memakai `.champion-grid` dengan `auto-fill minmax(200px, 1fr)`.
- Mobile dikoreksi menjadi 1 card per baris, bukan 2.
- Tablet kembali mengikuti auto-fill asli, bukan dipaksa 2 kolom.
- Ukuran H1, SK banner, foto, rank, nama, sekolah, dan metadata disamakan dengan nilai CSS template asli pada setiap simulasi perangkat.
- Berkas: `css/style.css`, `PROGRESS.md`.


### 26 Juli 2026 — Editor Tampilan Halaman Pemenang (Tahap 3)
- Menambahkan status halaman, eyebrow, judul, deskripsi, dan perataan heading.
- Menambahkan toggle SK banner dan 6 kontrol metadata card (foto, sekolah, no. ujian, kecamatan, kabupaten, provinsi).
- Menambahkan section Pemenang Sebelumnya yang otomatis membaca lomba published dari database Arsip.
- Judul section, teks aksi `Lihat Pemenang`, jumlah card, dan status section dapat diedit.
- Preview sekarang mencakup keseluruhan halaman dan menggunakan card Arsip asli (`lomba-card`).
- Konfigurasi tampilan disimpan pada `talenta_winner_page_v1`, terpisah dari data pemenang.
- Berkas: `admin-pemenang.html`, `js/winner-manager.js`, `css/style.css`, `PROGRESS.md`.


### 26 Juli 2026 — Integrasi Highlight Pemenang Beranda (Tahap 4)
- Menghapus `DEMO_WINNERS` hardcode dari editor Highlight Pemenang.
- Highlight kini membaca lomba aktif dari database dummy dan override `talenta_winner_manager_v1` dari Manajemen Pemenang.
- Filter kategori dinamis mengikuti kategori juara custom admin, bukan SD/SMP/SMA hardcode.
- Mode otomatis mengikuti urutan kategori dan pemenang; mode manual memilih pemenang dari data pusat.
- Foto, rank custom, sekolah, provinsi, dan no. ujian langsung ikut dari Manajemen Pemenang.
- Menambahkan sinkronisasi event `storage` untuk perubahan dari tab admin lain.
- Memuat `mock-archive-database.js` sebelum seluruh editor Beranda.
- Berkas: `admin-beranda.html`, `js/winner-highlight-editor.js`, `PROGRESS.md`.


### 26 Juli 2026 — Koreksi Relasi Highlight Beranda dan Responsif Card Arsip
- Menghapus mode pemilihan, jumlah tampil, filter kategori, variasi card, dan kontrol metadata dari Highlight Beranda karena semuanya menduplikasi sumber Pemenang.
- Highlight sekarang membawa seluruh kategori aktif beserta seluruh pemenang aktif dalam urutan Manajemen Pemenang.
- Card Highlight memakai struktur `champion-card` yang sama dan mengikuti visibilitas metadata dari `talenta_winner_page_v1`.
- Mobile Highlight Pemenang memakai 1 champion card per baris sesuai `.champion-grid` template.
- Mengoreksi analisis card `Pemenang Ajang Talenta Sebelumnya`: karena memakai `.grid--3`, breakpoint <=768px menghasilkan 2 kolom dan tetap 2 kolom pada <=480px.
- Berkas: `admin-beranda.html`, `js/winner-highlight-editor.js`, `css/style.css`, `PROGRESS.md`.

## Langkah Berikutnya
Tinjau alur lengkap Pemenang. Integrasi data yang sama ke halaman publik `pemenang.html` dan `index.html` tetap merupakan tahap public renderer berikutnya. Teknologi backend dan deployment harus disepakati sebelum integrasi server.





















