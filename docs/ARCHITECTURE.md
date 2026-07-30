# Arsitektur Frontend Talenta Prestasi

## Tujuan Arsitektur

Proyek merupakan workspace Vanilla HTML/CSS/JavaScript untuk **master template website lomba**. Batas aplikasi dibuat eksplisit agar Template dapat dijadikan acuan desain dan Admin dapat berkembang sebagai CMS tanpa mencampurkan tanggung jawab. Pendaftaran peserta berada pada website eksternal.

## Batas Aplikasi

```text
apps/admin ──────┐
                 ├──> packages/shared (route, storage, data contracts)
apps/template ───┘

apps/admin ─────────> apps/template/assets (design system untuk preview)
```

- `apps/template/` adalah source of truth tampilan pengunjung.
- `apps/admin/` adalah CMS dan editor, bukan bagian Template publik.
- `packages/shared/` hanya berisi kontrak teknis lintas aplikasi.

## Ownership

### Template

`apps/template/` memiliki:

- seluruh halaman publik;
- `assets/css/main.css` sebagai design system;
- `assets/images/` sebagai aset visual;
- `assets/js/` sebagai runtime dan renderer publik.

Kode Admin tidak boleh ditempatkan di Template. Admin boleh menggunakan design system Template untuk menjaga preview/paritas visual, tetapi tidak boleh mengimpor runtime bisnis Template tanpa alasan eksplisit.

### Admin

`apps/admin/` memiliki shell, router, navigasi bagian, editor iframe, serta feature manager. Admin boleh membaca/menulis repository shared dan membuka canonical route Template.

### Shared

`packages/shared/` memiliki:

- `js/core/paths.js` — canonical route resolver;
- `js/core/storage.js` — helper storage;
- `js/data/` — baseline database dummy;
- `js/data/repositories/` — kontrak baca/tulis state efektif.

Shared tidak boleh mengimpor aplikasi mana pun.

## Dependency Direction

```text
HTML entry
  → route/storage core
  → mock data
  → repositories
  → Template renderer atau Admin feature
```

Feature bukan sumber data permanen. Repository localStorage nantinya dapat diganti HTTP adapter tanpa menulis ulang form atau renderer.

## Storage Contracts

| Domain            | Key localStorage             |
| ----------------- | ---------------------------- |
| Pengaturan Global | `talenta_event_settings_v1`  |
| Arsip             | `talenta_archive_manager_v2` |
| FAQ               | `talenta_faq_manager_v1`     |
| Unduh             | `talenta_download_editor_v2` |
| Pemenang          | `talenta_winner_manager_v1`  |
| Tampilan Pemenang | `talenta_winner_page_v1`     |

Key tidak boleh diganti tanpa migrasi schema eksplisit.

### Kontrak Aggregate FAQ

FAQ disimpan sebagai aggregate mandiri tanpa relasi lomba:

```text
FaqPage
└── Category (owner)
    └── Question (categoryId -> Category.id)
```

ID kategori dan pertanyaan unik pada satu halaman. Urutan array adalah urutan tampil.
Status nonaktif tidak menghapus record; resolver publik menyaring kategori,
pertanyaan nonaktif, serta pertanyaan dengan teks/jawaban kosong. Backend nantinya
wajib mempertahankan owner kategori, unique ID per halaman, posisi terurut, dan
validasi status tanpa menjadikan FAQ bergantung pada Arsip.

Template dan preview Admin tidak menyusun HTML FAQ sendiri-sendiri. Keduanya memakai
builder markup dan binder accordion dari `faq-repository.js`; preview hanya
mensimulasikan viewport publik dengan kanvas berskala.

### Shared Admin Dialog

`apps/admin/js/shared/dialog.js` adalah satu-satunya jalur konfirmasi action Admin.
Feature memanggil Promise `adminConfirm(options)` dan baru melakukan mutasi ketika
hasilnya `true`. Editor iframe meneruskan pemanggilan ke `window.parent.adminConfirm`
pada shell satu-origin; mode standalone membuat `<dialog>` lokal.

Kontrak ini memisahkan keputusan pengguna dari mutasi repository, menghapus
ketergantungan pada dialog native browser, dan membuat Reset/Hapus/Unlink dapat diuji
secara deterministik.

### Kontrak Owner Arsip dan Detail Arsip

```text
Competition
  ├─ WinnerCategory[]
  │    └─ Winner[]
  ├─ Document[]
  ├─ SkDocument.documentId -> Competition.documents[].id
  └─ DetailConfig
       ├─ hiddenCategoryIds[] -> Competition.winnerCategories[].id
       ├─ hiddenDocumentIds[] -> Competition.documents[].id
       └─ documentLabelOverrides.{documentId}
            -> Competition.documents[].id
```

