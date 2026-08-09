# Desain Perapihan Public Site dan Dokumentasi

## Status

Disetujui dalam diskusi pada 9 Agustus 2026. Dokumen ini hanya menetapkan perapihan struktur dan dokumentasi. Persetujuan ini tidak mencakup perubahan fitur, visual, API, database, atau perilaku aplikasi.

## Latar Belakang

Talenta Prestasi adalah platform website kompetisi multi-event yang sudah diterapkan. Public Site, CMS Admin, API NestJS, persistensi PostgreSQL, dan penyimpanan media lokal telah terintegrasi. Fase proyek saat ini adalah maintenance dan perbaikan bug. Revisi mekanisme pada masa mendatang harus dirancang secara terpisah sebelum diterapkan.

Batas utama sistem sudah cukup sehat, tetapi masih ada dua sumber kebingungan bagi programmer dan AI berikutnya:

1. `apps/template` merupakan aplikasi publik production, tetapi namanya memberi kesan sebagai prototipe atau contoh.
2. Dokumentasi aktif mencampurkan kondisi sistem saat ini dengan fase historis ketika proyek masih frontend-only dan backend belum diterapkan.

Perapihan harus memperjelas model mental proyek tanpa mengubah perilaku produk.

## Standar Bahasa Dokumentasi

- Seluruh dokumentasi aktif proyek menggunakan Bahasa Indonesia yang jelas, langsung, dan konsisten.
- Judul, penjelasan arsitektur, status, petunjuk operasional, petunjuk pengujian, dan keputusan teknis ditulis dalam Bahasa Indonesia.
- Istilah teknis bahasa Inggris tetap digunakan ketika merupakan nama baku, nama kode, identifier, command, protokol, atau jika terjemahannya mengaburkan arti. Contoh: Public Site, Admin CMS, API, soft delete, gateway, tenant, endpoint, dan visual baseline.
- Istilah teknis yang belum umum dijelaskan secara singkat saat pertama kali digunakan.
- Nama file, folder, route ID, entity, tabel, field, command, dan potongan kode tidak diterjemahkan.
- Dokumentasi menghindari kalimat ambigu mengenai status, waktu, pemilik data, dan ruang lingkup.
- Dokumentasi historis boleh mempertahankan kutipan atau istilah lama jika diperlukan untuk akurasi sejarah, tetapi pengantar dan penandanya tetap menggunakan Bahasa Indonesia.

## Tujuan

- Mengganti nama aplikasi yang dilihat pengunjung dari `template` menjadi `public-site`.
- Mempertahankan perannya sebagai acuan visual untuk markup publik, style, komponen, breakpoint, dan preview Admin.
- Mempertahankan URL production yang bersih dan tidak berubah.
- Membuat dokumentasi aktif hanya menjelaskan sistem yang sudah diterapkan.
- Memisahkan status saat ini, petunjuk operasional, petunjuk pengujian, dan riwayat implementasi.
- Menetapkan urutan baca dan hierarki sumber kebenaran yang jelas bagi programmer dan AI berikutnya.
- Menyediakan behavioral baseline yang terverifikasi sebelum perbaikan bug atau revisi mekanisme berikutnya.

## Bukan Tujuan

- Tidak memigrasikan frontend ke framework lain atau melakukan rewrite arsitektur.
- Tidak mengubah desain visual, isi konten, atau CSS.
- Tidak mengubah kontrak API, autentikasi, otorisasi, tenant, atau role.
- Tidak mengubah schema PostgreSQL atau migration.
- Tidak mengubah mekanisme publish/unpublish, pewarisan Arsip, soft delete, upload, atau penyimpanan media.
- Tidak memperbaiki bug dalam perubahan perapihan. Bug yang ditemukan dicatat pada `PROGRESS.md` untuk task terpisah.
- Tidak menerapkan revisi mekanisme yang masih akan dibahas pada masa mendatang.

## Arsitektur

Struktur repository yang dituju:

```text
apps/
├── public-site/     # Website event untuk pengunjung dan acuan visual
├── admin/           # CMS, dashboard Event, editor, dan preview
└── backend/         # REST API, autentikasi, media, dan persistensi

packages/
└── shared/          # Kontrak browser yang benar-benar dipakai public-site dan admin

scripts/             # Validasi, gateway, audit, dan tooling lokal
docs/                # Dokumentasi teknis dan operasional yang aktif
```

### Batas setiap aplikasi

