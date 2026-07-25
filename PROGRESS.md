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

## Langkah Berikutnya
Integrasikan konfigurasi seluruh editor Beranda ke `index.html`, lalu lanjutkan Pengaturan Global yang belum lengkap. Teknologi backend dan deployment harus disepakati sebelum integrasi server.









