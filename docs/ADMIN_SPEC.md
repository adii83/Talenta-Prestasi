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
2. **Highlight Pemenang:** heading dan seluruh kategori/kartu aktif dari Manajemen Pemenang.
3. **Jadwal Penting:** subjudul, judul, deskripsi, serta kartu jadwal.
4. **Biaya Pendaftaran:** subjudul, harga, keterangan, dan catatan.
5. **Benefit:** subjudul, judul, deskripsi, serta kartu benefit.
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
- Preview wajib memakai builder dan class Hero Template yang sama. Mode desktop,
  tablet, dan mobile hanya mengubah viewport simulasi sesuai breakpoint publik;
  warna, tipografi, padding, badge, tombol, gambar, dan susunan tidak memiliki CSS
  alternatif.
- Kanvas yang melebihi ruang editor harus diperkecil sebagai satu kesatuan dengan
  skala proporsional. Dilarang menampilkan scrollbar horizontal atau mengecilkan
  elemen Hero satu per satu.

## Pemenang

Data hanya melalui form dengan unggah foto, tanpa impor Excel. Manajemen Pemenang
selalu terikat ke `Competition.id` yang berstatus aktif. Kategori memiliki ID unik
di dalam lomba, sedangkan ID pemenang unik pada seluruh data pemenang lomba aktif.
State dengan `competitionId` berbeda tidak boleh diterapkan pada lomba aktif.

Kategori/pemenang nonaktif tetap tersimpan di Admin tetapi disaring oleh resolver
publik. Highlight Beranda mengambil kategori, pemenang, dan konfigurasi metadata
melalui repository Pemenang yang sama agar tidak terjadi parsing localStorage atau
duplikasi data.

Bagian riwayat hanya mengambil Arsip berstatus published, aktif, Detail Arsip aktif,
dan memiliki minimal satu kategori serta pemenang aktif. Batas kartu dinormalisasi
menjadi bilangan bulat yang tidak dapat melebihi jumlah Arsip valid tersebut. Jika
empat Arsip publik hanya tiga yang memiliki pemenang aktif, nilai maksimum input dan
jumlah kartu adalah tiga. Menonaktifkan Arsip tidak menghapus relasi atau data
pemenang.

Template dan Preview Admin memakai `buildWinnerPageMarkup()` yang sama untuk
heading, banner SK, kelompok kategori, kartu pemenang, metadata, dan kartu Arsip.
Preview merender kanvas publik 1425 px, 753 px, atau 375 px kemudian melakukan
scaling proporsional tanpa scrollbar horizontal.

## Arsip dan Detail Arsip

Arsip adalah owner utama untuk lomba terdahulu, dokumen, konfigurasi SK, kategori,
dan pemenang historis. `Competition.id` unik secara global. Di dalam satu lomba,
`WinnerCategory.id`, `Winner.id`, dan `Document.id` wajib unik; ID pemenang tidak
boleh berulang lintas kategori pada lomba yang sama.

Detail Arsip hanya menyimpan pengaturan tampilan sebagai referensi:
`hiddenCategoryIds`, `hiddenDocumentIds`, dan `documentLabelOverrides`. Seluruh ID
tersebut wajib dimiliki lomba yang sama. SK dengan `documentId` juga harus menunjuk
`competition.documents` milik lomba tersebut. Referensi asing, kosong, atau duplikat
dibersihkan saat normalisasi.

Penghapusan lomba baseline memakai `removedCompetitionIds` sebagai tombstone agar
data tidak muncul kembali setelah reload. Tombstone langsung menghilangkan sumber
dari daftar Arsip, Detail Arsip, tab Unduh, dan riwayat halaman Pemenang. Status
`draft`, `disabled`, lomba nonaktif, atau Detail nonaktif tidak lolos resolver publik.

Template dan Preview Admin daftar Arsip sama-sama memakai
`buildArchiveListMarkup()`. Detail Arsip memakai `resolveArchiveDetailState()` dan
`buildArchiveDetailMarkup()` untuk banner, breadcrumb, SK, kategori, pemenang, dan
dokumen. Preview hanya mensimulasikan kanvas 1425 px, 753 px, dan 375 px lalu
melakukan scaling proporsional tanpa scrollbar.

Field visual lomba mendukung ikon library sebagai fallback dan unggahan logo/maskot
sebagai identitas utama. Logo/maskot memakai `object-fit: contain`, ditampilkan lebih
besar pada thumbnail publik, dan digunakan konsisten pada daftar editor Arsip serta
kartu riwayat Pemenang. PNG/WebP transparan direkomendasikan.

