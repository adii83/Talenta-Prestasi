# Desain UX Periode Event dan Siklus Draf Admin

## Tujuan

Menyederhanakan pengelolaan ajang tahunan agar Admin langsung memahami hubungan Kategori, Event/periode, batch/gelombang, draf, publikasi, aktivasi, dan arsip tanpa melihat slug teknis atau tombol dengan makna ambigu.

## Keputusan Produk

### Kategori adalah identitas ajang

- `CompetitionCategory` mewakili ajang yang namanya tetap dipakai lintas penyelenggaraan, misalnya **Olimpiade Sains Nasional**.
- Nama Event tidak lagi diisi bebas saat membuat Event.
- Nama ajang pada Event selalu mengikuti nama Kategori.
- `EventSite` mewakili satu penyelenggaraan pada tahun tertentu dan, bila diperlukan, satu batch pada tahun tersebut.

### Identitas periode terstruktur

Setiap Event menyimpan:

- `period_year`: tahun empat digit yang dipilih Admin;
- `batch_number`: nomor urut opsional yang ditentukan server;
- `batch_label`: istilah publik bersama dalam satu Kategori dan tahun, misalnya `Gelombang` atau `Batch`;
- `batch_note`: catatan bebas opsional yang hanya terlihat oleh Admin.

Nama publik dibentuk oleh sistem:

- tanpa batch: `OSN 2026`;
- dengan batch: `OSN 2026 · Gelombang 1`.

Slug tetap menjadi identifier teknis dan tidak digunakan sebagai label periode pada UI.

## Form Buat Event

### Kondisi awal

Form menampilkan:

- nama ajang read-only dari Kategori;
- tahun periode, default tahun berjalan dan dapat diubah;
- checkbox **Ada beberapa penyelenggaraan pada tahun yang sama** dalam kondisi tidak dicentang.

Field batch tersembunyi atau nonaktif sampai checkbox dicentang.

### Mode batch

Setelah checkbox dicentang, form menampilkan:

- istilah publik, default `Gelombang`;
- nomor batch read-only yang dihitung server;
- catatan internal opsional.

Admin tidak memilih nomor awal. Nomor berikutnya adalah nomor terbesar yang pernah dipakai pada Kategori dan tahun tersebut ditambah satu. Nomor yang pernah dipakai tidak didaur ulang setelah Event dihapus.

### Event kedua yang tidak direncanakan

Jika satu Event tanpa batch sudah tersedia pada tahun yang dipilih, server mengembalikan kondisi konflik terstruktur. UI meminta konfirmasi bahwa:

- Event existing akan diberi `batch_number = 1`;
- Event baru akan diberi `batch_number = 2`;
- istilah publik yang dipilih berlaku untuk seluruh Event pada Kategori dan tahun tersebut;
- konten, media, draf, snapshot publik, status aktif, dan audit Event existing tidak diubah.

Konversi dan pembuatan Event baru dilakukan dalam satu transaksi database setelah konfirmasi Admin.

## Waktu Perubahan Nama Publik

Membuat Gelombang 2 sebagai draf tidak langsung mengubah nama publik Event existing.

Sebelum aktivasi Gelombang 2:

- Admin melihat Gelombang 1 dan Gelombang 2;
- pengunjung tetap melihat `OSN 2026` pada Event aktif existing.

Ketika Gelombang 2 yang sudah memiliki snapshot publik diaktifkan:

- Event existing menjadi arsip bernama `OSN 2026 · Gelombang 1`;
- Event baru menjadi aktif bernama `OSN 2026 · Gelombang 2`;
- perubahan status aktif dan penerapan identitas publik batch berlangsung atomik.

## Data Existing

Migration menambah kolom periode dan batch tanpa menebak konflik secara diam-diam.

- Slug empat digit seperti `2026` dapat menjadi kandidat `period_year = 2026`.
- Slug seperti `2026-1de120` hanya memberi kandidat tahun `2026`; suffix acak tidak dianggap batch.
- Jika hanya satu Event memiliki kandidat tahun yang jelas dalam Kategori, migration boleh mengisi tahun tersebut.
- Jika beberapa Event dalam Kategori memiliki kandidat tahun sama atau tidak memiliki kandidat jelas, data ditandai perlu konfirmasi identitas periode.
- UI meminta Admin menetapkan tahun dan urutan batch sebelum tindakan yang bergantung pada identitas periode dilakukan.
- Waktu pembuatan hanya menjadi saran urutan, bukan keputusan bisnis otomatis.

Database development/testing yang diotorisasi pengguna boleh dimigrasikan dan datanya diselaraskan. Operasi tidak diarahkan ke production.

## Daftar Event

### Hierarki

Daftar menggunakan pola **Event aktif utama + arsip ringkas**.

Event aktif ditampilkan sebagai kartu utama dengan:

- `Periode <tahun>` dan batch bila ada;
- catatan internal bila ada;
- badge operasional;
- badge workspace;
- badge publikasi;
- tindakan utama **Kelola Event**;
- tindakan sekunder yang tidak sering digunakan di menu `•••`.

Event nonaktif ditampilkan pada bagian **Periode sebelumnya** dalam grid kartu lebih ringkas. Layout harus tetap mudah digunakan untuk 1, 2, 5, dan 10 Event.

### Navigasi halaman

**Kembali ke Kategori** dan **Buat Event** berada dalam satu kelompok aksi horizontal pada desktop. Pada viewport sempit keduanya dapat memenuhi lebar dan tetap berdampingan selama ruang mencukupi, lalu membungkus secara terkontrol tanpa terlihat seperti dua bagian yang tidak berkaitan.

### Badge status

Status dipisahkan menjadi tiga dimensi:

