# Template Website Lomba Talenta Prestasi

## Tentang Proyek

Proyek ini adalah **master template website penyelenggaraan lomba** yang dirancang agar dapat digunakan kembali untuk lomba-lomba berikutnya tanpa membangun tampilan dari awal.

Template menyediakan halaman informasi lomba yang lengkap, konsisten, dan responsif. Admin dapat mengubah identitas acara, warna tema, konten beranda, dokumen, pemenang, arsip, FAQ, serta informasi kontak melalui CMS tanpa mengubah struktur desain utama.

Tujuan akhirnya adalah menjadikan proyek ini sebagai fondasi sistem multi-event: satu template dapat melayani banyak lomba dengan konten dan identitas yang berbeda.

## Template adalah Acuan Utama

Folder [apps/template](file:///d:/Kuliah/Magang/Web1/apps/template) adalah **source of truth untuk website yang dilihat pengunjung**.

Jika ingin memeriksa tampilan final, responsivitas, struktur halaman, komponen, CSS, gambar, atau interaksi pengunjung, mulai dari folder ini. Admin bukan template tampilan publik; Admin hanya alat untuk mengelola data yang ditampilkan oleh Template. Pendaftaran dan akun peserta disediakan oleh website eksternal.

```text
Admin mengelola data
        │
        ▼
Repository dummy + localStorage
        │
        ▼
Template membaca dan menampilkan data

Pendaftaran peserta ditangani oleh website eksternal dan berada di luar scope repository ini.
```

## Struktur Proyek

```text
Web1/
├── apps/
│   ├── template/                       # ACUAN UTAMA website lomba
│   │   ├── index.html                  # Beranda
│   │   ├── unduh/index.html            # Dokumen dan materi lomba
│   │   ├── pemenang/index.html         # Daftar pemenang
│   │   ├── arsip/index.html            # Daftar lomba terdahulu
│   │   ├── arsip/detail/index.html     # Detail arsip/pemenang lama
│   │   ├── faq/index.html               # Pertanyaan umum
│   │   └── assets/
│   │       ├── css/main.css             # Design system dan seluruh style
│   │       ├── images/                  # Logo serta gambar template
│   │       └── js/                      # Runtime dan renderer publik
│   ├── admin/                          # CMS pengelola Template
│   │   ├── index.html                  # Shell/dashboard Admin
│   │   ├── editors/                    # Editor setiap halaman
│   │   └── js/
│   │       ├── config/                 # Registry route Admin
│   │       ├── shell/                  # Router, sidebar, save/reset
│   │       └── features/               # Logika editor per fitur
├── packages/
│   └── shared/                         # Kontrak lintas aplikasi
│       └── js/
│           ├── core/                   # Route resolver dan storage helper
│           └── data/                   # Dummy DB dan repositories
├── scripts/                            # Validator proyek
├── docs/                               # Dokumentasi teknis
├── package.json
├── PROGRESS.md                         # Riwayat perkembangan
└── README.md
```

## Batas Setiap Aplikasi

### 1. Template — Tampilan Murni/Acuan Utama

[apps/template](file:///d:/Kuliah/Magang/Web1/apps/template) berisi seluruh halaman yang dilihat pengunjung dan aset visual miliknya.

- `assets/css/main.css` adalah design system utama.
- `assets/images/` berisi gambar dan logo contoh.
- `assets/js/ui.js` menangani interaksi umum.
- `assets/js/runtime.js` menerapkan identitas, tema, navigasi, kontak, dan pengaturan global.
- renderer Beranda, Unduh, Pemenang, Arsip, Detail Arsip, dan FAQ membaca
  repository lalu membentuk tampilan publik dengan class Template asli.

Saat desain dipindahkan ke Laravel, Next.js, Django, atau backend lain, folder inilah yang menjadi referensi markup dan visual utama.

### 2. Admin — CMS Pengelola Template

[apps/admin](file:///d:/Kuliah/Magang/Web1/apps/admin) bukan website pengunjung. Admin menyediakan pengaturan identitas/tema, Beranda, Unduh, Pemenang, Arsip, FAQ, preview Template, serta tombol Reset dan Simpan perubahan.

Editor ditampilkan dalam iframe satu origin agar shell Admin dan editor dapat berkomunikasi dengan aman.

### 3. Shared — Kontrak Teknis Bersama

[packages/shared](file:///d:/Kuliah/Magang/Web1/packages/shared) tidak menyimpan aset visual Template. Folder ini hanya berisi kode yang memang dipakai lintas aplikasi: route resolver, helper storage, database dummy, dan repository data.

Repository tetap shared karena Admin menulis data dan Template membaca data yang sama.

### Tema Global

Pengaturan tema disimpan pada key `talenta_event_settings_v1` dengan schema versi 3.
Admin hanya menyediakan Warna Utama; putih menjadi pasangan kontras tetap melalui
`applyGlobalThemeTokens()`. Warna gelap/Navy, shade terang, shade gelap, warna
transparan, dan stop gradient diturunkan otomatis dari Warna Utama agar tidak
mempertahankan hue biru saat tema diganti. Template publik dan seluruh preview editor
Admin membaca keluarga token yang sama. Editor berlangganan event `talenta:settings`
dan `storage` agar perubahan tersimpan dapat diterapkan ulang tanpa mempertahankan
nilai tema lama.

Nilai `accentColor` lama selalu dinormalisasi menjadi putih (`#ffffff`) untuk
kompatibilitas schema. Badge jumlah pemenang memakai putih transparan pada latar tema
gelap dan tint Warna Utama pada latar putih. Teks peringkat mengikuti Warna Utama.

Seluruh section Beranda pada Template dan preview Admin dibangun oleh builder
markup bersama. Preview tidak memiliki versi markup atau skala desain tersendiri;
frame mensimulasikan viewport desktop, tablet, dan mobile. Jika kanvas lebih lebar
daripada panel Admin, `ResizeObserver` mengecilkan seluruh kanvas secara proporsional
dan menyesuaikan tinggi frame tanpa scrollbar. Paritas seluruh Beranda diperiksa
dengan `npm run test:home-parity`; `test:hero-parity` tetap tersedia sebagai alias.

Arsip menjadi pemilik data historis lomba beserta kategori, pemenang, dokumen, dan
SK. Halaman Unduh dan Pemenang hanya mengonsumsi data Arsip yang sudah dipublikasikan;
referensi detail selalu memakai ID milik lomba terkait. Penghapusan data bawaan
disimpan sebagai tombstone agar data yang telah dihapus tidak muncul kembali setelah
reload. Daftar Arsip dan Detail Arsip pada Template serta preview Admin memakai
builder markup bersama dan kanvas responsif berskala yang sama. Kontrak relasinya
diperiksa dengan `npm run test:archive-relations`, sedangkan paritas visual lintas
viewport diperiksa dengan `npm run test:theme-browser`.

FAQ memakai aggregate mandiri `Halaman → Kategori → Pertanyaan`. Repository menjaga
ID unik, owner kategori, urutan, status publik, sanitasi teks, dan atribut
aksesibilitas accordion. Template dan preview Admin memakai builder serta binder
accordion yang sama. Kontrak datanya diperiksa dengan `npm run test:faq-relations`
dan paritas visual/interaksinya termasuk dalam `npm run test:theme-browser`.

Perbedaan jumlah antarhalaman mengikuti fungsi datanya: Arsip berisi seluruh lomba
terdahulu yang published, Unduh berisi subset lomba aktif/Arsip yang dipilih sebagai
sumber dokumen, sedangkan Pemenang Sebelumnya hanya memakai Arsip yang memiliki
pemenang aktif. Batas kartu Pemenang otomatis mengikuti jumlah sumber valid dan tidak
dapat dinaikkan melewatinya. Identitas Arsip dapat memakai logo/maskot unggahan
dengan ikon library sebagai fallback.

Seluruh Reset, Hapus, dan Unlink di Admin memakai dialog UI bersama, bukan popup
native browser. Dialog tampil pada level shell meskipun dipicu dari editor iframe,
mendukung keyboard/mobile, dan diaudit dengan `npm run test:admin-dialogs` serta
`npm run test:theme-browser`.

## Menjalankan Proyek

Jalankan dari root proyek:

```bash
npm run dev
```

| Aplikasi       | URL lokal                              |
| -------------- | -------------------------------------- |
| Template utama | `http://localhost:4173/apps/template/` |
| Admin CMS      | `http://localhost:4173/apps/admin/`    |

Jangan membuka file menggunakan `file://`. Directory routing, iframe Admin, dan localStorage dirancang berjalan melalui satu HTTP origin.

## Canonical Routes

```text
Template
/apps/template/
/apps/template/unduh/
/apps/template/pemenang/
/apps/template/arsip/
/apps/template/arsip/detail/?id=...
/apps/template/faq/

Admin
/apps/admin/?page=settings
/apps/admin/?page=home
/apps/admin/?page=download
/apps/admin/?page=winners
/apps/admin/?page=archive
/apps/admin/?page=faq

```

Route dinamis tidak boleh dibuat dengan string filename `.html`. Gunakan `TalentaPaths.to()` dari [paths.js](file:///d:/Kuliah/Magang/Web1/packages/shared/js/core/paths.js) agar URL tetap benar pada domain utama maupun subpath hosting.

## Alur Penggunaan

1. Jalankan `npm run dev`.
2. Buka Admin dan pilih halaman yang dikelola.
3. Ubah data melalui form editor.
4. Tekan **Simpan perubahan**.
5. Tekan **Lihat Halaman** untuk memeriksa Template.
6. Template membaca data tersimpan pada origin yang sama.

## Status Database

Proyek masih menggunakan database dummy JavaScript, repository JavaScript, dan `localStorage`. Ini merupakan demonstrasi frontend, bukan database produksi.

Pemisahan repository memungkinkan sumber data diganti menjadi REST API/backend tanpa menulis ulang UI. Key penyimpanan yang sudah ada harus dipertahankan ketika refactor agar data Admin lama tidak hilang.

Rancangan target multi-tenant, ERD, aturan foreign key, kontrak API, keamanan
data, serta tahap migrasinya tersedia di
[`docs/DATABASE_DESIGN.md`](docs/DATABASE_DESIGN.md).

## Menggunakan Template untuk Lomba Berikutnya

Target implementasi selanjutnya:

1. buat record event baru pada backend/CMS;
2. tentukan nama, slug/subdomain, logo, dan warna tema;
3. isi jadwal, biaya, benefit, dokumen, pemenang, FAQ, dan kontak;
4. backend mengirim data event melalui repository/API;
5. Template yang sama merender identitas dan konten event tersebut.

```text
osn2026.talentaprestasi.id        ─┐
matematika2027.talentaprestasi.id  ├─ memakai Template yang sama
sains2027.talentaprestasi.id      ─┘
```

Yang berbeda adalah data event, bukan struktur desainnya.

## Aturan Pengembangan

1. Perlakukan `apps/template/` sebagai acuan visual utama.
2. Jangan mencampurkan script editor Admin ke dalam Template.
3. Jangan menyimpan aset khusus Template di Admin atau `packages/shared`.
4. Masukkan kode ke `packages/shared` hanya jika benar-benar digunakan lintas aplikasi.
5. Gunakan canonical directory routes, bukan internal link `*.html`.
6. Jangan mengganti key localStorage tanpa migrasi.
7. Catat perubahan penting pada `PROGRESS.md`.
8. Jalankan validasi sebelum commit.

## Validasi

```bash
npm run check
```

Audit browser khusus keseragaman tema dapat dijalankan setelah tersedia Microsoft
Edge/Chromium:

```bash
npm run test:theme-browser
```

Audit tersebut membuka enam halaman Template dan enam preview Admin menggunakan
profil browser sementara, lalu memeriksa token warna efektif serta pengecualian warna
peringkat pada Detail Arsip.

Jangan menambahkan redirect HTML ke root atau internal link berbentuk `*.html`. Route baru wajib berupa direktori dengan `index.html` dan didaftarkan pada `packages/shared/js/core/paths.js`.