| Unit | Tanggung jawab | Tidak boleh memiliki |
| --- | --- | --- |
| `apps/public-site` | Merender halaman event untuk pengunjung dari Public API serta memiliki markup, CSS, aset, dan interaksi publik | Logika editor, autentikasi Admin, atau persistensi langsung |
| `apps/admin` | Login, dashboard Event, editor terstruktur, preview, CRUD, publish, dan unpublish | Sumber konten publik hardcoded yang terpisah |
| `apps/backend` | Autentikasi, pembatasan tenant/RBAC, validasi, API, PostgreSQL, dan media | Markup halaman publik atau desain visual |
| `packages/shared` | API client, canonical route helper, compatibility contract, dan builder yang dipakai kedua aplikasi browser | Fitur yang hanya digunakan satu aplikasi |

Arah dependensi tetap:

```text
Public Site ─┐
             ├──> shared browser contract ──> HTTP API ──> PostgreSQL/media
Admin CMS ───┘
```

Perapihan tidak menambahkan lapisan abstraksi baru. Kode tetap ditempatkan di `shared` hanya jika kedua aplikasi browser benar-benar menggunakannya.

## Penamaan

Folder diubah dari:

```text
apps/template/
→ apps/public-site/
```

Identifier canonical route browser diubah dari:

```text
template.home          → publicSite.home
template.download      → publicSite.download
template.winners       → publicSite.winners
template.archive       → publicSite.archive
template.archiveDetail → publicSite.archiveDetail
template.faq           → publicSite.faq
```

`publicSite.*` dipilih daripada `public.*` agar route browser tidak tertukar dengan Public API pada backend.

Kata “template” tetap dapat digunakan untuk menjelaskan kemampuan produk: satu visual template melayani banyak event. Kata tersebut bukan lagi nama aplikasi.

Pernyataan arsitektur yang dipertahankan:

> Public Site adalah aplikasi production yang dilihat pengunjung sekaligus visual baseline untuk markup, style, komponen, breakpoint, dan preview Admin.

## Routing dan URL

URL workspace langsung berubah dari:

```text
http://localhost:4173/apps/template/
→ http://localhost:4173/apps/public-site/
```

Route yang dilihat pengunjung melalui production dan gateway tetap:

```text
/
/unduh/
/pemenang/
/arsip/
/arsip/detail/
/faq/
```

Public gateway tetap memetakan route pengunjung yang bersih ke direktori internal Public Site dan hanya mengekspos:

- halaman serta aset Public Site;
- aset shared browser yang diperlukan;
- `/api`.

Gateway harus tetap menolak path Admin dan file repository.

Tidak dibuat compatibility redirect untuk `/apps/template/`. Path tersebut adalah path development lama, bukan kontrak produk publik. Seluruh referensi aktif harus dipindahkan ke `/apps/public-site/`.

Dokumentasi harus membedakan:

- **workspace URL** — akses melalui static server secara langsung selama development;
- **public gateway URL** — simulasi clean route dan perilaku hostname seperti production.

## Model Dokumentasi

Struktur dokumentasi aktif yang dituju:

```text
README.md
PROGRESS.md

docs/
├── ARCHITECTURE.md
├── ADMIN_SPEC.md
├── DATA_MODEL.md
├── OPERATIONS.md
├── TESTING.md
└── archive/
    ├── FRONTEND_IMPLEMENTATION_HISTORY.md
    └── BACKEND_IMPLEMENTATION_HISTORY.md
```

Materi yang sudah ada dikonsolidasikan. Dokumentasi tidak ditulis ulang tanpa kebutuhan.

### `README.md`

Fungsi: orientasi awal bagi manusia dan AI.

Isinya hanya:

- tujuan produk;
- status saat ini secara eksplisit;
- aplikasi yang tersedia;
- struktur repository;
- petunjuk startup singkat;
- urutan baca dokumentasi;
- tautan ke dokumentasi teknis aktif.

Pernyataan status harus tidak ambigu:

> Talenta Prestasi adalah platform website kompetisi multi-event yang sudah diterapkan. Public Site, CMS Admin, backend NestJS, database PostgreSQL, dan integrasinya telah selesai. Pekerjaan aktif adalah maintenance dan perbaikan bug. Revisi mekanisme berikutnya berada di luar scope implementasi sampai dirancang dan disetujui secara terpisah.

README tidak boleh menjelaskan backend sebagai pekerjaan masa depan.

