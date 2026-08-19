# Pengujian Talenta Prestasi

## Gate Otomatis

Dari root repository:

```bash
npm run check:routes
npm run check:js
npm run check:theme
npm run test:category-events
npm run test:event-publication
npm run test:download-relations
npm run test:winner-relations
npm run test:archive-relations
npm run test:faq-relations
npm run test:admin-dialogs
npm run test:home-parity
npm run test:theme-browser
```

Dari `apps/backend`:

```bash
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

E2E memerlukan PostgreSQL writable dengan schema migration terbaru. Test membuat dan menghapus record uji; jangan arahkan ke database berisi data penting. Receipt aktual berada di `PROGRESS.md`.

## Persiapan Manual

- Jalankan migration dan seed sesuai `docs/OPERATIONS.md`.
- Hidupkan PostgreSQL, backend, frontend, dan gateway.
- Siapkan gambar valid di bawah 5 MB, PDF di bawah 10 MB, dan file negatif (terlalu besar/signature palsu).
- Pantau Console dan Network tanpa mencatat credential/JWT.

## Auth dan Sesi

- Login dengan akun seed; password/JWT tidak muncul di URL/log.
- Daftar kategori tampil sesuai membership.
- Pilih kategori lalu Event; refresh mempertahankan konteks sesi.
- Logout membersihkan JWT dan pilihan.
- Endpoint tanpa JWT merespons `401`; tenant lain mendapat `403`.

## Kategori dan Subdomain

- Buat kategori dengan nama dan slug lowercase yang valid.
- Slug invalid/duplikat ditolak.
- Editor/viewer tidak dapat melakukan tindakan administratif owner/admin.
- Publikasikan kategori; hostname dibuat pada kategori dan bootstrap publik tersedia jika ada Event aktif.
- Nonaktifkan kategori; route publik menjadi `404` tanpa menghapus konten Event.
- Hapus kategori uji melalui dialog konfirmasi.

## Event/Periode

- Nama ajang pada form read-only mengikuti Kategori; tahun default tahun berjalan.
- Field batch tersembunyi sampai opsi beberapa penyelenggaraan diaktifkan; nomor dihitung server.
- Buat Event tahun unik, lalu coba tahun sama: batal konfirmasi tidak mengubah data; setuju mengubah existing menjadi Gelombang 1 dan membuat Gelombang 2.
- Sebelum Gelombang 2 diaktifkan, nama publik Event existing tetap tanpa suffix.
- Publikasikan dan aktifkan Gelombang 2; hanya Gelombang 2 aktif dan existing tampil sebagai arsip Gelombang 1.
- Event nonaktif yang belum pernah aktif tampil sebagai Persiapan dan tidak bocor ke arsip publik.
- Uji dashboard dengan 1, 2, 5, dan 10 Event; badge harus sesuai backend.
- Hapus Event uji; Event hilang tanpa mendaur ulang nomor batch.

## Draf, Preview, dan Publikasi Event

- Ubah form tanpa simpan lalu tekan **Urungkan edit**; modul kembali ke workspace tersimpan, bukan template bawaan, dan database tidak berubah.
- Edit Event aktif lalu simpan draf; Public API biasa harus tetap mengembalikan snapshot lama.
- Buka **Lihat preview**; workspace terbaru tampil pada Public Site asli dan fragment token segera hilang dari address bar.
- Kategori unpublished dan Event nonaktif hanya dapat dipreview dengan token yang sesuai; request biasa menghasilkan `404`.
- Token kedaluwarsa, purpose salah, tenant lain, dan Event soft-deleted ditolak tanpa fallback ke versi publik.
- Publikasikan perubahan; seluruh modul berpindah ke satu versi snapshot secara atomik.
- Batalkan draf; workspace kembali ke snapshot terakhir tanpa mengubah website publik.
- Event tanpa snapshot tidak dapat diaktifkan pada kategori published.
- Media draf tidak dapat dibaca hanya dengan UUID; media snapshot dan media preview Event yang sesuai dapat dibaca.
- Publish atau batalkan draf memakai checksum status terbaru; perubahan aggregate oleh Admin lain menghasilkan `409`.
- Simpan editor lintas Admin masih last-write-wins pada initial scope; revision workspace seragam harus ditambahkan sebelum kolaborasi multi-Admin aktif.

## Pengaturan dan Beranda

- Ubah warna, navigasi, kontak, footer, SEO, nama/deskripsi Event; simpan draf dan refresh.
- Pastikan perubahan hanya memengaruhi workspace Event terpilih.
- Ubah Hero/section Beranda dan cocokkan preview dengan Public Site pada 1440px, 768px, dan 390px.
- Viewer tidak dapat menyimpan/publish perubahan; editor dapat menyimpan draf, preview, dan publish.

## Logo dan Favicon Event

### Unit dan kontrak otomatis

- Settings GET mengembalikan `logoAssetId` serta `navbarLogoSize`; settings PUT menulis, mengganti, dan menghapus logo Event tanpa memakai `mascot_asset_id` atau logo Kategori.
- `logoAssetId` hanya menerima UUID asset PNG/JPEG/WebP aktif milik Organization Event; PDF, SVG, asset nonaktif, serta asset tenant lain ditolak.
- `navbarLogoSize` menerima 24 sampai 44 dan menolak 23 atau 45; settings/snapshot lama tanpa ukuran memakai 36.
- Restore snapshot lama tanpa key `logo_asset_id` mempertahankan logo existing; snapshot baru dengan nilai `null` menghapus logo.
- Public bootstrap mengambil `event_sites.logo_asset_id`; publish memasukkan UUID logo ke allowlist media snapshot.
- Audit frontend mencakup copy upload 1:1/transparan dan batas 5 MB, Blob/Object URL Admin, larangan Object URL di `localStorage`, favicon dinamis, `object-fit: contain`, serta satu ukuran desktop/tablet/mobile.

### Keamanan

- `GET /api/v1/admin/events/:eventId/media/:assetId` mengembalikan binary hanya dengan JWT dan membership tenant/Event yang sesuai.
- Endpoint Admin tanpa JWT menghasilkan `401`; akses dari Organization lain ditolak tanpa binary atau enumerasi tenant.
- URL public asset draf tanpa token preview dan tanpa allowlist snapshot menghasilkan `404`.
- Token preview Event yang sah dapat membaca logo workspace; website published hanya dapat membaca asset pada allowlist snapshot.
- PDF/SVG sebagai `logoAssetId` dan ukuran 23/45 ditolak `400`.

### Browser dan acceptance

- Dalam satu Kategori, buat dua Event dengan logo dan ukuran berbeda; berpindah Event serta reload tidak boleh membocorkan state logo/ukuran.
- Upload PNG transparan maksimal 5 MB. Preview Admin harus memakai URL `blob:` dari endpoint Admin `200`, bukan URL public yang `404`; reload settings harus mengambil Blob lagi dan menampilkan logo yang sama. Ganti logo lalu reload; Object URL lama harus dicabut dan Blob baru dimuat tanpa menyimpan URL `blob:` ke `localStorage`.
- Atur slider ke 24, 36, dan 44. Satu nilai harus diterapkan pada preview desktop, tablet, dan mobile.
- Hapus logo lalu **Urungkan edit**; logo workspace tersimpan harus kembali. Hapus, **Simpan draf**, buka **Lihat preview**, lalu **Batalkan draf**; logo dan ukuran harus kembali ke snapshot published terakhir.
- **Lihat preview** harus menampilkan logo draf dan favicon dari asset yang sama. Website published tetap memakai logo/favicon lama sebelum publish; setelah publish navbar dan favicon memakai logo baru.
- Pada viewport 1440×900, 768×1024, dan 390×844, pastikan ukuran logo tidak melebihi tinggi header dikurangi 8 piksel, `object-fit: contain`, background transparan, radius 0, dan tidak ada overflow horizontal. Fallback tanpa logo mempertahankan background serta radius existing.

## FAQ

- Tambah kategori/pertanyaan, ubah urutan, simpan, dan refresh.
- Nonaktifkan item; Public Site tidak menampilkannya.
- Accordion berfungsi dengan pointer dan keyboard.
- Hapus item melalui dialog konfirmasi.

## Dokumen dan Unduh

- Tambah Event Document dan tab Unduh.
- Hanya satu tab default diizinkan.
- Dokumen Event lain dalam Kategori Lomba yang sama dapat direferensikan dan tetap memakai record sumber tanpa duplikasi.
- Dokumen dari kategori atau tenant lain tidak dapat direferensikan.
- Sembunyikan dokumen; record sumber tetap ada.
- PDF menggunakan `/api/v1/public/media/<asset-id>` dengan MIME dan header keamanan benar.

## Pemenang dan SK

- Tambah kategori pemenang dan pemenang lengkap; simpan/refresh.
- Nonaktifkan kategori/pemenang; data hilang dari Public Site.
- Upload foto dan PDF SK valid.
- SK direferensikan sebagai Event Document dan dapat muncul di Unduh tanpa file duplikat.
- Pemenang Sebelumnya hanya berasal dari Event arsip dalam kategori yang sama.
- Kartu Event Arsip pada Pemenang memakai ikon pustaka atau maskot upload yang sama dengan kartu halaman Arsip pada preview Admin, Lihat preview, dan Public Site.
- Nama presentasi Arsip yang disimpan digunakan verbatim pada kartu Pemenang Sebelumnya.

## Arsip Otomatis

- Siapkan satu Event aktif dan satu Event nonaktif pada kategori yang sama.
- `/public/sites/:categorySlug/archives` mengembalikan Event nonaktif.
- `/public/sites/:categorySlug/archives/:eventSlug` menampilkan detail Event arsip.
- URL browser Detail Arsip memakai `?event=...`, bukan `?id=` atau Competition slug.
- Ubah visibilitas kategori/dokumen pada Detail Arsip; simpan dan refresh.
- Tanpa nama custom, field Nama lomba, kartu, banner, dan breadcrumb memakai nama Event beserta tahun/batch sebagai default.
- Edit Nama lomba lalu hapus tahunnya; preview Admin langsung mengikuti nilai tersebut. **Lihat halaman** pada editor Detail Arsip memakai token Event Arsip sehingga menampilkan workspace draf tanpa menambahkan tahun kembali. Public Site tanpa token tetap memakai snapshot lama sampai Event Arsip dipublikasikan, lalu memakai nama baru.
- Nama presentasi Arsip tidak mengubah nama canonical Event pada Beranda, Unduh, atau Pemenang aktif.
- Event dari kategori lain tidak masuk list arsip.

## Media

- Upload gambar/PDF melalui `/admin/events/:eventId/media`.
- Viewer mendapat `403`; editor/owner/admin yang sesuai dapat upload.
- MIME, ukuran, dan signature palsu ditolak.
- URL publik hanya mengekspos UUID asset, bukan storage key/path.

## Persistensi dan Keamanan

- Setelah setiap perubahan, refresh Admin/Public Site dan login ulang untuk membuktikan PostgreSQL sebagai sumber data.
- Field DTO asing ditolak.
- Hanya satu Event aktif per kategori dapat dibuat, termasuk pada akses bersamaan/SQL langsung.
- Event suspended tidak dipilih resolver publik.
- UI/API tidak membocorkan password/hash, JWT, credential database, atau path filesystem.

## Responsivitas dan Aksesibilitas

Uji seluruh halaman Public Site serta editor Admin pada 1440px, 768px, dan 390px:

- tidak ada overlap atau horizontal scroll tidak sengaja;
- form, card, preview, header, dan navigasi dapat digunakan;
- fokus keyboard terlihat dan urutan Tab logis;
- dialog dapat digunakan dengan Enter, Space, dan Escape;
- preview Admin mempertahankan tema/markup Public Site.

## Gateway

Verifikasi `/`, `/unduh/`, `/pemenang/`, `/arsip/`, `/arsip/detail/`, dan `/faq/`. Gateway harus meneruskan `/api/`, tetapi mengembalikan `404` untuk `/apps/admin/`, `/README.md`, dan file repository lain.

## Format Laporan Bug

```markdown
### [Modul] Ringkasan masalah

- Route/modul:
- URL:
- Prasyarat/data uji:
- Langkah reproduksi:
- Hasil yang diharapkan:
- Hasil aktual:
- Status HTTP/endpoint:
- Evidence:
- Browser/OS/viewport:
- Severity:
```

Jangan mengubah failure menjadi lulus tanpa evidence.
