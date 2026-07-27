# Spesifikasi Panel Admin

Dokumen ini wajib dibaca bersama `README.md` dan `PROGRESS.md` sebelum mengubah CMS.

## Konsep Utama

Panel admin adalah **page builder terstruktur**. Admin dapat mengubah isi, gambar, ikon, tombol, dan visibilitas komponen tanpa coding. Posisi elemen tetap mengikuti template agar responsif pada desktop, tablet, dan mobile.

## Struktur Menu

### Pengaturan Global

Berlaku di seluruh halaman:

- **Identitas & Tema:** nama singkat, nama lengkap, logo, favicon, slug/subdomain, warna utama dan aksen.
- **Navigasi:** teks, URL, ikon mobile, urutan, dan status setiap menu.
- **Kontak & WhatsApp:** email, nomor, alamat, template pesan, dan tombol WhatsApp.
- **Footer:** identitas, deskripsi, kontak, copyright, dan visibilitas bagian.
- **SEO Global:** pola title, deskripsi default, dan gambar berbagi.

### Kelola Halaman

- Beranda
- Unduh
- Pemenang
- Arsip
- FAQ

Setiap halaman memiliki status, SEO halaman, section terurut, dan preview.

## Editor Beranda (Atas ke Bawah)

1. **Hero:** label, judul, deskripsi, gambar, badge, dan dua tombol.
2. **Jadwal Penting:** subjudul, judul, deskripsi, serta kartu jadwal.
3. **Biaya Pendaftaran:** subjudul, harga, keterangan, dan catatan.
4. **Benefit:** subjudul, judul, deskripsi, serta kartu benefit.
5. **Highlight Pemenang:** heading, jumlah/seleksi data, dan tombol menuju pemenang.
6. **Mitra & Partner:** heading dan daftar logo mitra.

Navbar dan footer tidak termasuk editor Beranda karena merupakan komponen Global.

## Kontrak Data Komponen

### Section

- `is_active`, `eyebrow`, `title`, `description`, `display_order`.

### Card atau Item

- `is_active`, `icon`/`image`, `title`, `description`/`value`, `display_order`.

### Tombol

- `is_active`, `label`, `url`, `icon`, `style`, `open_in_new_tab`.

Nonaktif menyembunyikan data tanpa menghapus. Hapus permanen adalah tindakan terpisah dengan konfirmasi.

## Hero Beranda

- Section dapat dinonaktifkan.
- Label, judul, deskripsi, gambar, dan alt text dapat diedit.
- Badge dapat ditambah, diedit, diurutkan, dan dinonaktifkan.
- Tombol utama dan sekunder memiliki teks, URL, ikon, gaya, target tab, dan status.

## Pemenang

Data hanya melalui form dengan unggah foto, tanpa impor Excel. Highlight Beranda mengambil data dari Manajemen Pemenang agar tidak terjadi duplikasi.

## Responsivitas

Admin tidak memasukkan CSS bebas. Sistem mengontrol grid, wrapping teks, rasio gambar, tumpukan tombol pada mobile, dan ukuran ikon. Navigasi desktop serta mobile memakai satu sumber data.

## Status Publikasi

- `draft`: belum siap.
- `published`: siap tampil bila komponen aktif.
- `disabled`: disembunyikan tanpa menghapus data.

## Implementasi Saat Ini

`admin.html`, `admin-beranda.html`, dan JavaScript terkait merupakan prototipe frontend dengan `localStorage`. Penyimpanan ini akan diganti API/database saat backend diterapkan.

## Sistem Ikon Kustom

Komponen berikon menggunakan model bersama:

- `iconMode`: `library` atau `upload`.
- `libraryIcon`: nama ikon Lucide sebagai pilihan dan fallback.
- `uploadedIcon`: URL/file ikon unggahan.
- `iconAlt`: teks alternatif ikon kustom.

Format demo: PNG, JPG, WebP, SVG maksimal 1 MB. SVG wajib disanitasi oleh backend produksi. Gambar memakai `object-fit: contain` agar tidak merusak ukuran komponen.

## Jadwal Penting

Section memiliki status, subjudul, judul, deskripsi, dan kartu terurut. Setiap kartu memiliki status, nama tahapan, tanggal/waktu, deskripsi opsional, serta ikon library/upload. Grid publik otomatis menyesuaikan jumlah kartu dan perangkat.

## Biaya Pendaftaran

Section mendukung varian `single` (Fokus Tunggal) dan `packages` (Paket Harga), serta mengambil warna navy, primary, dan accent dari tema global. Data mencakup heading, ornamen, paket aktif, promo, harga lama, harga utama, unit, catatan, paket unggulan, ikon library/upload, fasilitas, dan tombol opsional.

Default mempertahankan satu kartu navy seperti template publik. Paket Harga menggunakan maksimal tiga kolom desktop, dua tablet, dan satu mobile.

## Benefit

Section Benefit mencakup status, heading, background `white`/`soft`, alignment `center`/`left`, dan varian kartu `standard`/`accent`/`minimal`. Kartu berisi status, label opsional, judul, deskripsi, sorotan, URL opsional, target tab, serta ikon library/upload. Default mempertahankan empat kartu dan visual template publik.

## Highlight Pemenang

Editor Highlight hanya menyimpan konfigurasi tampilan dan referensi ID; identitas pemenang berasal dari Manajemen Pemenang. Mendukung mode otomatis/manual, limit, filter kategori, metadata kartu, background navy/soft, varian standard/compact, dan tombol. Prototipe menggunakan `DEMO_WINNERS` yang tidak dianggap sebagai data produksi. Default section nonaktif.

## Mitra & Partner

Section Mitra memiliki status, heading, background white/soft, alignment, varian simple/card/mono, preset ukuran small/medium/large, dan pengelompokan kategori opsional. Item mitra berisi status, nama, kategori, logo, alt, label, URL, target tab, dan urutan. Upload mendukung PNG/JPG/WebP/SVG maksimal 2 MB dengan fallback nama dan `object-fit: contain`.

## Halaman Unduh

Implementasi dibagi menjadi empat tahap:

1. Header dan periode/tab.
2. Kategori, pencarian, filter, dan empty state.
3. Manajemen dokumen dan upload file.
4. Integrasi renderer ke halaman publik/API.

State Tahap 1 menggunakan `talenta_download_editor_v1`. Periode memiliki ID stabil, status, label, tab default tunggal, urutan, dan jumlah dokumen. Jika default nonaktif/dihapus, periode aktif pertama menjadi default. Navbar/footer tidak termasuk editor halaman.

## Koreksi Arsitektur Unduh ↔ Arsip

Tab Unduh adalah lomba terpilih dari Arsip, bukan periode bebas atau filter kategori. Dokumen otomatis berasal dari `competition.documents` milik Detail Arsip. Editor Unduh hanya menyimpan `competitionId`, nama tab custom, status, default, urutan, `hiddenDocumentIds`, dan `documentLabelOverrides`. Upload/hapus file dilakukan pada modul Arsip. Prototipe memakai `assets/js/data/mock-archive-database.js`; state koreksi memakai `talenta_download_editor_v2` agar state model lama tidak merusak editor.