- Arsip adalah owner data historis. Unduh dan halaman Pemenang hanya menjadi
  consumer; keduanya tidak menggandakan lomba, dokumen, kategori, atau pemenang
  historis.
- `Competition.id` dan `Document.id` unik secara global. `WinnerCategory.id` unik
  dalam satu lomba dan `Winner.id` unik pada seluruh kategori lomba yang sama.
- Semua referensi Detail divalidasi terhadap owner lombanya. Referensi asing,
  kosong, dan duplikat dibuang oleh `normalizeArchiveCompetition()`.
- Penghapusan baseline direpresentasikan oleh tombstone
  `removedCompetitionIds`. Resolver efektif harus menerapkan tombstone sebelum
  override dan sebelum data diteruskan ke Unduh/Pemenang.
- Resolver publik hanya menerima status `published`, `active !== false`, dan
  `detail.active !== false`. Draft/disabled tetap dapat disimpan di Admin.
- Identitas visual Arsip menggunakan ikon library sebagai fallback. Jika
  `iconMode=upload`, `uploadedIcon` menjadi logo/maskot utama pada editor, daftar
  Arsip, dan kartu riwayat Pemenang.
- Backend harus menerapkan foreign key, unique constraint, transaksi penghapusan,
  dan kebijakan `ON DELETE` yang setara. Untuk soft delete, tombstone frontend dapat
  dipetakan menjadi `deleted_at`.

### Kontrak Relasi Unduh dan Arsip

```text
DownloadCompetition.competitionId
  -> Competition.id

DownloadCompetition.hiddenDocumentIds[]
DownloadCompetition.documentLabelOverrides.{documentId}
  -> Competition.documents[].id pada competitionId yang sama
```

Sumber Unduh adalah gabungan lomba aktif sekarang dan Arsip publik. State Unduh
menyimpan subset yang dipilih Admin; karena itu jumlah tab Unduh tidak wajib sama
dengan jumlah kartu Arsip.

- `Competition.id` dan `Document.id` harus unik; konfigurasi Unduh juga menolak
  `competitionId` ganda.
- Unduh tidak memiliki atau menggandakan metadata file. Arsip tetap menjadi owner
  nama asli, kategori, tipe, ukuran, URL, ikon, dan status dokumen.
- Melepas relasi Unduh tidak menghapus lomba/dokumen Arsip.
- Lomba Arsip nonaktif, tidak published, atau Detail Arsip nonaktif disaring pada
  resolver publik. Konfigurasinya dipertahankan agar dapat pulih ketika sumber
  diterbitkan kembali.
- Adapter backend kelak harus mempertahankan aturan foreign key dan validasi
  kepemilikan dokumen yang sama; repository localStorage saat ini adalah adapter
  dummy untuk kontrak tersebut.

### Kontrak Relasi Pemenang, Arsip, dan Beranda

```text
WinnerManager.competitionId
  -> Competition.id berstatus active

WinnerCategory
  -> dimiliki WinnerManager

Winner
  -> dimiliki WinnerCategory

WinnerPage archive cards
  -> Competition.id berstatus published dan publik

Home winner highlight
  -> resolvePublicWinnerState().manager
```

- `WinnerCategory.id` unik dalam satu lomba. `Winner.id` unik dalam seluruh
  WinnerManager lomba aktif agar update, reorder, toggle, dan delete tidak ambigu.
- State dengan `competitionId` berbeda dianggap milik lomba lain dan tidak
  digabungkan ke lomba aktif.
- `normalizeWinnerManagerState()` dan `normalizeWinnerPageState()` menjadi batas
  sanitasi sebelum read/save. `resolvePublicWinnerState()` adalah batas publikasi
  bersama untuk halaman Pemenang dan Highlight Beranda.
- Kartu riwayat hanya mengambil Arsip published/aktif dengan Detail aktif dan
  minimal satu pemenang aktif. Perubahan status Arsip langsung memengaruhi daftar
  publik tanpa menggandakan data.
- SK lomba aktif adalah subresource satu-ke-satu milik WinnerManager saat ini.
  Backend dapat memindahkannya ke tabel/file service tersendiri tanpa mengubah
  relasi kategori dan pemenang.

### Kontrak Tema Global

- Key Pengaturan Global tetap `talenta_event_settings_v1`; versi schema aktif adalah
  versi 3.
