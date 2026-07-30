# Progres Platform Ajang Talenta

> **WAJIB DIBACA:** AI/developer harus membaca `README.md` dan dokumen ini sebelum mengubah proyek. Setelah bekerja, perbarui status, riwayat perubahan, berkas terkait, hasil pengujian, dan langkah berikutnya.

## Tujuan Akhir

Satu platform kompetisi multi-event. Setiap event memiliki subdomain, identitas, tema, konten, dan modul publik sendiri, tetapi dikelola melalui satu CMS.

## Pembagian Area

1. **Template publik:** `apps/template/`, sebagai source of truth tampilan event.
2. **Panel Admin:** `apps/admin/`, sebagai CMS pengelola data dan preview Template.
3. **Shared:** `packages/shared/`, sebagai kontrak route, storage, database dummy,
   dan repository lintas aplikasi.

Pendaftaran dan dashboard peserta berada pada website eksternal dan tidak termasuk
scope repository ini.

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

- Template publik responsif untuk Beranda, Unduh, Pemenang, Arsip, Detail Arsip,
  dan FAQ.
- Shell Admin dan editor terstruktur untuk Pengaturan Global serta seluruh halaman.
- Database dummy, repository bersama, CRUD demo, Simpan/Reset, live sync, dan
  preview responsif berbasis design system Template.
- Sinkronisasi tema global ke seluruh halaman Template dan preview Admin.
- Validator route, sintaks, format, kontrak tema, serta audit browser tema.

### Belum Dibuat

- Backend, database, autentikasi, API, dan subdomain nyata.
- Upload file server dan penyimpanan media produksi.
- Test end-to-end browser untuk seluruh operasi CRUD dan seluruh kombinasi konten;
  audit browser otomatis saat ini khusus paritas tema.

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
- Berkas: `README.md`, `PROGRESS.md`, `docs/ADMIN_SPEC.md`, `admin.html`, `assets/css/main.css`, `assets/js/features/admin-shell/settings-editor.js`.

### 25 Juli 2026 — Arsitektur Editor Per Halaman

- Membagi pengaturan menjadi Global dan Kelola Halaman.
- Menetapkan editor Beranda berurutan dari Hero sampai Mitra.
- Membuat editor Hero lengkap dengan badge, tombol, gambar, toggle, dan preview.
- Berkas: `docs/ADMIN_SPEC.md`, `PROGRESS.md`, `admin.html`, `admin-beranda.html`, `assets/css/main.css`, `assets/js/features/home/editor.js`.

### 25 Juli 2026 — Penyelarasan Preview Hero

- Preview Hero memakai gradasi dinamis dan pola ornamen putih yang sama dengan template publik.
- Default tema disamakan dengan token template: primary `#1E4B8C`, accent `#C89B3C`, navy `#10233F`.
- Preview Hero membaca warna tersimpan dari Pengaturan Global.
- Menambahkan mode pratinjau Tablet di antara Desktop dan Mobile.
- Menyamakan warna label Hero menjadi putih 80% seperti template publik, bukan warna aksen.
- Berkas: `admin-beranda.html`, `assets/js/features/home/editor.js`, `assets/css/main.css`.

### 25 Juli 2026 — Editor Jadwal dan Ikon Kustom

- Membuat editor Jadwal lengkap untuk heading, kartu, status, dan deskripsi opsional.
- Menambahkan ikon Lucide atau upload PNG/JPG/WebP/SVG pada kartu Jadwal.
- Menambahkan sistem ikon upload yang sama pada kedua tombol Hero.
- Menambahkan preview Jadwal desktop, tablet, dan mobile.
- Menambahkan migrasi konfigurasi Hero lama ke struktur Hero dan Jadwal baru.
- Berkas: `admin-beranda.html`, `assets/js/features/home/editor.js`, `assets/css/main.css`, `docs/ADMIN_SPEC.md`, `PROGRESS.md`.

### 25 Juli 2026 — Editor Biaya Pendaftaran

- Membuat editor Biaya dengan varian Fokus Tunggal dan Paket Harga.
- Menambahkan CRUD paket, promo, harga lama, paket unggulan, fasilitas, dan tombol opsional.
- Menggunakan sistem ikon library/upload yang sama.
- Preview mengambil navy, primary, dan accent dari tema global serta mempertahankan ornamen template.
- Menambahkan preview desktop, tablet, dan mobile.
- Berkas: `admin-beranda.html`, `assets/js/features/home/pricing-editor.js`, `assets/js/features/home/editor.js`, `assets/css/main.css`, `docs/ADMIN_SPEC.md`, `PROGRESS.md`.

### 25 Juli 2026 — Editor Benefit

- Membuat editor heading dan kartu Benefit dinamis.
- Menambahkan background putih/soft, alignment heading, dan tiga varian kartu.
- Menambahkan label, unggulan, URL opsional, serta ikon library/upload per kartu.
- Menambahkan preview desktop, tablet, dan mobile yang mengikuti tema global.
- Menyamakan grid Benefit mobile menjadi dua kolom (2:2) seperti template publik.
- Berkas: `admin-beranda.html`, `assets/js/features/home/benefit-editor.js`, `assets/js/features/home/editor.js`, `assets/css/main.css`, `docs/ADMIN_SPEC.md`, `PROGRESS.md`.

### 25 Juli 2026 — Editor Highlight Pemenang

- Membuat editor Highlight dengan default nonaktif.
- Menambahkan simulasi mode otomatis/manual, filter kategori, jumlah, dan metadata.
- Menambahkan background navy/soft, kartu standard/compact, foto fallback inisial, dan tombol berkustom ikon.
- Preview memakai Data Demo sementara; produksi akan mengambil data dari Manajemen Pemenang.
- Berkas: `admin-beranda.html`, `assets/js/features/home/winner-highlight-editor.js`, `assets/js/features/home/editor.js`, `assets/css/main.css`, `docs/ADMIN_SPEC.md`, `PROGRESS.md`.

### 25 Juli 2026 — Editor Mitra & Partner

- Membuat editor section Mitra sebagai section terakhir Beranda.
- Menambahkan CRUD, upload logo, fallback nama, kategori, label, URL, dan status.
- Menambahkan varian sederhana/kartu/monokrom dan preset ukuran logo.
- Preview responsif: desktop maksimal lima, tablet tiga, mobile dua logo per baris.
- Seluruh enam section Beranda kini memiliki editor terstruktur.
- Berkas: `admin-beranda.html`, `assets/js/features/home/partner-editor.js`, `assets/js/features/home/editor.js`, `assets/css/main.css`, `docs/ADMIN_SPEC.md`, `PROGRESS.md`.

### 26 Juli 2026 — Editor Unduh Tahap 1

- Membuat `admin-unduh.html` dan menambahkan tautan Unduh pada sidebar admin.
- Membuat editor Header halaman dan CRUD periode/tab.
- Menambahkan status, tab default tunggal, reorder naik/turun, dan delete dengan konfirmasi.
- Menambahkan preview interaktif desktop/tablet/mobile dengan warna primary global.
- State demo terpisah pada `talenta_download_editor_v1`; dokumen masih data preview Tahap 1.
- Berkas: `admin-unduh.html`, `assets/js/features/downloads/editor.js`, `admin.html`, `admin-beranda.html`, `assets/css/main.css`, `docs/ADMIN_SPEC.md`, `PROGRESS.md`.

### 26 Juli 2026 — Koreksi Konsep Editor Unduh