### `PROGRESS.md`

Fungsi: status maintenance yang aktif.

Isinya:

- status produk;
- area utama yang telah selesai;
- bug terbuka;
- pekerjaan aktif;
- revisi yang direncanakan tetapi belum masuk scope;
- bukti validasi terakhir.

File ini tidak lagi memuat jurnal implementasi harian yang historis.

### `docs/ARCHITECTURE.md`

Fungsi: menjelaskan arsitektur yang sudah diterapkan.

Isinya:

- batas Public Site, Admin, backend, dan shared;
- arah dependensi dan alur data;
- tenant resolution serta batas Public/Admin API;
- routing dan perilaku gateway;
- penyimpanan media;
- aturan visual baseline Public Site;
- aturan penempatan kode.

Dokumen ini tidak boleh memakai narasi “backend mendatang” atau “localStorage akan diganti nanti”.

### `docs/ADMIN_SPEC.md`

Fungsi: menjelaskan perilaku dan acceptance rule CMS saat ini.

Isinya:

- login dan dashboard Event;
- alur create, manage, publish, unpublish, dan delete;
- editor terstruktur;
- validasi dan batas upload;
- preview dan dialog konfirmasi;
- pembatasan berdasarkan role.

Fase editor historis dan narasi migrasi localStorage dipindahkan ke arsip.

### `docs/DATA_MODEL.md`

Dokumen ini menggantikan `docs/DATABASE_DESIGN.md` karena database sudah diterapkan, bukan lagi sekadar rancangan.

Isinya:

- Organisasi → Event → data milik Event;
- ownership entity dan batas tenant;
- pewarisan Arsip lintas Event;
- relasi Arsip, Unduh, Pemenang, dan SK Pemenang;
- constraint relasional;
- status publikasi dan soft delete;
- metadata serta referensi media.

Roadmap implementasi backend yang sudah selesai dan pertanyaan persetujuan sebelum implementasi dipindahkan ke arsip historis.

### `docs/OPERATIONS.md`

Fungsi: instalasi, menjalankan sistem, dan troubleshooting.

Isinya:

- setup pertama;
- nama environment variable yang diperlukan tanpa nilai rahasia;
- prosedur migration dan local seed;
- startup PostgreSQL, backend, frontend, gateway, dan tunnel;
- workspace URL dan gateway URL;
- shutdown;
- troubleshooting dasar.

### `docs/TESTING.md`

Fungsi: validasi dan acceptance testing.

Isinya:

- command validasi otomatis;
- command build, unit test, dan E2E backend;
- skenario browser manual;
- pemeriksaan upload dan keamanan;
- pemeriksaan responsivitas dan aksesibilitas;
- format laporan bug.

### `docs/archive/`

Fungsi: mempertahankan riwayat implementasi tanpa menjadikannya instruksi aktif.

Setiap dokumen historis dimulai dengan:

> **DOKUMEN HISTORIS — bukan sumber status atau arsitektur saat ini. Verifikasi dokumentasi aktif dan source code sebelum menggunakan informasi di dalam dokumen ini.**

Arsip mencatat evolusi frontend-only, fase dummy/localStorage, milestone implementasi backend, serta hasil validasi pada tanggal tertentu.

### `apps/backend/README.md`

README starter NestJS generik diganti dengan orientasi backend khusus proyek yang ringkas:

- tanggung jawab backend;
- nama environment variable yang diperlukan;
- command setup, run, migration, seed, dan test;
- tautan ke arsitektur, model data, operasi, dan pengujian yang aktif.

README backend tidak menduplikasi seluruh dokumentasi domain.

## Hierarki Sumber Kebenaran

Jika ada informasi yang bertentangan, programmer dan AI menggunakan urutan berikut:

1. implementasi dan executable test saat ini;
2. keputusan produk terbaru yang telah disetujui;
3. dokumentasi aktif;
4. dokumentasi historis.

Urutan baca wajib:

1. `README.md`;
2. `PROGRESS.md`;
3. `docs/ARCHITECTURE.md`;
4. dokumen domain aktif yang relevan;
5. source code dan test;
6. `docs/archive/` hanya ketika alasan historis diperlukan.

Dokumentasi historis tidak dapat mengalahkan status aktif.

## Scope Implementasi

Rename terkontrol harus memperbarui seluruh referensi aktif, termasuk:

- path HTML dan JavaScript;
- canonical route registry serta route ID;
- preview, iframe, dan public link pada Admin;
- command development root;
- pemetaan path public gateway;
- contoh konfigurasi Cloudflare;
- validator route;
- script audit statis dan browser;
- test parity dan relasi;
- dokumentasi aktif;
- petunjuk development untuk pengguna;
- komentar atau pesan error yang memuat path lama.

Dependency hasil generate, Git internal, dan dokumen historis tidak diubah secara membabi buta. Dokumen historis boleh mempertahankan path lama untuk menjelaskan kondisi masa lalu, tetapi banner arsip harus mencegahnya dibaca sebagai instruksi aktif.

## Penanganan Error dan Risiko

- Ambil baseline yang bersih sebelum rename.
- Route, preview, aset, atau pemetaan gateway yang rusak dianggap sebagai regresi perapihan.
- Jangan memperbaiki bug lama yang tidak terkait dalam perubahan yang sama.
- Catat bug lama yang ditemukan pada `PROGRESS.md` beserta bukti reproduksinya.
- Jangan menambahkan redirect atau compatibility layer kecuali baseline membuktikan adanya kontrak eksternal yang masih dipelihara.
- Jangan mengubah migration database atau data production.
- Pertahankan validasi input, autentikasi, otorisasi, tenant isolation, pemeriksaan media, aksesibilitas, dan security header.

## Validasi

Jalankan validasi sebelum dan sesudah rename menggunakan source state serta environment yang setara.

Pemeriksaan wajib:

1. Seluruh frontend check dari root lulus.
2. Halaman Public Site dapat dibuka melalui workspace path langsung.
3. Halaman Public Site dapat dibuka melalui clean route pada gateway.
4. Login, dashboard, editor, dan preview Admin tetap dapat dimuat.
5. Public link dari Admin menuju route yang benar.
6. Public gateway menolak path Admin dan file repository.
7. Public API dan delivery media tetap dapat diakses.
8. Build, unit test, dan E2E backend lulus.
9. Tidak ada migration atau perubahan schema PostgreSQL.
10. Audit visual parity tidak menunjukkan perubahan visual yang disengaja.
11. Tidak ada referensi `apps/template` pada source aktif atau dokumentasi yang berfungsi sebagai instruksi saat ini. Spesifikasi desain dan arsip historis boleh menyebutnya hanya sebagai path lama yang ditandai secara eksplisit.
12. Tidak ada canonical route ID aktif yang diawali `template.`. Spesifikasi desain dan arsip historis boleh menyebut identifier lama hanya sebagai catatan rename.
13. Dokumentasi aktif tidak menjelaskan backend/database yang sudah diterapkan sebagai pekerjaan masa depan.
14. Dokumen historis memiliki banner arsip.
15. `PROGRESS.md` hanya memuat status maintenance saat ini.
16. Seluruh dokumentasi aktif menggunakan Bahasa Indonesia sesuai standar dokumentasi.

Jika test yang bergantung pada environment tidak dapat dijalankan, laporan akhir harus menjelaskan apa yang dilewati dan alasannya secara tepat.

## Kriteria Penerimaan

Perapihan selesai ketika:

- `apps/public-site` menjadi satu-satunya path aplikasi yang dipelihara untuk website pengunjung;
- route ID untuk programmer menggunakan `publicSite.*`;
- URL production yang dilihat pengunjung tidak berubah;
- perilaku produk, tampilan, kontrak API, schema database, dan mekanisme media tidak berubah;
- dokumentasi aktif konsisten menjelaskan produk yang sudah diterapkan dan berada dalam fase maintenance;
- fase frontend/backend historis tetap tersedia tetapi ditandai jelas sebagai arsip;
- programmer berikutnya dapat menemukan status dan dokumen yang tepat tanpa membaca seluruh jurnal implementasi;
- baseline serta hasil validasi setelah perubahan dicatat;
- dokumentasi aktif menggunakan Bahasa Indonesia yang jelas dan konsisten.

## Urutan Tahap Pekerjaan

Pekerjaan tetap dipisahkan menjadi tiga tahap:

1. **Perapihan struktur dan dokumentasi** — spesifikasi ini.
2. **Perbaikan bug** — task terpisah berdasarkan baseline yang sudah dirapikan.
3. **Revisi mekanisme** — diskusi, desain, persetujuan, rencana, dan implementasi terpisah.

Tahap kedua dan ketiga tidak boleh dicampurkan ke dalam perapihan ini.