## FAQ

FAQ merupakan aggregate mandiri: halaman memiliki banyak kategori terurut dan setiap
kategori menjadi owner pertanyaan terurut. `Category.id` dan `Question.id` wajib unik
dalam satu halaman; setiap pertanyaan dinormalisasi dengan `categoryId` milik kategori
induknya. FAQ tidak memiliki foreign key ke lomba, Unduh, Pemenang, atau Arsip.

Kategori dan pertanyaan nonaktif tetap tersimpan di Admin, tetapi resolver publik
hanya mengirim kategori aktif yang memiliki minimal satu pertanyaan aktif dengan
teks pertanyaan serta jawaban tidak kosong. Alignment dibatasi ke `center` atau
`left`, ID disanitasi untuk HTML/backend, dan teks selalu di-escape sebelum menjadi
markup.

Template dan Preview Admin memakai `buildFaqPageMarkup()`,
`buildFaqAccordionMarkup()`, dan `bindFaqAccordion()` yang sama. Trigger accordion
memiliki pasangan `aria-controls`/`aria-labelledby`, `aria-expanded`, serta region
jawaban. Preview mensimulasikan kanvas 1425 px, 753 px, dan 375 px lalu melakukan
scaling proporsional tanpa scrollbar.

## Responsivitas

Admin tidak memasukkan CSS bebas. Sistem mengontrol grid, wrapping teks, rasio gambar, tumpukan tombol pada mobile, dan ukuran ikon. Navigasi desktop serta mobile memakai satu sumber data.

## Status Publikasi

- `draft`: belum siap.
- `published`: siap tampil bila komponen aktif.
- `disabled`: disembunyikan tanpa menghapus data.

## Implementasi Saat Ini

Shell `apps/admin/`, seluruh editor directory-index, dan JavaScript terkait
merupakan CMS frontend dengan database dummy, repository bersama, serta override
`localStorage`. Penyimpanan ini akan diganti API/database saat backend diterapkan.

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

Section mendukung varian `single` (Fokus Tunggal) dan `packages` (Paket Harga), serta mengambil warna navy dan primary dari tema global. Heading ringkas hanya memakai subjudul kecil; judul dan deskripsi tambahan tidak digunakan. Data paket difokuskan pada nama, harga utama, keterangan harga, status unggulan, serta daftar fasilitas aktif. Fasilitas dirender sebagai daftar centang pada Template dan preview Admin; ikon paket, harga lama, promo, catatan paket, dan tombol aksi tidak digunakan.

Default mempertahankan satu kartu navy seperti template publik. Paket Harga menggunakan maksimal tiga kolom desktop, dua tablet, dan satu mobile.

## Benefit

Section Benefit mencakup status, heading, background `white`/`soft`, alignment `center`/`left`, dan varian kartu `standard`/`accent`/`minimal`. Kartu berisi status, judul, deskripsi, URL opsional, target tab, serta ikon library/upload. Label kecil dan status kartu unggulan tidak digunakan. Default mempertahankan empat kartu dan visual template publik.

## Highlight Pemenang

Editor Highlight hanya menyimpan status serta heading section. Identitas, kategori,
urutan, kartu, dan visibilitas metadata berasal dari Manajemen Pemenang dan
konfigurasi Tampilan Pemenang agar tidak ada duplikasi. Seluruh kategori aktif dan
pemenang aktif ditampilkan; tidak ada tombol “Lihat Semua Pemenang”. Section berada
tepat setelah Hero. Background mengikuti gradient tema global, memakai pembatas tipis
dengan Hero, dan kelompok tiga kartu dipusatkan pada desktop tanpa mengubah grid
responsif tablet/mobile.

## Mitra & Partner

Section Mitra memiliki status, heading ringkas tanpa deskripsi, background white/soft, alignment, varian simple/card/mono, dan preset ukuran small/medium/large. Item mitra berisi status, nama, logo, alt, URL, target tab, dan urutan. Label serta kategori tidak digunakan; semua logo tampil dalam satu kelompok. Upload mendukung PNG/JPG/WebP/SVG maksimal 2 MB dengan fallback nama dan `object-fit: contain`.

## Halaman Unduh

Halaman Unduh telah terhubung ke renderer publik dan repository bersama. Editor
mengelola heading, tab lomba, label dokumen, visibilitas, default, serta urutan tanpa
menduplikasi file milik Arsip. Jika tab default nonaktif/dihapus, lomba aktif pertama
menjadi default. Navbar dan footer tetap berasal dari Pengaturan Global.