- Mengoreksi tab Unduh menjadi lomba dari database Arsip, bukan periode/filter bebas.
- Membuat `mock-archive-database.js` sebagai sumber statis lomba dan dokumen terkait.
- Editor menyimpan referensi lomba, nama tab custom, status, urutan, default, visibilitas, dan override nama dokumen.
- Menghapus rencana pencarian/filter/upload file dari editor Unduh; file dikelola di Detail Arsip.
- Memperbaiki blank preview akibat variabel dibaca sebelum inisialisasi dan memakai state baru `talenta_download_editor_v2`.
- Menyamakan struktur sidebar admin Beranda dan Unduh.
- Berkas: `admin.html`, `admin-beranda.html`, `admin-unduh.html`, `assets/js/data/mock-archive-database.js`, `assets/js/features/downloads/editor.js`, `assets/css/main.css`, `docs/ADMIN_SPEC.md`, `PROGRESS.md`.

### 26 Juli 2026 — Penyelarasan Preview Unduh

- Menghapus background segmented-control dan bayangan tab preview yang tidak ada di template publik.
- Mengembalikan tab berbentuk pill individual: putih ber-border dan primary untuk tab aktif.
- Menyamakan jarak tab dengan `.unduh-tabs` publik dan memastikan heading mode kiri benar-benar rata kiri.
- Berkas: `assets/css/main.css`, `PROGRESS.md`.

### 26 Juli 2026 — Stabilitas Navigasi Admin

- Menyamakan markup sidebar Beranda dan Unduh termasuk footer akun.
- Menghapus atribut `class` ganda pada menu aktif.
- Menyamakan wrapper `page-editor-layout` agar lebar konten tidak meloncat.
- Menstabilkan dimensi shell admin dan scrollbar sidebar saat navigasi penuh antar-HTML.
- Berkas: `admin-beranda.html`, `admin-unduh.html`, `assets/css/main.css`, `PROGRESS.md`.

### 26 Juli 2026 — Router Panel Admin Persisten

- Memulihkan sidebar Beranda yang sempat terganti teks path lokal akibat kegagalan variabel PowerShell `$HOME`.
- Mengubah `admin.html` menjadi shell persisten dengan route `?page=settings|home|download`.
- Sidebar/topbar tidak dimuat ulang; editor halaman berjalan dalam embedded view dengan shell anak disembunyikan.
- Menambahkan History API, Back/Forward, direct URL, active menu, title, breadcrumb, dan public link dinamis.
- Berkas: `admin.html`, `admin-beranda.html`, `admin-unduh.html`, `assets/js/features/admin-shell/router.js`, `assets/css/main.css`, `PROGRESS.md`.

### 26 Juli 2026 — Perluasan Database Dummy Bersama

- Menambahkan lomba aktif `osn-2026` dengan status `active` beserta 5 dokumen dan 6 pemenang.
- Menambahkan `winnerCategories`, `skDocument`, `icon`, dan `description` pada seluruh lomba.
- Menambahkan pemenang dummy pada lomba arsip `osn-2025`, `osn-2024`, dan `matematika-2023`.
- Menambahkan helper `getActiveCompetition`, `getArchivedCompetitions`, `getCompetitionById`, `getAllWinners`.
- Memastikan kompatibilitas mundur: editor Unduh tetap membaca field yang sama.
- Database sekarang berisi 5 lomba, 14 dokumen, dan 17 pemenang.
- Berkas: `assets/js/data/mock-archive-database.js`, `PROGRESS.md`.

### 26 Juli 2026 — Manajemen Pemenang (Tahap 2)

- Membuat `admin-pemenang.html` dengan sidebar konsisten, embedded mode, dan outline struktur.
- Membuat `assets/js/features/winners/manager.js`: CRUD kategori juara, CRUD pemenang, upload foto max 2MB, label rank custom, reorder, toggle aktif/nonaktif, SK editor, preview responsif.
- Menambahkan CSS editor dan preview pemenang.
- Menambahkan route `winners` ke `admin-router.js`.
- Mengaktifkan link Pemenang di sidebar seluruh halaman admin.
- State disimpan pada `talenta_winner_manager_v1`.
- Berkas: `admin-pemenang.html`, `assets/js/features/winners/manager.js`, `assets/js/features/admin-shell/router.js`, `assets/css/main.css`, `admin.html`, `admin-beranda.html`, `admin-unduh.html`, `PROGRESS.md`.

### 26 Juli 2026 — Koreksi Preview Manajemen Pemenang

- Mengganti markup preview buatan dengan class template publik asli: `section__header`, `sk-banner`, `winner-group`, `champion-grid`, dan `champion-card`.
- Memperbaiki metadata yang sebelumnya berdempetan dengan line layout tersendiri.
- Menyamakan aksen card, foto, tipografi, banner SK, dan heading dengan `pemenang.html`.
- Preview tablet menjadi 2 kolom; mobile tetap 2 kolom sesuai pola responsif template.
- Berkas: `assets/js/features/winners/manager.js`, `assets/css/main.css`, `PROGRESS.md`.

### 26 Juli 2026 — Koreksi Responsif Preview Pemenang berdasarkan Template

- Menemukan kesalahan analisis selector: `.winner-group__grid` bukan grid yang dipakai `pemenang.html`; template memakai `.champion-grid` dengan `auto-fill minmax(200px, 1fr)`.
- Mobile dikoreksi menjadi 1 card per baris, bukan 2.
- Tablet kembali mengikuti auto-fill asli, bukan dipaksa 2 kolom.
- Ukuran H1, SK banner, foto, rank, nama, sekolah, dan metadata disamakan dengan nilai CSS template asli pada setiap simulasi perangkat.
- Berkas: `assets/css/main.css`, `PROGRESS.md`.

### 26 Juli 2026 — Editor Tampilan Halaman Pemenang (Tahap 3)

- Menambahkan status halaman, eyebrow, judul, deskripsi, dan perataan heading.
- Menambahkan toggle SK banner dan 6 kontrol metadata card (foto, sekolah, no. ujian, kecamatan, kabupaten, provinsi).
- Menambahkan section Pemenang Sebelumnya yang otomatis membaca lomba published dari database Arsip.
- Judul section, teks aksi `Lihat Pemenang`, jumlah card, dan status section dapat diedit.
- Preview sekarang mencakup keseluruhan halaman dan menggunakan card Arsip asli (`lomba-card`).
- Konfigurasi tampilan disimpan pada `talenta_winner_page_v1`, terpisah dari data pemenang.
- Berkas: `admin-pemenang.html`, `assets/js/features/winners/manager.js`, `assets/css/main.css`, `PROGRESS.md`.

### 26 Juli 2026 — Integrasi Highlight Pemenang Beranda (Tahap 4)

- Menghapus `DEMO_WINNERS` hardcode dari editor Highlight Pemenang.
- Highlight kini membaca lomba aktif dari database dummy dan override `talenta_winner_manager_v1` dari Manajemen Pemenang.
- Filter kategori dinamis mengikuti kategori juara custom admin, bukan SD/SMP/SMA hardcode.
- Mode otomatis mengikuti urutan kategori dan pemenang; mode manual memilih pemenang dari data pusat.
- Foto, rank custom, sekolah, provinsi, dan no. ujian langsung ikut dari Manajemen Pemenang.
- Menambahkan sinkronisasi event `storage` untuk perubahan dari tab admin lain.
- Memuat `mock-archive-database.js` sebelum seluruh editor Beranda.
- Berkas: `admin-beranda.html`, `assets/js/features/home/winner-highlight-editor.js`, `PROGRESS.md`.