- operasional: `Aktif` atau `Arsip`;
- workspace: `Ada draf` atau `Draf bersih`;
- publikasi: `Belum dipublikasikan` atau `Publikasi v<n>`.

Teks status bukan lagi paragraf terpisah pada kartu.

## Action Bar Editor

Urutan desktop:

- kiri: **Urungkan edit**, **Lihat preview**;
- kanan: **Simpan draf**, **Batalkan draf**, pemisah visual, **Publikasikan perubahan**.

Pada layar kecil, tombol dapat tersusun menjadi grid dua kolom dan **Publikasikan perubahan** memakai satu baris penuh.

### Urungkan edit

Menggantikan label **Reset** pada action bar.

- Hanya berlaku pada modul aktif.
- Membuang perubahan form yang belum disimpan.
- Memuat ulang data terakhir yang tersimpan pada workspace draf dari backend.
- Tidak mengembalikan template awal.
- Tidak mengubah database.
- Meminta konfirmasi hanya jika modul memiliki perubahan form belum tersimpan.

Reset ke template bawaan dihapus dari action bar. Jika dipertahankan untuk kebutuhan khusus, tindakan tersebut ditempatkan terpisah dalam menu lanjutan dengan label **Pulihkan template bawaan**, konsekuensi eksplisit, dan konfirmasi berbahaya.

### Simpan draf

Menyimpan modul aktif ke workspace Event tanpa mengubah snapshot publik.

### Lihat preview

Membuka workspace draf melalui Public Site dengan token preview aman. Perubahan form yang belum disimpan tidak dijanjikan tampil pada preview.

### Batalkan draf

Mengembalikan seluruh workspace Event ke snapshot publik terakhir. Tindakan ini tidak tersedia jika Event belum pernah dipublikasikan atau workspace sudah bersih.

### Publikasikan perubahan

Membuat seluruh workspace Event menjadi snapshot publik terbaru. Tombol berada paling kanan dan paling menonjol sebagai tujuan akhir siklus draf.

## Status Editor

Di samping identitas halaman ditampilkan badge yang relevan, misalnya:

- `Aktif`;
- `Ada draf`;
- `Publikasi v2`.

Pesan kontekstual menjelaskan keadaan, misalnya: **Ada perubahan draf. Pengunjung masih melihat publikasi versi 2.**

## Validasi dan Konsistensi Database

- `period_year` wajib berupa tahun empat digit dalam rentang produk yang wajar.
- Nama ajang tidak diterima dari boundary pembuatan Event; server mengambilnya dari Kategori.
- Kombinasi Kategori, tahun, dan nomor batch harus unik.
- Event tanpa batch hanya boleh satu per Kategori dan tahun.
- Alokasi nomor batch dan konversi Event existing menggunakan transaksi dan locking untuk mencegah nomor ganda.
- Aktivasi tetap menjaga paling banyak satu Event aktif per Kategori.
- Kategori published tidak dapat mengaktifkan Event tanpa snapshot publik.
- Konversi batch tidak mengubah ownership atau relasi konten/media.

## Error Handling

- Konflik tahun dikembalikan sebagai respons terstruktur yang dapat dirender UI, bukan slug acak.
- Konfirmasi konversi menampilkan Event yang akan menjadi Batch 1 dan identitas Event baru.
- Jika transaksi konversi gagal, Event existing dan Event baru tetap pada kondisi sebelum operasi.
- Kegagalan memuat draf untuk **Urungkan edit** mempertahankan form saat ini dan menampilkan error; form tidak dikosongkan.
- Status/badge yang gagal dimuat menampilkan keadaan tidak diketahui dan tidak mengaktifkan tindakan berisiko.

## Pengujian dan Acceptance Browser

### Otomatis

- Unit test validasi tahun, nama turunan, alokasi batch, konflik, dan transaksi konversi.
- Test migration untuk data tunggal, slug acak konflik, dan data tanpa kandidat tahun.
- Audit frontend untuk urutan action bar, badge, dan tidak adanya label periode dari slug.
- Build backend dan pemeriksaan JavaScript.

### Browser nyata

Pengujian harus menggunakan alur UI, bukan hanya memanggil API:

1. form Event default ke tahun berjalan;
2. nama ajang read-only mengikuti Kategori;
3. field batch tersembunyi sampai checkbox dicentang;
4. pembuatan tahun unik menghasilkan Event tanpa batch;
5. pembuatan Event kedua menampilkan konfirmasi konversi;
6. penolakan konfirmasi tidak mengubah data;
7. persetujuan menjadikan Event existing Batch 1 dan Event baru Batch 2;
8. nama publik existing belum berubah sebelum Event baru diaktifkan;
9. aktivasi Event baru mengarsipkan Event lama dan menerapkan nama publik gelombang;
10. **Urungkan edit** kembali ke draf tersimpan, bukan template;
11. **Batalkan draf** mengembalikan seluruh Event ke publikasi terakhir;
12. badge sesuai keadaan backend;
13. action bar sesuai urutan dan hierarki pada desktop, tablet, dan mobile;
14. daftar tetap terbaca untuk 1, 2, 5, dan 10 Event.

Temuan browser yang tidak sesuai harus diperbaiki dan diuji ulang sebelum pekerjaan dinyatakan selesai.

## Batas Scope

- Tidak menambahkan riwayat multi-versi draf atau undo bertingkat.
- Tidak mengizinkan nomor batch manual.
- Catatan internal batch tidak tampil kepada pengunjung.
- Tidak mengubah publikasi Kategori menjadi bagian dari publikasi konten Event.
- Tidak melakukan commit, push, release, atau deployment tanpa instruksi terpisah.