Unduh bukan salinan otomatis daftar Arsip. Sumber yang dapat dipilih terdiri dari
lomba aktif sekarang dan lomba Arsip publik yang memiliki dokumen. Hanya sumber yang
ditambahkan serta diaktifkan Admin yang menjadi tab publik. UI wajib membedakan badge
`Lomba aktif` dan `Dari Arsip`, serta menampilkan jumlah tab terpilih dibanding jumlah
sumber tersedia.

## Koreksi Arsitektur Unduh ↔ Arsip

Tab Unduh adalah lomba terpilih dari Arsip, bukan periode bebas atau filter kategori.
Dokumen otomatis berasal dari `competition.documents` milik Detail Arsip. Editor
Unduh hanya menyimpan `competitionId`, nama tab custom, status, default, urutan,
`hiddenDocumentIds`, dan `documentLabelOverrides`. Upload/hapus file dilakukan pada
modul Arsip. Baseline menggunakan
`packages/shared/js/data/mock-archive-database.js`; state efektif memakai
`talenta_download_editor_v2` agar state model lama tidak merusak editor.

`competitionId` diperlakukan sebagai foreign key unik: satu lomba tidak boleh
ditambahkan dua kali. Setiap ID pada `hiddenDocumentIds` dan setiap key pada
`documentLabelOverrides` wajib menunjuk `competition.documents` milik lomba yang
sama. Relasi yang sumbernya benar-benar hilang dibuang saat normalisasi, sedangkan
sumber yang hanya nonaktif/tidak published tetap disimpan di Admin tetapi tidak
ditampilkan publik. Jika tab default tidak lolos ke publik, tab publik pertama
otomatis menjadi default tanpa mengubah data Arsip.

Template dan Preview Admin sama-sama memakai `buildDownloadMarkup()`. Preview
merender kanvas publik pada lebar acuan 1425 px, 753 px, dan 375 px lalu
memperkecil keseluruhan kanvas secara proporsional agar tidak menghasilkan
scrollbar horizontal.

## Tema pada Preview Admin

Semua preview Admin wajib menggunakan design system Template dan helper
`applyGlobalThemeTokens()`. Preview tidak boleh membaca key Pengaturan Global secara
langsung atau mendefinisikan fallback warna sendiri. Setelah Pengaturan Global
disimpan, preview Beranda, Unduh, Pemenang, Arsip, Detail Arsip, dan FAQ harus
merender ulang melalui `subscribeGlobalSettings()`.

Warna gelap/Navy dan seluruh stop gradient global diturunkan otomatis dari Warna
Utama. Editor tidak menyimpan Navy terpisah agar footer, Hero, Biaya, SK, Highlight
Pemenang, thumbnail Arsip, avatar, serta preview tetap berada dalam satu hue ketika
Warna Utama diganti.

Pada halaman Pemenang dan Detail Arsip yang berlatar putih, ikon kategori, badge
jumlah, garis kartu, avatar, dan teks peringkat mengikuti Warna Utama. Pada Highlight
Beranda yang berlatar gelap, badge jumlah memakai putih transparan seperti badge
jenjang Hero. Thumbnail daftar Arsip dan banner Detail Arsip sama-sama mengikuti
gradient tema global; editor tidak lagi menyediakan gradient khusus per lomba.

Navigasi publik menentukan item aktif dari route canonical. Detail Arsip menandai
Arsip sebagai aktif, dan setiap halaman desktop/mobile memberikan `aria-current`
pada satu item yang sesuai.

## Dialog Konfirmasi Admin

Seluruh action destruktif atau reset wajib memakai `adminConfirm()` dari
`apps/admin/js/shared/dialog.js`. `window.confirm()`, `window.alert()`, dan
`window.prompt()` tidak boleh digunakan karena menghasilkan dialog browser yang
tidak mengikuti design system.

Dialog menyediakan judul, penjelasan dampak, label tombol spesifik, ikon, dan varian
`primary`/`danger`. Tombol Batal menerima fokus awal, Escape dan klik backdrop
membatalkan action, fokus dikembalikan ke pemicu setelah dialog ditutup, serta layout
tombol berubah menjadi vertikal pada mobile.

Jika action berasal dari editor iframe, `adminConfirm()` mendelegasikan permintaan ke
shell Admin agar backdrop dan dialog menutup seluruh workspace. Editor yang dibuka
secara standalone tetap memakai dialog lokal dengan kontrak yang sama.