### 26 Juli 2026 — Koreksi Relasi Highlight Beranda dan Responsif Card Arsip

- Menghapus mode pemilihan, jumlah tampil, filter kategori, variasi card, dan kontrol metadata dari Highlight Beranda karena semuanya menduplikasi sumber Pemenang.
- Highlight sekarang membawa seluruh kategori aktif beserta seluruh pemenang aktif dalam urutan Manajemen Pemenang.
- Card Highlight memakai struktur `champion-card` yang sama dan mengikuti visibilitas metadata dari `talenta_winner_page_v1`.
- Mobile Highlight Pemenang memakai 1 champion card per baris sesuai `.champion-grid` template.
- Mengoreksi analisis card `Pemenang Ajang Talenta Sebelumnya`: karena memakai `.grid--3`, breakpoint <=768px menghasilkan 2 kolom dan tetap 2 kolom pada <=480px.
- Berkas: `admin-beranda.html`, `assets/js/features/home/winner-highlight-editor.js`, `assets/css/main.css`, `PROGRESS.md`.

### 27 Juli 2026 — Manajemen dan Preview Halaman Arsip

- Membuat `admin-arsip.html` dan `assets/js/features/archive/manager.js`.
- Arsip membaca lomba published dari `MOCK_ARCHIVE_DATABASE`, dengan override lokal `talenta_archive_manager_v1`.
- Menambahkan tambah/edit/hapus/reorder/toggle lomba tanpa memisahkan dokumen dan pemenang dari objek lombanya.
- Menambahkan editor status halaman, eyebrow, judul, deskripsi, alignment, dan teks aksi card.
- Preview memakai class publik asli: `section__header`, `grid grid--3`, dan seluruh struktur `lomba-card`.
- Responsif berdasarkan template: desktop 3 kolom; tablet 2 kolom; mobile tetap 2 kolom. Ukuran thumbnail 180px, body 24px, title 17px, description/action 14px dipertahankan.
- Tidak menambahkan filter, search, pagination, atau kategori tahun karena tidak ada pada template.
- Menambahkan route `admin.html?page=archive` pada router persisten dan mengaktifkan menu Arsip.
- Validasi statis lulus: ID unik, CRUD/reorder/toggle, class publik, breakpoint, router, dan kontrak database Unduh.
- Berkas: `admin-arsip.html`, `assets/js/features/archive/manager.js`, `assets/js/features/admin-shell/router.js`, `admin.html`, child admin sidebars, `assets/css/main.css`, `PROGRESS.md`.

### 27 Juli 2026 — Editor Detail Arsip dan Penyatuan Data Lintas Halaman

- Membuat `assets/js/data/repositories/archive-repository.js` sebagai resolver tunggal data Arsip efektif.
  - Baseline tetap `MOCK_ARCHIVE_DATABASE`; override admin disimpan pada `talenta_archive_manager_v2`.
  - Migrasi otomatis dari v1 ke v2.
  - Helper: `getEffectiveArchivedCompetitions()`, `getEffectiveCompetitionById(id)`, `saveArchiveAdminState()`.
- Membuat `admin-arsip-detail.html` dan `assets/js/features/archive/detail-editor.js` untuk editor Detail Arsip per lomba.
  - Identitas dan banner (nama, deskripsi, gradient).
  - Section pemenang (toggle, eyebrow, judul, SK, metadata champion card).
  - Section dokumen (toggle, eyebrow, judul, hide/show per dokumen, label custom, pilihan SK).
  - Preview identik template: `.lomba-banner` (280/220/200px), `.sk-banner`, `.winner-section`, `.champion-grid` (auto-fill 200px / 1fr mobile), `.doc-card` (kolom di mobile), `.section--soft`.
- Menyambungkan `download-editor.js` ke resolver efektif (fungsi `archive()` dan `renderPicker()`).
- Menyambungkan `winner-manager.js` ke resolver efektif (`renderArchiveSources()` dan `archiveCards()`).
  - Card Pemenang Sebelumnya sekarang memakai URL `arsip-detail.html?id={id}#pemenang` dan gradient.
- Menambahkan `archive-data-store.js` pada seluruh halaman admin: Beranda, Unduh, Pemenang, Arsip, Detail Arsip.
- Validasi lintas halaman lulus: semua admin memuat data store; semua konsumen memakai resolver; class publik dan breakpoint identik template.
- Berkas: `assets/js/data/repositories/archive-repository.js`, `admin-arsip-detail.html`, `assets/js/features/archive/detail-editor.js`, `assets/js/features/archive/manager.js`, `assets/js/features/downloads/editor.js`, `assets/js/features/winners/manager.js`, `admin-beranda.html`, `admin-unduh.html`, `admin-pemenang.html`, `admin-arsip.html`, `assets/css/main.css`, `PROGRESS.md`.

### 27 Juli 2026 — Renderer Publik Arsip dan Detail

- Menjadikan halaman Arsip dan Detail Arsip dinamis dari resolver data efektif yang sama dengan editor admin.
- Menambahkan filtering data publik, fallback JSON rusak, clone aman, relasi SK, dan penanganan ID lomba tidak ditemukan.
- Menjaga data nonaktif tidak tampil pada halaman publik tanpa menghapus override admin.
- Berkas saat dibuat: `arsip.html`, `arsip-detail.html`, renderer publik Arsip, dan repository Arsip.

### 27 Juli 2026 — Manajemen dan Renderer FAQ

- Membuat state FAQ mandiri `talenta_faq_manager_v1` dengan baseline 3 kategori dan 11 pertanyaan.
- Menambahkan CRUD, reorder, toggle kategori/pertanyaan, pengaturan heading, dan preview responsif.
- Membuat renderer publik dan accordion aksesibel dengan satu pertanyaan terbuka per kategori.
- Menambahkan route `admin.html?page=faq` pada shell admin.

### 27 Juli 2026 — Konsolidasi Pengaturan Global dan Runtime Publik

- Menggabungkan Identitas, Tema, Navigasi, Kontak, WhatsApp, dan Footer ke schema v2 `talenta_event_settings_v1`.
- Menghapus modul website lama yang menduplikasi kontrol navigasi.
- Menambahkan toggle Unduh, Pemenang, Arsip, dan FAQ tanpa menghapus data editor.
- Runtime publik menerapkan identitas, warna tema, route guard, desktop/mobile navigation, footer, kontak, dan floating WhatsApp.
- Menambahkan migrasi schema v1 dan adaptive bottom navigation berdasarkan jumlah menu aktif.

### 27 Juli 2026 — Preview Navigasi, Footer, dan WhatsApp

- Membuat preview Navigasi serta Footer & WhatsApp untuk desktop, tablet, dan mobile.
- Interaksi preview tidak membuka halaman maupun WhatsApp.
- Menghapus menu Masuk dari navigasi publik dan mempertahankan Kontak Kami khusus desktop.
- Mengganti ikon WhatsApp dengan SVG resmi bergaya filled dan menyamakan ukuran/posisi dengan template.
- Memperbaiki reflow preview ketika toggle navigasi dinonaktifkan.

### 27 Juli 2026 — Action Reset dan Simpan Terpusat

- Menyamakan label `Reset` dan `Simpan perubahan` pada tujuh editor admin.
- Menambahkan reset Detail Arsip yang hanya menghapus override kompetisi aktif.
- Memindahkan kedua action ke topbar, tepat sebelum `Lihat halaman`, sesuai koreksi UX.
- Router mem-proxy action topbar ke tombol native setiap editor iframe sehingga handler lama tetap digunakan.
- Menyamakan tinggi dan geometri tombol pada desktop, tablet, dan mobile.