- Default Warna Utama adalah `#1e4b8c`; putih (`#ffffff`) menjadi pasangan kontras
  tetap dan bukan input Admin. Navy bukan input terpisah; nilainya diturunkan dari
  Warna Utama dengan mencampurkan 55% hitam, sehingga hue tema tetap konsisten.
- Data schema lama dinormalisasi oleh `settings-repository.js`; seluruh nilai
  `accentColor` lama menjadi putih agar kontrak hanya memadukan Warna Utama dan putih.
- `applyGlobalThemeTokens(target, settings)` adalah satu-satunya jalur penerapan
  `--c-primary`, `--c-primary-dark`, `--c-primary-light`, `--c-navy`, token RGB
  transparan, `--c-accent`, `--c-gold`, serta padanan token preview.
- `--c-rank` mengikuti Warna Utama. Badge jumlah memakai putih transparan di latar
  gelap dan tint Warna Utama di latar putih.
- Template dan preview Admin berlangganan `talenta:settings` serta event `storage`.
  Karena itu, HTML editor wajib memuat `settings-repository.js` sebelum feature
  editornya.
- Hero Beranda menggunakan `buildHomeHeroMarkup()` dari `home-repository.js` pada
  Template dan preview Admin. Class, urutan elemen, badge, serta tombol tidak boleh
  dibuat ulang di editor; frame preview hanya boleh mensimulasikan breakpoint.
- Halaman Unduh menggunakan `buildDownloadMarkup()` dan
  `resolveDownloadPublicState()` dari `download-repository.js` pada Template dan
  preview Admin. Editor tidak boleh membangun ulang kartu dokumen dengan class
  preview khusus.
- Halaman Pemenang menggunakan `buildWinnerPageMarkup()` dan
  `resolvePublicWinnerState()` dari `winner-repository.js`. Highlight Beranda wajib
  membaca resolver yang sama; renderer/editor tidak boleh mem-parsing key Pemenang
  secara mandiri ketika repository tersedia.
- Daftar Arsip menggunakan `buildArchiveListMarkup()`. Detail Arsip menggunakan
  `resolveArchiveDetailState()` dan `buildArchiveDetailMarkup()`. Template dan
  Preview Admin tidak boleh membangun ulang banner, breadcrumb, SK, kartu pemenang,
  atau kartu dokumen secara terpisah.

## Routing Contract

Root workspace memiliki nol file HTML. Semua halaman memakai directory-index routing. Internal navigation tidak boleh merujuk filename `.html`.

Canonical route didefinisikan di `packages/shared/js/core/paths.js`. Resolver mendeteksi base path sehingga aplikasi dapat berjalan pada domain root atau subpath repository.

Entry utama:

| Area     | Canonical entry   |
| -------- | ----------------- |
| Template | `/apps/template/` |
| Admin    | `/apps/admin/`    |

### Menambah Route

1. Buat `<app>/<route>/index.html`.
2. Daftarkan route ID pada `TalentaPaths`.
3. Untuk Admin, tambahkan metadata pada `apps/admin/js/config/routes.js`.
4. Gunakan `TalentaPaths.to()` untuk URL dinamis, query, dan hash.
5. Tambahkan route ke validator.
6. Jalankan `npm run check`.

## Menambah Fitur

1. Tentukan pemilik fitur: Template, Admin, atau shared contract.
2. Tempatkan renderer publik di `apps/template/assets/js/`.
3. Tempatkan editor di `apps/admin/js/features/<domain>/`.
4. Tambahkan repository shared hanya jika data dipakai lintas halaman/aplikasi.
5. Pertahankan semantic HTML, ID unik, dan preview responsif.
6. Jangan menduplikasi database state ke dalam aplikasi.
7. Catat perubahan di `PROGRESS.md`.

## Migrasi ke Backend

Backend mendatang mempertahankan bentuk data repository dan menyediakan operasi list/find/save/remove. Repository localStorage diganti HTTP adapter. Autentikasi, otorisasi, upload file, validasi final, dan tenant resolution dilakukan server.

Template tetap menjadi acuan markup/visual. Setiap event menyediakan data identitas, tema, konten, dan slug/subdomain yang berbeda, sedangkan struktur Template digunakan kembali.

Model relasional produksi, ERD, constraint lintas owner, alur publikasi, kontrak
API, serta urutan implementasi dijabarkan pada
[`DATABASE_DESIGN.md`](DATABASE_DESIGN.md).

## Menjalankan dan Memvalidasi

Gunakan static HTTP server dari root:

```bash
npm run dev
npm run check
npm run test:theme-browser
```

Jangan menjalankan melalui `file://`. Static host harus mendukung directory index dan menayangkan seluruh workspace pada satu origin agar iframe Admin dan localStorage bekerja konsisten.