### 27 Juli 2026 — Struktur Halaman pada Dropdown Sidebar

- Menghapus panel Struktur internal agar canvas Beranda, Unduh, dan Pemenang lebih lebar.
- Membuat registry submenu untuk Pengaturan Global, Beranda, Unduh, Pemenang, Arsip, FAQ, dan Detail Arsip.
- Menambahkan smooth scroll lintas shell/iframe, active-section tracking, serta penutupan sidebar mobile setelah navigasi.
- Detail Arsip memakai struktur kontekstual di bawah Arsip; kembali ke Arsip selalu merender ulang struktur induk agar tidak stale.
- Struktur Beranda dikoreksi tepat enam section sampai Mitra & Partner.
- Memperbaiki target Highlight Pemenang menjadi `winner-highlight-editor` dan scroll Benefit/Mitra di bagian bawah.
- Memoles scrollbar sidebar menjadi tipis, transparan, hover-aware, dan menempel di tepi kanan tanpa menghilangkan fungsi scroll.

### 27 Juli 2026 — Restrukturisasi Arsitektur Feature-Based

- Mempertahankan seluruh HTML di root sebagai kontrak URL situs statis.
- Memindahkan implementasi ke `assets/`: CSS, images, core, data/repositories, shared runtime, dan feature modules.
- Mengelompokkan JavaScript berdasarkan fitur: admin-shell, home, downloads, winners, archive, dan FAQ.
- Memisahkan database dummy dari repository agar sumber data dapat diganti API tanpa menulis ulang editor/renderer.
- Memindahkan spesifikasi teknis ke `docs/` dan menambahkan dokumen arsitektur.
- Mempertahankan seluruh key localStorage dan fungsi global untuk kompatibilitas data demo.

## Status Implementasi Aktual

### Selesai

- Template publik responsif beserta runtime tema/navigasi/footer/WhatsApp.
- Shell admin persisten, editor Beranda lengkap, Unduh, Pemenang, Arsip, Detail Arsip, dan FAQ.
- CRUD demo dan renderer publik untuk Arsip serta FAQ.
- Relasi data efektif lintas Unduh, Pemenang, Beranda, Arsip, dan Detail Arsip.
- Preview responsif serta action Reset/Simpan terpusat.
- Navigasi struktur editor melalui dropdown sidebar.

### Belum Dibuat

- Backend, database produksi, autentikasi nyata, REST API, upload file server, dan subdomain nyata.
- Data masih menggunakan baseline JavaScript dan override localStorage untuk demonstrasi.
- Pengujian otomatis browser/end-to-end untuk seluruh alur admin dan publik.

## Langkah Berikutnya

1. Tentukan backend dan kontrak API multi-tenant.
2. Implementasikan adapter API sesuai kontrak repository saat ini.
3. Ganti localStorage dengan autentikasi dan penyimpanan server tanpa mengubah UI.
4. Tambahkan upload media/dokumen produksi serta validasi server.
5. Tambahkan test unit repository dan test end-to-end route publik/admin.

### 27 Juli 2026 — Koreksi Arsitektur Multi-App

- Mengoreksi restrukturisasi feature-only karena entry template, admin, dan portal masih terlihat bercampur.
- Memisahkan aplikasi secara fisik menjadi `apps/public`, `apps/admin`, dan `apps/portal`.
- Menempatkan design system, images, core utility, database dummy, dan repositories di `packages/shared`.
- Menempatkan seluruh editor admin di `apps/admin/editors` serta shell/feature logic di `apps/admin/js`.
- Menempatkan renderer/runtime template hanya di `apps/template/js`; tidak ada ketergantungan public terhadap admin.
- Mempertahankan URL lama dengan compatibility redirect tipis yang meneruskan query dan hash.
- Memperbarui iframe, History API, public links, Detail Arsip, dan relative asset paths sesuai batas aplikasi.

### 27 Juli 2026 — Finalisasi Root-Zero-HTML dan Canonical Routing

- Menghapus seluruh compatibility redirect HTML dari root; root sekarang memiliki nol file HTML.
- Mengubah route file-based menjadi directory-index routes untuk Public, Admin Editor, dan Portal.
- Menetapkan 15 canonical route melalui `TalentaPaths` yang sadar base path/subfolder deployment.
- Menambahkan builder URL berbasis `URL` dan `URLSearchParams` untuk query serta hash.
- Mengubah shell Admin, iframe editor, Arsip Detail, renderer publik, dan portal agar memakai route directory.
- Menambahkan registry route Admin terpusat dan validator route graph.
- Menambahkan `package.json` dengan script development, route validation, syntax validation, dan format validation.
- Memastikan tidak ada internal navigation yang bergantung pada filename `.html`.

### 28 Juli 2026 — Template sebagai Acuan Utama

- Mengganti nama aplikasi `apps/public/` menjadi `apps/template/` agar fungsi source of truth website lomba terlihat jelas.
- Mengumpulkan design system, gambar, runtime, dan renderer publik ke `apps/template/assets/`.
- Menyisakan `packages/shared/` hanya untuk route resolver, storage helper, database dummy, dan repository yang dipakai lintas aplikasi.
- Mengganti canonical route ID `public.*` menjadi `template.*` dan memperbarui semua tautan Admin, Portal, preview, query, serta hash.
- Menulis ulang README untuk menjelaskan tujuan proyek sebagai master template lomba berikutnya, batas Template–Admin–Portal, struktur aktual, alur penggunaan, dan arah multi-event.
- Menyelaraskan dokumentasi arsitektur dengan ownership dan dependency direction terbaru.

### 28 Juli 2026 — Penghapusan Portal Internal

- Menghapus seluruh `apps/portal/` karena pendaftaran, akun, dan dashboard peserta disediakan oleh website eksternal.
- Menghapus canonical route `portal.login` dan `portal.dashboard`.
- Menghapus route Portal dari validator; proyek sekarang memiliki 13 canonical routes Template dan Admin.
- Menghapus runtime login/register yang tidak lagi digunakan dari JavaScript Template.
- Menyelaraskan README dan ARCHITECTURE agar scope proyek hanya Template website lomba dan Admin CMS.
- Konten informasi peserta/pendaftaran pada Template tetap dipertahankan karena merupakan konten lomba; hanya aplikasi autentikasi internal yang dihapus.

### 28 Juli 2026 — Preview Identitas dan Tema Berbasis Template

- Mengganti preview Logo & Tema generik dengan potongan Navbar, Hero, dan kartu Pemenang yang memakai markup serta class Template asli.
- Menambahkan simulasi desktop, tablet, dan mobile yang mengikuti breakpoint Navbar, Hero, dan champion grid pada Template.
- Menampilkan logo unggahan pada preview identitas, preview Navigasi, dan preview Footer dengan fallback inisial nama event.
- Memperjelas Warna Utama sebagai identitas dominan dan mengganti label Warna Aksen menjadi Warna Sorotan untuk badge, peringkat, border foto, serta detail dekoratif.
- Menyinkronkan `--c-accent` dan `--c-gold` pada runtime agar warna sorotan konsisten pada seluruh komponen publik.
- Berkas: `apps/admin/index.html`, `apps/admin/js/shell/settings-editor.js`, `apps/template/assets/css/main.css`, `apps/template/assets/js/runtime.js`, `PROGRESS.md`.

### 28 Juli 2026 — Penghapusan Scrollbar Ganda Shell Admin

- Menghapus teks literal `` `n `` yang terselip setelah registry route pada shell Admin.
- Menghilangkan tambahan tinggi dokumen 26px yang memunculkan scrollbar halaman di paling kanan.
- Shell kembali tepat setinggi viewport, sedangkan konten editor tetap menggulir secara mandiri di dalam iframe.
- Berkas: `apps/admin/index.html`, `PROGRESS.md`.

### 28 Juli 2026 — Perbaikan Runtime Global Canonical dan Live Sync

- Mengganti deteksi halaman publik berbasis filename `*.html` dengan canonical directory routes dari `TalentaPaths`.
- Memperbaiki toggle Navigasi agar bekerja pada link relatif di seluruh halaman Template, termasuk adaptive item count bottom navigation.
- Memperbaiki route guard agar halaman nonaktif dialihkan ke canonical route Beranda.
- Menambahkan sinkronisasi pengaturan global pada tab yang sama melalui event `talenta:settings` dan lintas tab melalui event `storage`.
- Memperbarui logo, identitas, tema, footer, kontak, dan WhatsApp tanpa membentuk HTML dari input pengguna.
- Pengujian browser lulus untuk enam route, hide/show menu desktop dan mobile, redirect halaman nonaktif, serta sinkronisasi same-tab dan cross-tab.
- Berkas: `packages/shared/js/data/repositories/settings-repository.js`, `apps/template/assets/js/runtime.js`, `PROGRESS.md`.

### 28 Juli 2026 — Integrasi Editor Beranda ke Template Publik

- Menambahkan repository Beranda bersama dengan baseline dan normalisasi kompatibel untuk key lama `talenta_home_editor_v1`.
- Mengubah proses Simpan dan Reset editor menjadi satu transaksi untuk Hero, Jadwal, Biaya, Benefit, Highlight Pemenang, dan Mitra.
- Menambahkan renderer publik yang memakai class Template final, menerapkan tombol, ikon, gambar, toggle section, variasi konten, data pemenang terpusat, dan canonical route.
- Menambahkan sinkronisasi langsung melalui event `talenta:home` pada tab yang sama dan event `storage` lintas tab.
- Mempertahankan markup statis apa adanya saat belum ada override sehingga baseline desain klien tidak berubah.
- Memperbaiki karakter em dash yang sebelumnya tampil rusak pada judul dokumen, jadwal, dan deskripsi Benefit.
- Pengujian browser lulus pada desktop 1440 px, tablet 768 px, dan mobile 390 px tanpa overflow horizontal.
- Pengujian end-to-end lulus untuk Simpan Admin, sinkronisasi lintas tab, enam section tersimpan, toggle Biaya, multi-paket, Benefit, Highlight Pemenang, kategori Mitra, pemuatan logo, dan Reset.
- Validasi proyek lulus untuk 13 canonical routes dan 27 file JavaScript.
- Berkas: `packages/shared/js/data/repositories/home-repository.js`, `apps/admin/editors/beranda/index.html`, `apps/admin/js/features/home/*.js`, `apps/template/index.html`, `apps/template/assets/js/home-renderer.js`, `apps/template/assets/css/main.css`, `README.md`, `PROGRESS.md`.

### 28 Juli 2026 — Integrasi Seluruh Editor Konten ke Template

- Menambahkan repository bersama untuk halaman Unduh dan Pemenang tanpa mengganti key localStorage lama.
- Menghubungkan editor Unduh ke data dokumen Arsip efektif dan membentuk tab publik memakai komponen Template final.
- Menghubungkan Manajemen Pemenang ke halaman publik, termasuk SK, metadata pemenang, toggle tampilan, dan kartu pemenang Arsip.
- Menambahkan event live sync `talenta:download`, `talenta:winners`, `talenta:archive`, dan `talenta:faq`, beserta fallback event `storage` lintas tab.
- Membuat renderer Arsip, Detail Arsip, dan FAQ dapat merender ulang setelah Simpan/Reset tanpa reload manual.
- Memperbaiki fallback link Arsip/FAQ yang sebelumnya berpotensi mencetak ekspresi route sebagai teks literal.
- Membersihkan karakter encoding rusak pada judul halaman, separator metadata dokumen, router Admin, dan beberapa preview editor.
- Pengujian end-to-end lulus: Unduh 3 tab/6 dokumen, Pemenang 2 kategori/6 kartu dan 3 kartu Arsip, Arsip 4 kartu, serta FAQ 3 kategori/11 pertanyaan.
- Pengujian desktop dan mobile 390 px seluruh route konten lulus tanpa overflow horizontal dan tanpa error browser.
- Validasi proyek lulus untuk 13 canonical routes dan 31 file JavaScript.
- Berkas: `packages/shared/js/data/repositories/download-repository.js`, `packages/shared/js/data/repositories/winner-repository.js`, repository Arsip/FAQ, seluruh renderer Template, editor Unduh/Pemenang/Arsip, `README.md`, dan `PROGRESS.md`.

### 28 Juli 2026 — Audit Responsivitas Template Berbasis Data Dummy

- Menguji struktur Template pada desktop 1440 px, tablet 768 px, dan mobile 390 px: seluruh section Beranda ketika aktif/nonaktif, serta halaman Unduh, Pemenang, Arsip, dan FAQ ketika dinonaktifkan, tidak menghasilkan horizontal overflow.
- Memverifikasi token tema global pada seluruh halaman publik serta preview Identitas & Tema: warna utama dan warna sorotan diterapkan konsisten setelah disimpan.
- Memastikan baseline halaman publik tetap membaca data dari database dummy dan repository efektif; tidak ada sumber konten statis tambahan atau normalisasi teks konten khusus desain.
- Validasi proyek lulus: 13 canonical route dan 31 file JavaScript valid.
- Berkas: `packages/shared/js/data/repositories/download-repository.js`, `packages/shared/js/data/repositories/winner-repository.js`, `apps/template/assets/js/winner-renderer.js`, `apps/admin/js/features/winners/manager.js`, `PROGRESS.md`.

### 28 Juli 2026 — Paritas CTA Hero Tunggal

- Memperbaiki CTA Hero ketika salah satu tombol dinonaktifkan: satu tombol sekarang mempertahankan lebar sesuai kontennya, sama seperti preview editor.
- Dua tombol aktif tetap berbagi lebar secara seimbang seperti desain Template final.
- Berkas: `apps/template/assets/css/main.css`, `PROGRESS.md`.

### 28 Juli 2026 — Highlight Pemenang Setelah Hero

- Menempatkan Highlight Pemenang tepat setelah Hero saat section aktif.
- Menyelaraskan warna heading, eyebrow, deskripsi, dan kategori pada latar navy dengan token tema yang sama seperti preview.
- Memusatkan kelompok tiga kartu Pemenang pada desktop tanpa mengubah grid responsif tablet dan mobile.
- Berkas: `apps/template/assets/js/home-renderer.js`, `apps/template/assets/css/main.css`, `apps/admin/js/features/home/editor.js`, `PROGRESS.md`.

### 28 Juli 2026 — Urutan Editor Beranda Selaras

- Menjadikan Highlight Pemenang sebagai section nomor 02 di outline, sidebar, dan urutan canvas Admin, tepat setelah Hero.
- Menggeser nomor Jadwal, Biaya, dan Benefit agar urutan Admin selalu mencerminkan urutan halaman publik.
- Berkas: `apps/admin/editors/beranda/index.html`, `apps/admin/js/features/home/editor.js`, `apps/admin/js/shell/section-navigation.js`, `PROGRESS.md`.

### 28 Juli 2026 — Audit Highlight Pemenang

- Mengikat state Highlight ke transaksi Simpan Beranda agar toggle dan pengaturannya tetap tersimpan setelah reload.
- Menghapus tombol Lihat Semua Pemenang dari editor, preview, dan halaman publik.
- Background Navy menggunakan token global `--c-navy`; kartu memakai token primary serta aksen global, sedangkan opsi Soft memakai token latar soft global.
- Berkas: `apps/admin/js/features/home/editor.js`, `apps/admin/js/features/home/winner-highlight-editor.js`, `apps/admin/editors/beranda/index.html`, `apps/template/assets/js/home-renderer.js`, `PROGRESS.md`.

### 28 Juli 2026 — Posisi Kartu Preview Highlight

- Memusatkan kelompok kartu Pemenang pada preview Admin dengan constraint lebar yang sama seperti Highlight publik.
- Berkas: `apps/template/assets/css/main.css`, `PROGRESS.md`.

### 28 Juli 2026 — Sinkronisasi Status Highlight

- Memperbaiki label status toggle Highlight saat editor dimuat ulang agar selalu mencerminkan nilai tersimpan, bukan teks Nonaktif bawaan.
- Menyelaraskan state editor dengan nilai yang benar-benar dikembalikan repository setelah Simpan.
- Berkas: `apps/admin/js/features/home/editor.js`, `apps/admin/js/features/home/winner-highlight-editor.js`, `PROGRESS.md`.

### 28 Juli 2026 — Transaksi Simpan Beranda Eksplisit

- Menghubungkan tombol Simpan shell Admin langsung ke transaksi Beranda saat editor Beranda aktif, bukan hanya mengandalkan klik submit iframe generik.
- Editor lain tetap menggunakan fallback submit sebelumnya.
- Berkas: `apps/admin/js/features/home/editor.js`, `apps/admin/js/shell/router.js`, `PROGRESS.md`.

### 28 Juli 2026 — Akar Persistensi Highlight Pemenang

- Memperbaiki `loadState()` editor Beranda yang sebelumnya hanya mengembalikan Hero dan Jadwal, sehingga state Highlight yang tersimpan selalu hilang sebelum editor dimuat.
- Mempertahankan seluruh section dari repository, lalu hanya menormalisasi Hero dan Jadwal yang memerlukan kompatibilitas data lama.
- Berkas: `apps/admin/js/features/home/editor.js`, `packages/shared/js/data/repositories/home-repository.js`, `apps/admin/js/features/home/winner-highlight-editor.js`, `PROGRESS.md`.

### 28 Juli 2026 — Thumbnail Arsip Mengikuti Tema Global

- Menghapus gradient per-lomba dari thumbnail kartu Arsip; kartu publik, preview Arsip, dan kartu Arsip di halaman Pemenang kini memakai token warna global yang sama.
- Gradient lama tetap dipertahankan khusus untuk banner halaman detail tiap lomba dan diatur dari `Edit Detail`.
- Mengganti input nama ikon bebas dengan pilihan ikon terkurasi serta upload ikon PNG, JPG, WebP, atau SVG hingga 1 MB.
- Berkas: `apps/admin/js/features/archive/manager.js`, `packages/shared/js/data/repositories/archive-repository.js`, `apps/template/assets/js/archive-list.js`, `apps/template/assets/js/winner-renderer.js`, `apps/admin/js/features/winners/manager.js`, `apps/template/assets/css/main.css`, `PROGRESS.md`.

### 28 Juli 2026 — Finalisasi Paritas Tema Global

- Menetapkan schema Pengaturan Global versi 3 dengan default Warna Sorotan putih
  `#ffffff`; data schema v2 yang masih memakai emas default dimigrasikan otomatis,
  sedangkan warna custom pengguna tetap dipertahankan.
- Memusatkan penerapan warna melalui `applyGlobalThemeTokens()` untuk Template dan
  preview Admin. Helper menerapkan token primary, accent, gold, navy, dan token
  preview pada target yang diberikan.
- Menambahkan `subscribeGlobalSettings()` untuk merender ulang preview setelah event
  `talenta:settings` pada tab yang sama atau event `storage` lintas tab.
- Memastikan editor Beranda, Unduh, Pemenang, Arsip, Detail Arsip, dan FAQ memuat
  repository Pengaturan Global sebelum feature script dan tidak membaca
  `localStorage` tema secara langsung.
- Menjaga teks peringkat kartu Pemenang tetap emas melalui `--c-rank`, sebagai
  pengecualian desain yang tidak mengikuti Warna Sorotan global.
- Menyelaraskan halaman Pemenang dan Detail Arsip berlatar putih: ikon kategori,
  badge jumlah, garis kartu, dan avatar mengikuti Warna Utama; background tetap
  putih.
- Memperbaiki Preview Detail Arsip yang sebelumnya masih membawa border/avatar emas
  dari fallback lama.
- Menambahkan `scripts/audit-theme-sync.mjs` untuk memeriksa urutan script, pemakaian
  helper/subscription, migrasi schema, token, dan larangan pembacaan state lama.
- Menambahkan `scripts/browser-theme-audit.mjs` untuk menguji computed style pada
  enam halaman Template dan enam preview Admin menggunakan profil Edge sementara.
- Hasil final: `npm run check` lulus untuk 13 canonical route dan 31 file JavaScript;
  audit tema statis lulus untuk 6 editor Admin dan 6 halaman Template; audit browser
  lulus untuk 12 target, termasuk ikon/badge Detail Arsip mengikuti primary dan
  peringkat tetap emas.
- Berkas utama: `packages/shared/js/data/repositories/settings-repository.js`,
  `apps/template/assets/js/runtime.js`, seluruh HTML/feature preview Admin,
  `apps/template/assets/css/main.css`, renderer Pemenang/Arsip,
  `scripts/audit-theme-sync.mjs`, `scripts/browser-theme-audit.mjs`,
  `package.json`, `README.md`, `docs/ARCHITECTURE.md`, `docs/ADMIN_SPEC.md`, dan
  `PROGRESS.md`.

## Ringkasan Penutupan Frontend

Baseline frontend saat ini tetap memakai database dummy JavaScript dan repository
efektif dengan override `localStorage`; konten tidak diubah menjadi statis. Template
publik menjadi satu-satunya acuan markup, ukuran, breakpoint, warna, gradient, dan
komponen. Preview Admin memakai class/design system yang sama serta membaca data dan
tema dari repository bersama.

Alur utama yang telah selesai:

1. Pengaturan identitas, logo, navigasi, kontak, footer, WhatsApp, serta tema global.
2. Beranda dengan Hero, Highlight Pemenang tepat setelah Hero, Jadwal, Biaya,
   Benefit, dan Mitra.
3. Unduh yang mengambil dokumen dari Arsip tanpa menduplikasi data file.
4. Manajemen dan halaman Pemenang, termasuk konfigurasi tampilan serta metadata.
5. Arsip, Detail Arsip, dokumen, banner per-lomba, ikon library/upload, dan preview.
6. FAQ dengan kategori, pertanyaan, status, urutan, dan accordion publik.
7. Simpan/Reset terpusat, sinkronisasi same-tab/cross-tab, canonical routing,
   responsivitas desktop/tablet/mobile, dan pencegahan horizontal overflow.

Pekerjaan produksi yang masih di luar baseline frontend adalah backend/API,
database multi-tenant, autentikasi/otorisasi, upload media server, validasi serta
sanitasi server, subdomain nyata, dan suite end-to-end penuh untuk seluruh operasi
CRUD. Kontrak repository saat ini disiapkan agar sumber dummy/localStorage dapat
diganti adapter API tanpa mengubah struktur UI final.

### 30 Juli 2026 — Keluarga Warna Tema Global

- Menghapus fallback Navy biru statis dari penerapan tema global.
- Menurunkan Navy, shade gelap, shade terang, serta token RGB transparan langsung
  dari Warna Utama agar seluruh warna solid dan gradient mempertahankan hue pilihan.
- Menghubungkan Hero, Highlight Pemenang, Biaya, Footer, SK, avatar, thumbnail Arsip,
  dan preview Admin ke keluarga token tema yang sama.
- Menghapus stop gradient Hero dan beberapa gradient preview yang masih hardcoded
  biru.
- Memperluas audit tema statis dan browser menggunakan warna utama hijau untuk
  memastikan 12 target memakai Navy turunan dan tetap mempertahankan warna peringkat
  emas.
- Hasil final: `npm run check` dan `npm run test:theme-browser` lulus.
- Berkas utama: `packages/shared/js/data/repositories/settings-repository.js`,
  `apps/template/assets/css/main.css`, `apps/admin/js/features/home/editor.js`,
  script audit tema, dokumentasi arsitektur, dan dokumentasi Admin.

### 30 Juli 2026 — Kontras Badge, Navigasi Aktif, dan Tema Dua Warna

- Menghapus pemilih Warna Sorotan dari Pengaturan Global; nilai schema lama
  dinormalisasi menjadi putih agar tema hanya memadukan Warna Utama dan putih.
- Membuat badge jumlah pemenang transparan putih pada Highlight Beranda, setara
  dengan badge jenjang Hero; badge pada halaman putih dan editor Admin memakai tint
  Warna Utama dengan teks yang jelas.
- Memperbaiki penanda navigasi desktop/mobile berdasarkan route canonical, termasuk
  Detail Arsip yang sekarang menandai menu Arsip dan memberi `aria-current="page"`.
- Menghapus override gradient per lomba dari renderer serta editor Detail Arsip,
  sehingga banner paling atas selalu mengikuti gradient tema global.
- Mengubah teks peringkat dan aksen pemenang dari emas menjadi Warna Utama.
- Memperluas audit statis/browser untuk kontrak putih tetap, badge, navigasi aktif,
  serta banner Detail Arsip.

### 30 Juli 2026 — Paritas Hero Beranda Template dan Preview

- Menetapkan Template sebagai acuan tunggal Hero dengan memindahkan markup ke
  `buildHomeHeroMarkup()` yang dipakai bersama oleh renderer publik dan preview
  Admin.
- Menghapus ketergantungan preview pada struktur mini `home-preview__*` yang
  sebelumnya memiliki ukuran judul, deskripsi, badge, tombol, gambar, dan spacing
  berbeda dari Template.
- Membuat frame preview hanya mensimulasikan viewport desktop 1440 px, tablet 768
  px, dan mobile 390 px menggunakan class Hero publik yang sama.
- Menambahkan fitting proporsional berbasis `ResizeObserver`: kanvas desktop tetap
  dirender pada ukuran acuannya lalu diperkecil sebagai satu kesatuan sesuai lebar
  panel, tinggi frame dihitung ulang, dan scrollbar horizontal disembunyikan.
- Menambahkan `scripts/browser-home-hero-parity.mjs` dan perintah
  `npm run test:hero-parity` untuk membandingkan struktur, konten, computed style,
  serta lebar/tinggi elemen penting secara otomatis.
- Hasil: audit paritas Hero, audit tema 12 target, pemeriksaan route, sintaks,
  kontrak tema, formatting, dan `git diff --check` lulus.

### 30 Juli 2026 — Paritas Seluruh Section Beranda

- Memperluas sumber markup bersama dari Hero ke Highlight Pemenang, Jadwal
  Penting, Biaya Pendaftaran, Benefit, dan Mitra & Partner.
- Menghapus perbedaan struktur preview mini; setiap preview kini memakai class
  dan komponen Template publik yang sama.
- Menerapkan fitting proporsional tanpa scrollbar horizontal pada seluruh frame
  preview desktop, tablet, dan mobile.
- Memperluas audit browser menjadi `npm run test:home-parity`, yang membandingkan
  konten, computed style, geometri, skala, tinggi frame, dan overflow seluruh
  section pada viewport 1440 px, 768 px, dan 390 px.

### 30 Juli 2026 — Relasi dan Paritas Halaman Unduh

- Mengoreksi baseline tab “Lomba Sekarang” agar menunjuk lomba aktif `osn-2026`,
  bukan Arsip `osn-2025`.
- Memperlakukan `competitionId` sebagai foreign key unik dan membersihkan
  `hiddenDocumentIds` serta `documentLabelOverrides` yang bukan milik lomba
  terkait.
- Menyaring sumber Arsip nonaktif/tidak published dari halaman publik tanpa
  menghapus konfigurasi Admin, lalu menghitung ulang satu tab default publik.
- Menghapus baseline dan helper relasi duplikat dari editor Admin; kontrak relasi
  kini sepenuhnya berasal dari `download-repository.js`.
- Menetapkan `buildDownloadMarkup()` sebagai markup bersama Template dan Preview
  Admin untuk heading, tab, panel, dan kartu dokumen.
- Menerapkan preview proporsional tanpa scrollbar pada kanvas 1425 px, 753 px,
  dan 375 px, termasuk emulasi aturan responsif Template.
- Menambahkan `npm run test:download-relations` untuk mengaudit foreign key,
  kepemilikan dokumen, sanitasi, status publik, dan fallback default.
- Memperluas `npm run test:theme-browser` untuk membandingkan konten, computed
  style, geometri, skala, tinggi frame, dan overflow halaman Unduh pada desktop,
  tablet, dan mobile.

### 30 Juli 2026 — Relasi dan Paritas Halaman Pemenang

- Menetapkan `competitionId` Manajemen Pemenang sebagai foreign key lomba aktif;
  state milik lomba lain tidak lagi dapat diterapkan.
- Menambahkan normalisasi terpusat untuk ID kategori, ID pemenang, seluruh field
  pemenang, konfigurasi tampilan, URL SK, boolean, alignment, dan batas Arsip.
- Menolak kategori/pemenang tanpa ID serta duplikasi ID agar operasi backend tidak
  ambigu.
- Menyatukan filter publik kategori/pemenang aktif, Arsip published/aktif, dan
  fallback riwayat dalam `resolvePublicWinnerState()`.
- Menghubungkan Highlight Pemenang Beranda ke repository Pemenang yang sama dan
  menghapus jalur parsing state terpisah ketika repository tersedia.
- Menetapkan `buildWinnerPageMarkup()` sebagai markup bersama Template dan Preview
  Admin untuk heading, banner SK, kategori, kartu pemenang, serta kartu Arsip.
- Menerapkan kanvas preview proporsional 1425 px, 753 px, dan 375 px tanpa
  scrollbar serta dengan aturan responsif Template yang sama.
- Menambahkan `npm run test:winner-relations` dan memperluas audit browser untuk
  membandingkan konten, computed style, geometri, skala, tinggi frame, dan overflow
  seluruh halaman Pemenang pada desktop, tablet, serta mobile.

### 30 Juli 2026 — Relasi dan Paritas Arsip serta Detail Arsip

- Menetapkan Arsip sebagai owner lomba historis, dokumen, SK, kategori, dan
  pemenang yang dikonsumsi Unduh serta halaman Pemenang.
- Menambahkan normalisasi ID lomba, kategori, pemenang, dokumen, status, URL,
  metadata, konfigurasi Detail, hidden ID, dan label override.
- Memastikan SK `documentId`, hidden category/document, serta label override hanya
  dapat menunjuk data milik lomba yang sama.
- Memperbaiki penghapusan lomba baseline dengan tombstone
  `removedCompetitionIds`; data yang dihapus tidak kembali setelah reload dan
  langsung hilang dari Unduh serta riwayat Pemenang.
- Menyatukan resolver publik untuk status published/active/Detail aktif.
- Menetapkan `buildArchiveListMarkup()` sebagai markup bersama daftar Arsip dan
  `buildArchiveDetailMarkup()` sebagai markup bersama banner, breadcrumb, SK,
  pemenang, serta dokumen Detail Arsip.
- Menerapkan preview proporsional 1425 px, 753 px, dan 375 px tanpa scrollbar pada
  kedua editor.
- Menambahkan `npm run test:archive-relations` serta memperluas audit browser untuk
  computed style, geometri, konten, scaling, dan responsivitas Arsip/Detail Arsip.

### 30 Juli 2026 — Kontrak dan Paritas FAQ

- Memperketat FAQ sebagai aggregate mandiri Halaman → Kategori → Pertanyaan tanpa
  foreign key lomba.
- Menormalisasi schema versi 2, ID unik/aman, owner `categoryId`, alignment, array
  rusak, status publik, pertanyaan kosong, dan urutan data.
- Menyatukan markup halaman, markup accordion, empty-state, sanitasi, serta binder
  interaksi antara Template dan preview Admin.
- Menambahkan relasi aksesibel `aria-controls`, `aria-labelledby`,
  `aria-expanded`, serta region jawaban.
- Mengubah preview FAQ menjadi kanvas publik 1425/753/375 px yang diskalakan
  proporsional tanpa scrollbar.
- Menambahkan `test:faq-relations` dan perbandingan browser FAQ pada desktop,
  tablet, serta mobile.

### 30 Juli 2026 — Kejelasan Sumber Arsip, Unduh, dan Pemenang

- Mendokumentasikan perbedaan sumber: Arsip hanya lomba terdahulu, Unduh adalah
  subset lomba aktif/Arsip yang dipilih, dan Pemenang Sebelumnya hanya Arsip dengan
  pemenang aktif.
- Mengubah batas `Jumlah card` menjadi maksimum dinamis sesuai Arsip valid; input,
  state tersimpan, resolver publik, dan preview tidak dapat melewati jumlah sumber.
- Menambahkan ringkasan alasan Arsip tidak masuk Pemenang serta perbandingan tab
  Unduh terpilih terhadap seluruh sumber dokumen tersedia.
- Membedakan badge `Lomba aktif` dan `Dari Arsip` pada editor Unduh.
- Mengubah unggahan visual Arsip menjadi logo/maskot utama dengan ikon library
  sebagai fallback dan ukuran yang lebih terbaca pada editor/kartu publik.

### 30 Juli 2026 — Dialog Konfirmasi Admin

- Menginventaris 14 action konfirmasi pada Pengaturan Global, Beranda, Unduh,
  Pemenang, Arsip, Detail Arsip, dan FAQ.
- Menghapus seluruh penggunaan `confirm()`, `alert()`, dan `prompt()` native dari
  Admin.
- Menambahkan `adminConfirm()` berbasis `<dialog>` dengan varian danger, pesan dampak,
  label action spesifik, Escape/backdrop cancel, fokus awal Batal, dan pemulihan fokus.
- Mendelegasikan dialog editor iframe ke shell agar backdrop menutup seluruh
  workspace; mode standalone tetap didukung.
- Menambahkan layout mobile, reduced-motion, audit statis `test:admin-dialogs`, serta
  uji browser untuk cancel, confirm, delegasi iframe, fokus, backdrop, dan mobile.

### 30 Juli 2026 — Batas Kanvas Editor Arsip dan FAQ

- Menyamakan struktur Arsip, Detail Arsip, dan FAQ dengan pondasi
  `admin-workspace` → `page-editor-layout` → `page-editor-content` yang dipakai
  Beranda, Unduh, dan Pemenang.
- Memberikan batas lebar, margin tengah, serta padding samping responsif yang
  konsisten tanpa mengubah struktur markup publik di dalam preview.
- Memperluas audit browser pada 1600, 768, dan 390 px untuk memastikan posisi
  kiri/kanan serta lebar card sama dengan editor Pemenang dan tidak terjadi
  overflow horizontal.
- Mempertahankan audit paritas Template/preview beserta kanvas desain
  1425/753/375 px dan scaling proporsional tanpa scrollbar.

### 30 Juli 2026 — Kanvas dan Preview Pengaturan Global

- Menyamakan lebar Pengaturan Identitas & Tema dengan Kelola Halaman melalui
  pondasi `page-editor-layout` dan `page-editor-content` selebar maksimum 1280
  px.
- Mengubah preview Identitas & Tema, Navigasi, serta Footer & WhatsApp menjadi
  kanvas desain tetap 1425/753/375 px yang diskalakan proporsional.
- Menambahkan `ResizeObserver` bersama agar faktor scale dan tinggi frame selalu
  dihitung ulang setelah perubahan perangkat, data, atau lebar panel.
- Menghapus overflow `auto` dan aturan `max-width` lama yang mengecilkan desain
  Navigasi tablet menjadi 692 px.
- Menyamakan Highlight Pemenang pada preview Tema dengan class
  `home-winner-group` milik Template sehingga tiga card desktop berada di tengah
  dalam batas 720 px.
- Memperluas audit browser pada viewport 1600/768/390 px dan seluruh mode
  desktop/tablet/mobile untuk memvalidasi lebar desain, scale, tinggi frame,
  clipping, serta scrollbar horizontal.

### 30 Juli 2026 — Penyederhanaan Sidebar Admin

- Menghapus blok akun statis `Admin Pusat / Super Admin` dari sidebar shell dan
  seluruh editor standalone.
- Membersihkan style `admin-sidebar__footer` serta `admin-avatar` yang tidak lagi
  digunakan agar bagian bawah navigasi tidak menyisakan ruang atau separator.

### 30 Juli 2026 — Rancangan Database Produksi

- Menetapkan model tiga lapis Organisasi → Portal Event → Edisi Lomba agar data
  multi-tenant, subdomain, dan riwayat lomba tidak bercampur.
- Memetakan seluruh state Pengaturan Global, Beranda, Unduh, Pemenang, Arsip,
  Detail Arsip, serta FAQ ke tabel produksi tanpa menduplikasi dokumen/pemenang.
- Mendokumentasikan ERD inti, lomba, konten Beranda, dan FAQ beserta alur data
  lintas halaman.
- Menentukan foreign key lintas owner, constraint satu lomba aktif, soft delete,
  draft/publish, media object storage, audit log, optimistic locking, keamanan
  data pemenang, dan API publik/Admin.
- Menambahkan roadmap migrasi bertahap, kriteria penerimaan, serta daftar keputusan
  yang perlu disahkan client di `docs/DATABASE_DESIGN.md`.
